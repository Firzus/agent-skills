import { readFile } from "node:fs/promises";
import { basename, extname, join, posix } from "node:path";
import * as z from "zod";
import { exists } from "../core/cache";
import { formatSize, lineLocator, walk } from "../core/files";
import { type AsarExtraction, extractAsar } from "../formats/asar";
import { type ElectronLayout, locateElectron, readDeclaredIntegrity, readFuses } from "../formats/electron";
import { identify } from "../formats/magic";
import { defineTool } from "./types";

interface JsFile {
  rel: string;
  text: string;
  side: "main" | "preload" | "renderer";
  locate?: (offset: number) => { line: number; col: number };
}

function at(file: JsFile, offset: number): string {
  file.locate ??= lineLocator(file.text);
  const { line, col } = file.locate(offset);
  return `${file.rel}:${line}:${col}`;
}

/** Resolves package.json "main" the way Node does for a directory or extension-less path. */
async function resolveMain(root: string, main: string): Promise<string | undefined> {
  const base = posix.normalize(main.replace(/\\/g, "/")).replace(/^\.\//, "");
  for (const candidate of [base, `${base}.js`, `${base}/index.js`, `${base}.cjs`, `${base}.mjs`]) {
    if (await exists(join(root, ...candidate.split("/")))) {
      if (!candidate.endsWith("/") && extname(candidate)) return candidate;
    }
  }
  return undefined;
}

const SCHEMES = new Set([
  "http",
  "https",
  "file",
  "data",
  "blob",
  "mailto",
  "node",
  "about",
  "chrome",
  "devtools",
  "ws",
  "wss",
  "javascript",
  "tel",
  "urn",
  "sms",
  "ftp",
]);

export function isChannelLike(value: string): boolean {
  if (value.length < 5 || value.length > 120 || value.includes("${")) return false;
  if (!/^[A-Za-z][\w.-]*(?::[\w.-]+)+$/.test(value)) return false;
  const scheme = value.slice(0, value.indexOf(":")).toLowerCase();
  return !SCHEMES.has(scheme) && !/^\d/.test(value);
}

const ELECTRON_IPC =
  /(?:^|\.)(?:ipcMain\.(?:handle|handleOnce|on|once|removeHandler|removeAllListeners)|ipcRenderer\.(?:invoke|send|sendSync|on|once|sendToHost|postMessage|removeAllListeners|removeListener)|webContents\.(?:send|sendToFrame|ipc\.(?:handle|on|once)))$/;

/** Keeps the last two meaningful segments of a minified callee (`(0,s.appController.x)` -> `appController.x`). */
export function shortCallee(callee: string): string {
  const parts = callee.split(/\??\./).filter(Boolean);
  while (parts.length > 2 || (parts.length > 1 && (parts[0] as string).length <= 2)) parts.shift();
  return parts.join(".");
}

export function inferRole(callee: string): string {
  const parts = callee.split(".");
  const last = parts[parts.length - 1] ?? "";
  const prev = parts[parts.length - 2] ?? "";
  if (
    /^(handle|handleOnce|on|once|addListener|listen|register|subscribe)/i.test(last) ||
    /handle|listen|receive/i.test(prev)
  ) {
    return "listen";
  }
  if (/^(get|create|make|use|build)/i.test(last)) return "?";
  if (/send|invoke|emit|broadcast|post|dispatch|notify|publish|call|request/i.test(last)) return "send";
  return "?";
}

interface ChannelUse {
  channel: string;
  callee: string;
  role: string;
  side: string;
  where: string;
  count: number;
}

// A callee starts only where an identifier chain starts (not inside a word or after `x.`), which keeps
// the scan linear on long identifier runs such as hex blobs.
const CALL_LITERAL =
  /(?:\(0,\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\)|(?<![\w$])(?<![\w$]\??\.)([A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*))\(\s*(["'`])([^"'`\\\n]{1,160})\3/g;

export function collectChannels(files: JsFile[]): ChannelUse[] {
  const uses = new Map<string, ChannelUse>();
  for (const file of files) {
    CALL_LITERAL.lastIndex = 0;
    for (let m = CALL_LITERAL.exec(file.text); m !== null; m = CALL_LITERAL.exec(file.text)) {
      const callee = m[1] ?? m[2] ?? "";
      const literal = m[4] ?? "";
      const electron = ELECTRON_IPC.test(callee);
      if (!electron && !isChannelLike(literal)) continue;
      if (/^(require|import|Symbol\.for|console\.\w+|\w*[lL]og(ger)?\.\w+)$/.test(shortCallee(callee))) continue;
      const short = shortCallee(callee);
      const key = `${file.side}|${short}|${literal}`;
      const known = uses.get(key);
      if (known) known.count++;
      else {
        uses.set(key, {
          channel: literal,
          callee: short,
          role: inferRole(short),
          side: file.side,
          where: at(file, m.index),
          count: 1,
        });
      }
    }
  }
  return [...uses.values()];
}

/** Method names of JavaScript built-ins; a match with one of them says nothing about an addon. */
const BUILTIN_NAMES = new Set(
  [Object, Array, String, Number, Promise, Map, Set, Function, Date, RegExp, Buffer, Uint8Array, Error].flatMap((c) => [
    ...Object.getOwnPropertyNames(c),
    ...Object.getOwnPropertyNames(c.prototype),
  ]),
);

/** camelCase identifiers in a native addon: the names it likely registers on its exports object. */
export function addonIdentifiers(data: Buffer): string[] {
  const seen = new Set<string>();
  const text = data.toString("latin1");
  for (const m of text.matchAll(/(?<![A-Za-z0-9_])[a-z][a-z0-9]*[A-Z][A-Za-z0-9]{2,60}(?![A-Za-z0-9_])/g)) {
    if (!BUILTIN_NAMES.has(m[0])) seen.add(m[0]);
  }
  return [...seen];
}

const MEMBER_CALL = /\.([A-Za-z_$][\w$]*)\(/g;

function memberCalls(files: JsFile[]): Map<string, { count: number; where: string }> {
  const calls = new Map<string, { count: number; where: string }>();
  for (const file of files) {
    MEMBER_CALL.lastIndex = 0;
    for (let m = MEMBER_CALL.exec(file.text); m !== null; m = MEMBER_CALL.exec(file.text)) {
      const name = m[1] as string;
      const known = calls.get(name);
      if (known) known.count++;
      else calls.set(name, { count: 1, where: at(file, m.index) });
    }
  }
  return calls;
}

function firstHit(files: JsFile[], needle: string | RegExp): string | undefined {
  for (const file of files) {
    const index = typeof needle === "string" ? file.text.indexOf(needle) : file.text.search(needle);
    if (index >= 0) return at(file, index);
  }
  return undefined;
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Where JS loads an addon: its file name, then its package in quotes, then its quoted base name. */
function addonReference(files: JsFile[], rel: string): string | undefined {
  const base = basename(rel, ".node");
  const pkg = /node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(rel)?.[1];
  return (
    firstHit(files, `${base}.node`) ??
    (pkg ? firstHit(files, new RegExp(`["'\`]${escapeRegExp(pkg)}["'\`/]`)) : undefined) ??
    firstHit(files, new RegExp(`["'\`/]${escapeRegExp(base)}["'\`]`))
  );
}

interface ClassInfo {
  where: string;
  methods: string[];
}

/** Skips a string or template literal starting at `i`; returns the index after it. */
function skipLiteral(text: string, i: number): number {
  const quote = text[i];
  for (let j = i + 1; j < text.length; j++) {
    if (text[j] === "\\") j++;
    else if (text[j] === quote) return j + 1;
  }
  return text.length;
}

/** Finds `class NAME` or `NAME=class` and lists the method names declared at the top level of its body. */
export function findClass(files: JsFile[], name: string): ClassInfo | undefined {
  const id = escapeRegExp(name);
  const re = new RegExp(String.raw`(?:\bclass\s+${id}\b|[.\s,;{(]${id}\s*=\s*class\b)`);
  for (const file of files) {
    const m = re.exec(file.text);
    if (!m) continue;
    const open = file.text.indexOf("{", m.index + m[0].length);
    if (open < 0) continue;
    const methods: string[] = [];
    const member = /\s*(?:static\s+)?(?:async\s+)?(?:[gs]et\s+)?\*?\s*(#?[A-Za-z_$][\w$]*)\s*\(/y;
    let depth = 0;
    const limit = Math.min(file.text.length, open + 400_000);
    for (let i = open; i < limit; i++) {
      const c = file.text[i];
      if (c === '"' || c === "'" || c === "`") {
        i = skipLiteral(file.text, i) - 1;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else continue;
      if (depth === 0) break;
      if (depth === 1) {
        member.lastIndex = i + 1;
        const hit = member.exec(file.text);
        if (hit && methods.length < 40 && !methods.includes(hit[1] as string)) methods.push(hit[1] as string);
      }
    }
    return { where: at(file, m.index), methods };
  }
  return undefined;
}

function flagCounts(files: JsFile[]): string[] {
  const checks: [string, RegExp][] = [
    ["nodeIntegration on", /nodeIntegration:\s*(?:!0|true)\b/g],
    ["contextIsolation off", /contextIsolation:\s*(?:!1|false)\b/g],
    ["sandbox off", /sandbox:\s*(?:!1|false)\b/g],
    ["webSecurity off", /webSecurity:\s*(?:!1|false)\b/g],
    ["sandbox on", /sandbox:\s*(?:!0|true)\b/g],
    ["contextIsolation on", /contextIsolation:\s*(?:!0|true)\b/g],
  ];
  const out: string[] = [];
  for (const [label, re] of checks) {
    let count = 0;
    let where = "";
    for (const file of files) {
      re.lastIndex = 0;
      for (let m = re.exec(file.text); m !== null; m = re.exec(file.text)) {
        if (count === 0) where = at(file, m.index);
        count++;
      }
    }
    if (count > 0) out.push(`${label} x${count} (first ${where})`);
  }
  return out;
}

async function integrityLines(layout: ElectronLayout, extraction: AsarExtraction): Promise<string[]> {
  const lines: string[] = [];
  const declared = await readDeclaredIntegrity(layout);
  const asarName = basename(extraction.asar).toLowerCase();
  const match = declared.find((d) => d.file.replace(/\\/g, "/").toLowerCase().endsWith(asarName));
  if (match) {
    const ok = match.hash.toLowerCase() === extraction.headerSha256;
    lines.push(
      `header sha256 ${extraction.headerSha256.slice(0, 16)}… ${ok ? "matches" : "DIFFERS FROM"} ${match.source}`,
    );
  } else if (layout.binaries.length > 0 || layout.infoPlist) {
    lines.push(
      `header sha256 ${extraction.headerSha256.slice(0, 16)}…; no declared asar integrity found (not enforced)`,
    );
  } else {
    lines.push(
      `header sha256 ${extraction.headerSha256.slice(0, 16)}…; no Electron binary beside the archive, declared integrity unknown`,
    );
  }
  const mismatch = extraction.mismatches;
  let files = `files: ${extraction.hashed} hashed, ${mismatch.length} differ from the header`;
  if (mismatch.length > 0) {
    const unpacked = mismatch.filter((m) => m.unpacked).length;
    files += ` (${unpacked} unpacked: usually signed or rebuilt after packaging; treat their header hashes as unverified)`;
    files += `: ${mismatch
      .slice(0, 6)
      .map((m) => m.path)
      .join(", ")}`;
  }
  lines.push(files);
  if (extraction.missingUnpacked.length > 0) {
    lines.push(`unpacked files missing beside the archive: ${extraction.missingUnpacked.length}`);
  }
  // Older cache manifests have no skipped list.
  const skipped = extraction.skipped ?? [];
  if (skipped.length > 0) {
    lines.push(`not extracted (name invalid on this file system): ${skipped.slice(0, 5).join(", ")}`);
  }
  return lines;
}

interface PackageJson {
  name?: string;
  productName?: string;
  version?: string;
  main?: string;
}

/** A missing, BOM-prefixed or malformed package.json degrades to an empty manifest. */
async function readPackage(path: string): Promise<PackageJson> {
  try {
    const parsed: unknown = JSON.parse((await readFile(path, "utf8")).replace(/^﻿/, ""));
    return parsed !== null && typeof parsed === "object" ? (parsed as PackageJson) : {};
  } catch {
    return {};
  }
}

const surfaceSchema = z.object({
  path: z.string().describe("App directory, resources directory, executable or .asar"),
  focus: z
    .string()
    .min(2)
    .optional()
    .describe("Feature words, comma-separated, e.g. audio,microphone; filters channels and lists matching identifiers"),
});

export type SurfaceOptions = Omit<z.output<typeof surfaceSchema>, "path">;

export async function electronSurface(path: string, options: SurfaceOptions = {}): Promise<string> {
  const layout = await locateElectron(path);
  if (!layout.asar)
    return `no app.asar found from ${path}. Pass the app directory, its resources directory or the .asar file.`;
  const extraction = await extractAsar(layout.asar);
  const root = extraction.root;
  const out: string[] = [];
  const pkg = await readPackage(join(root, "package.json"));
  const mainRel = pkg.main ? await resolveMain(root, pkg.main) : await resolveMain(root, "index.js");
  out.push(
    `app: ${pkg.productName ?? pkg.name ?? "?"} ${pkg.version ?? "?"}; main: ${pkg.main ?? "?"} -> ${mainRel ?? "unresolved"}`,
  );
  out.push(
    `root: ${root} (${extraction.files} files, ${formatSize(extraction.bytes)}, ${extraction.cached ? "cached" : `extracted in ${extraction.seconds.toFixed(1)} s`}). Use search/read on this path.`,
  );
  out.push(...(await integrityLines(layout, extraction)).map((l) => `integrity: ${l}`));
  const fuses = await readFuses(layout.binaries);
  if (fuses) {
    out.push(
      `fuses (${basename(fuses.binary)}@0x${fuses.offset.toString(16)}, wire v${fuses.version}): ${fuses.fuses.map((f) => `${f.name}=${f.state}`).join(", ")}`,
    );
  } else {
    out.push(
      `fuses: ${layout.binaries.length > 0 ? "sentinel not found" : "no Electron binary found beside the archive"}`,
    );
  }

  // App JavaScript outside node_modules.
  const mainDir = mainRel ? posix.dirname(mainRel) : undefined;
  const files: JsFile[] = [];
  const addons: { rel: string; path: string; size: number }[] = [];
  for await (const entry of walk(root, true)) {
    const ext = extname(entry.rel).toLowerCase();
    if (ext === ".node") {
      addons.push(entry);
      continue;
    }
    if (entry.rel.split("/").includes("node_modules")) continue;
    if (![".js", ".cjs", ".mjs"].includes(ext) || entry.size > 64 * 1024 * 1024) continue;
    const text = await readFile(entry.path, "utf8");
    const preload = /preload/i.test(entry.rel) || text.includes("exposeInMainWorld");
    const side =
      entry.rel === mainRel || (mainDir !== undefined && mainDir !== "." && entry.rel.startsWith(`${mainDir}/`))
        ? "main"
        : preload
          ? "preload"
          : "renderer";
    files.push({ rel: entry.rel, text, side });
  }
  const sizeOf = (side: string) => files.filter((f) => f.side === side).reduce((n, f) => n + f.text.length, 0);
  out.push(
    `js: ${files.length} files outside node_modules (main ${formatSize(sizeOf("main"))}, preload ${formatSize(sizeOf("preload"))}, renderer/other ${formatSize(sizeOf("renderer"))})`,
  );

  const preloads = files.filter((f) => f.side === "preload");
  out.push(`preloads (${preloads.length}):`);
  for (const file of preloads.slice(0, 15)) {
    const keys = [...file.text.matchAll(/exposeIn(?:Main|Isolated)World\(\s*(?:\d+\s*,\s*)?["'`]([^"'`]+)/g)].map(
      (m) => m[1],
    );
    out.push(`  ${file.rel}${keys.length > 0 ? `  exposes: ${[...new Set(keys)].join(", ")}` : ""}`);
  }

  // Several words are allowed ("audio,microphone"); a name matches when it contains any of them.
  const words = (options.focus ?? "")
    .toLowerCase()
    .split(/[\s,|]+/)
    .filter((w) => w.length >= 2);
  // Without a usable word the focus is ignored: an empty alternation would match everywhere.
  const focus = words.length > 0 ? words.join(",") : undefined;
  if (options.focus && !focus) out.push(`focus "${options.focus}" ignored: give words of 2 or more characters`);

  const calls = memberCalls(files.filter((f) => f.side !== "renderer"));
  out.push(`native addons (${addons.length}):`);
  const matches = (text: string): boolean => {
    const lower = text.toLowerCase();
    return words.some((w) => lower.includes(w));
  };
  for (const addon of addons) {
    const data = await readFile(addon.path);
    const id = identify(data.subarray(0, 65536));
    const loadedBy = addonReference(files, addon.rel);
    out.push(`  ${addon.rel} (${formatSize(addon.size)}, ${id.format})${loadedBy ? ` referenced at ${loadedBy}` : ""}`);
    const called = addonIdentifiers(data)
      .filter((name) => calls.has(name))
      .filter((name) => !focus || matches(name));
    if (called.length > 0) {
      const shown = called.slice(0, 25).map((name) => {
        const call = calls.get(name);
        return `${name} (x${call?.count} ${call?.where})`;
      });
      out.push(
        `    names also called from main/preload JS: ${shown.join("; ")}${called.length > 25 ? `; +${called.length - 25}` : ""}`,
      );
    }
  }

  if (focus) {
    const ids = new Map<string, { count: number; where: string; cls?: ClassInfo }>();
    const re = new RegExp(String.raw`(?<![\w$])[\w$]*(?:${words.map(escapeRegExp).join("|")})[\w$]*`, "gi");
    const code = files.filter((f) => f.side !== "renderer");
    for (const file of code) {
      re.lastIndex = 0;
      for (let m = re.exec(file.text); m !== null; m = re.exec(file.text)) {
        const name = m[0];
        if (name.length > 80 || words.includes(name.toLowerCase())) continue;
        const known = ids.get(name);
        if (known) known.count++;
        else ids.set(name, { count: 1, where: at(file, m.index) });
      }
    }
    for (const [name, info] of ids) {
      if (/^[A-Z]/.test(name)) info.cls = findClass(code, name);
    }
    const top = [...ids.entries()].sort(
      (a, b) => Number(b[1].cls !== undefined) - Number(a[1].cls !== undefined) || b[1].count - a[1].count,
    );
    out.push(`focus "${options.focus}" identifiers in main/preload (${ids.size}, classes first with their methods):`);
    for (const [name, info] of top.slice(0, 30)) {
      if (info.cls)
        out.push(`  class ${name} ${info.cls.where} x${info.count}; methods: ${info.cls.methods.join(" ")}`);
      else out.push(`  ${name} x${info.count} ${info.where}`);
    }
  }

  const flags = flagCounts(files.filter((f) => f.side === "main"));
  if (flags.length > 0) out.push(`webPreferences: ${flags.join("; ")}`);

  const uses = collectChannels(files).filter((u) => !focus || matches(u.channel));
  const groups = new Map<string, ChannelUse[]>();
  for (const use of uses) {
    const key = `${use.side}|${use.callee}`;
    groups.set(key, [...(groups.get(key) ?? []), use]);
  }
  const ordered = [...groups.entries()].sort((a, b) => {
    const rank = (k: string) => ["main", "preload", "renderer"].indexOf(k.split("|")[0] as string);
    return rank(a[0]) - rank(b[0]) || b[1].length - a[1].length;
  });
  const channelCount = new Set(uses.map((u) => u.channel)).size;
  out.push(
    `ipc${focus ? ` matching "${options.focus}"` : ""}: ${channelCount} channels in ${groups.size} call sites (role inferred from the callee name: listen/send/?)`,
  );
  if (!focus) {
    // Call-site summary first, so it survives truncation; the per-channel detail follows.
    for (const [key, list] of ordered) {
      const [side, callee] = key.split("|");
      const sample = list.slice(0, 2).map((u) => u.channel);
      out.push(
        `  [${side}] ${callee} (${list[0]?.role}) ${list.length}: ${sample.join(", ")}${list.length > 2 ? ", …" : ""}`,
      );
    }
    out.push("tip: call again with focus=<feature word> to filter channels and list matching classes and methods");
    out.push("ipc detail:");
  }
  for (const [key, list] of ordered) {
    const [side, callee] = key.split("|");
    out.push(`  [${side}] ${callee} (${list[0]?.role}) ${list.length}:`);
    for (const use of list.sort((a, b) => a.channel.localeCompare(b.channel))) {
      out.push(`    ${use.channel}  ${use.where}${use.count > 1 ? ` x${use.count}` : ""}`);
    }
  }
  return out.join("\n");
}

export const electronSurfaceTool = defineTool({
  name: "electron_surface",
  description:
    "Electron app map: extracts app.asar (cached), main entry, preloads and exposed APIs, native .node addons and the addon names called from JS, IPC channels grouped by call site, fuses, asar integrity. Use focus (one or more words) to filter on one feature.",
  schema: surfaceSchema,
  run({ path, focus }) {
    return electronSurface(path, { focus });
  },
});
