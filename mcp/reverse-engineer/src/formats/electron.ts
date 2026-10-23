import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { exists } from "../core/cache";
import { parsePe, peResources } from "./pe";

/** Sentinel that precedes the fuse wire in Electron binaries. */
export const FUSE_SENTINEL = "dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX";

/** FuseV1 order, as documented by @electron/fuses. */
export const FUSE_V1_NAMES = [
  "RunAsNode",
  "EnableCookieEncryption",
  "EnableNodeOptionsEnvironmentVariable",
  "EnableNodeCliInspectArguments",
  "EnableEmbeddedAsarIntegrityValidation",
  "OnlyLoadAppFromAsar",
  "LoadBrowserProcessSpecificV8Snapshot",
  "GrantFileProtocolExtraPrivileges",
  "WasmTrapHandlers",
];

export interface ElectronLayout {
  asar?: string;
  appDir?: string;
  binaries: string[];
  infoPlist?: string;
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Accepts an app directory, a resources directory, an executable or an archive. */
export async function locateElectron(input: string): Promise<ElectronLayout> {
  let asar: string | undefined;
  let appDir: string | undefined;
  if (await isFile(input)) {
    if (extname(input).toLowerCase() === ".asar") {
      asar = input;
      const resources = dirname(input);
      appDir = basename(resources).toLowerCase() === "resources" ? dirname(resources) : undefined;
    } else {
      appDir = dirname(input);
    }
  } else {
    appDir = input;
  }
  // A resources directory (Windows, Linux, macOS Contents/Resources) or a macOS Contents/MacOS executable:
  // the binaries and the archive are found from the parent.
  if (!asar && appDir && /^(resources|macos)$/i.test(basename(appDir))) appDir = dirname(appDir);
  if (!asar && appDir) {
    for (const candidate of [
      join(appDir, "resources", "app.asar"),
      join(appDir, "Contents", "Resources", "app.asar"),
      join(appDir, "Resources", "app.asar"),
      join(appDir, "app.asar"),
    ]) {
      if (await isFile(candidate)) {
        asar = candidate;
        break;
      }
    }
  }
  const binaries: string[] = [];
  let infoPlist: string | undefined;
  if (appDir) {
    // macOS bundle: Contents/Resources -> Contents.
    const contents = basename(appDir) === "Contents" ? appDir : join(appDir, "Contents");
    if (await exists(join(contents, "Info.plist"))) {
      infoPlist = join(contents, "Info.plist");
      const framework = join(contents, "Frameworks", "Electron Framework.framework", "Electron Framework");
      if (await isFile(framework)) binaries.push(framework);
    } else {
      let names: string[] = [];
      try {
        names = await readdir(appDir);
      } catch {
        names = [];
      }
      for (const name of names) {
        const path = join(appDir, name);
        const ext = extname(name).toLowerCase();
        if (/uninstall|update|crashpad|squirrel/i.test(name)) continue;
        if (ext === ".exe" || (ext === "" && (await isFile(path)))) {
          if ((await stat(path)).size > 20 * 1024 * 1024) binaries.push(path);
        }
      }
    }
  }
  return { asar, appDir, binaries, infoPlist };
}

export interface FuseWire {
  binary: string;
  offset: number;
  version: number;
  fuses: { name: string; state: string }[];
}

/** Finds the fuse wire in the first binary that contains the sentinel. */
export async function readFuses(binaries: string[]): Promise<FuseWire | undefined> {
  const sentinel = Buffer.from(FUSE_SENTINEL, "latin1");
  for (const binary of binaries) {
    const data = await readFile(binary);
    const at = data.indexOf(sentinel);
    if (at < 0) continue;
    const wire = at + sentinel.length;
    const version = data[wire] ?? 0;
    const length = data[wire + 1] ?? 0;
    const fuses: { name: string; state: string }[] = [];
    for (let i = 0; i < length; i++) {
      const raw = data[wire + 2 + i];
      const state =
        raw === 0x31 ? "on" : raw === 0x30 ? "off" : raw === 0x72 ? "removed" : `0x${(raw ?? 0).toString(16)}`;
      const name = version === 1 ? (FUSE_V1_NAMES[i] ?? `fuse${i}`) : `fuse${i}`;
      fuses.push({ name, state });
    }
    return { binary, offset: at, version, fuses };
  }
  return undefined;
}

export interface DeclaredIntegrity {
  source: string;
  file: string;
  algorithm: string;
  hash: string;
}

/**
 * Reads the asar header hash that Electron checks at startup: the
 * INTEGRITY/ELECTRONASAR resource on Windows, ElectronAsarIntegrity in
 * Info.plist on macOS.
 */
export async function readDeclaredIntegrity(layout: ElectronLayout): Promise<DeclaredIntegrity[]> {
  const out: DeclaredIntegrity[] = [];
  if (layout.infoPlist) {
    const plist = await readFile(layout.infoPlist, "utf8");
    const block = /<key>ElectronAsarIntegrity<\/key>\s*<dict>([\s\S]*?)<\/dict>\s*<\/dict>/.exec(plist)?.[1];
    if (block) {
      for (const m of block.matchAll(
        /<key>([^<]+)<\/key>\s*<dict>[\s\S]*?<key>algorithm<\/key>\s*<string>([^<]+)<\/string>[\s\S]*?<key>hash<\/key>\s*<string>([^<]+)<\/string>/g,
      )) {
        out.push({ source: "Info.plist", file: m[1] ?? "", algorithm: m[2] ?? "", hash: m[3] ?? "" });
      }
    }
  }
  for (const binary of layout.binaries) {
    if (extname(binary).toLowerCase() !== ".exe") continue;
    const data = await readFile(binary);
    const image = parsePe(data);
    if (!image) continue;
    for (const res of peResources(data, image)) {
      if (res.type !== "INTEGRITY" || res.name !== "ELECTRONASAR") continue;
      try {
        const parsed = JSON.parse(data.subarray(res.offset, res.offset + res.size).toString("utf8")) as {
          file?: string;
          alg?: string;
          value?: string;
        }[];
        for (const item of parsed) {
          out.push({
            source: `${basename(binary)} resource INTEGRITY/ELECTRONASAR`,
            file: item.file ?? "",
            algorithm: item.alg ?? "",
            hash: (item.value ?? "").toLowerCase(),
          });
        }
      } catch {
        // A malformed resource is reported as absent.
      }
    }
  }
  return out;
}
