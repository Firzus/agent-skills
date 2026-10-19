import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, extname, join } from "node:path";
import * as z from "zod";
import { artifactPath, exists, sha256File } from "../core/cache";
import { launcherSafePath, runTool } from "../core/process";
import { toolEnv, toolsRoot } from "../core/thirdParty";
import { formatSize, readAt, walk } from "../core/files";
import { identify } from "../formats/magic";
import { zipFlavor, zipNames } from "../formats/zip";
import { defineTool } from "./types";

/** Finds an executable in the tools root, on PATH, then in the usual per-user tool folders. */
export function which(name: string): string | undefined {
  const exts = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  const dirs = [
    join(toolsRoot(), "jadx", "bin"),
    join(toolsRoot(), "dotnet-tools"),
    ...(process.env.PATH ?? "").split(delimiter),
    join(homedir(), ".dotnet", "tools"),
    join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Microsoft", "WinGet", "Links"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
  ];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, `${name}${ext}`);
      if (dir && existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

type Kind = "dotnet" | "android" | "java";

async function detect(path: string): Promise<Kind | undefined> {
  const head = await readAt(path, 0, 65536);
  const id = identify(head);
  if (id.kind === "pe" && id.dotnet) return "dotnet";
  if (id.kind === "dex") return "android";
  if (id.kind === "zip") {
    const flavor = zipFlavor(await zipNames(path));
    if (flavor.startsWith("Android")) return "android";
    if (flavor === "Java JAR") return "java";
  }
  if (id.kind === "java-class") return "java";
  return undefined;
}

interface Tree {
  root: string;
  tool: string;
  fresh: boolean;
}

const inFlight = new Map<string, Promise<Tree>>();

/** Decompiles once into the cache; returns the output root. Concurrent calls share one run. */
async function decompileTree(path: string, kind: Kind): Promise<Tree> {
  const sha = await sha256File(path);
  const tool = kind === "dotnet" ? "ilspycmd" : "jadx";
  const root = artifactPath(sha, tool);
  if (await exists(`${root}.done`)) return { root, tool, fresh: false };
  let pending = inFlight.get(root);
  if (!pending) {
    pending = runDecompiler(path, sha, tool, root).finally(() => inFlight.delete(root));
    inFlight.set(root, pending);
  }
  return pending;
}

async function runDecompiler(path: string, sha: string, tool: string, root: string): Promise<Tree> {
  const binary = which(tool);
  if (!binary) {
    const needs = tool === "ilspycmd" ? "the .NET 10 SDK" : "JDK 21";
    throw new Error(
      `${tool} not found. Install it and ${needs} into ${toolsRoot()} (install.md in the reverse-engineer skill), or use triage and binary_inventory instead.`,
    );
  }
  await rm(root, { recursive: true, force: true });
  const input = await launcherSafePath(path, artifactPath(sha, "input"));
  const args =
    tool === "ilspycmd"
      ? ["-p", "-o", root, input]
      : ["-d", root, "--show-bad-code", "--no-debug-info", "-j", "4", input];
  const { code, log, timedOut } = await runTool(binary, args, { env: toolEnv(), timeoutMs: 900_000 });
  if (timedOut || !(await exists(root))) {
    // A partial tree must not be served as complete by the next call.
    await rm(root, { recursive: true, force: true });
    throw new Error(`${tool} ${timedOut ? "timed out" : `failed (exit ${code})`}:\n${log.slice(-1500)}`);
  }
  await writeFile(`${root}.done`, String(code));
  return { root, tool, fresh: true };
}

export async function managed(path: string, type?: string): Promise<string> {
  const kind = await detect(path);
  if (!kind) return `${path}: not a .NET assembly, APK, DEX or JAR; use triage(path)`;
  const { root, tool, fresh } = await decompileTree(path, kind);
  const sources: { rel: string; path: string; size: number }[] = [];
  const ext = kind === "dotnet" ? ".cs" : ".java";
  for await (const entry of walk(root, true)) if (extname(entry.rel) === ext) sources.push(entry);

  if (type) {
    const wanted = type.replace(/\./g, "/").toLowerCase();
    const short = type.split(/[./]/).pop()?.toLowerCase() ?? "";
    // Whole path segments only (Client must not match HttpClient); a qualified match comes first.
    const qualified = (rel: string) => rel === wanted || rel.endsWith(`/${wanted}`);
    const relOf = (s: { rel: string }) => s.rel.toLowerCase().slice(0, -ext.length);
    const matches = sources
      .filter((s) => qualified(relOf(s)) || relOf(s).split("/").pop() === short)
      .sort((a, b) => Number(qualified(relOf(b))) - Number(qualified(relOf(a))));
    if (matches.length === 0)
      return `no ${ext} file for type "${type}" under ${root}; use search(root, "class ${short}")`;
    const file = matches[0] as (typeof matches)[number];
    const text = await readFile(file.path, "utf8");
    return [
      `// ${file.path} (${formatSize(file.size)})${matches.length > 1 ? `; ${matches.length - 1} other matches` : ""}`,
      text,
    ].join("\n");
  }

  const out = [
    `${tool}: ${fresh ? "decompiled" : "cached"} into ${root} (${sources.length} ${ext} files). Use search/read on this root.`,
  ];
  const packages = new Map<string, number>();
  for (const s of sources) {
    // jadx writes Java files under sources/ and the manifest under resources/.
    const dir = (kind === "dotnet" ? s.rel : s.rel.replace(/^sources\//, ""))
      .split("/")
      .slice(0, -1)
      .join(kind === "dotnet" ? "/" : ".");
    packages.set(dir || "(root)", (packages.get(dir || "(root)") ?? 0) + 1);
  }
  const top = [...packages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  out.push(
    `${kind === "dotnet" ? "folders" : "packages"} (${packages.size}): ${top.map(([p, n]) => `${p} ${n}`).join(", ")}`,
  );
  if (kind === "android") {
    const manifest = join(root, "resources", "AndroidManifest.xml");
    if (await exists(manifest)) {
      const xml = await readFile(manifest, "utf8");
      const pkg = /package="([^"]+)"/.exec(xml)?.[1];
      const components = [...xml.matchAll(/<(activity|service|receiver|provider)\b[^>]*android:name="([^"]+)"/g)].map(
        (m) => `${m[1]} ${m[2]}`,
      );
      const permissions = [...xml.matchAll(/uses-permission[^>]*android:name="([^"]+)"/g)].map((m) => m[1]);
      out.push(
        `manifest: package ${pkg ?? "?"}; ${components.length} components; permissions: ${permissions.join(", ")}`,
      );
      for (const c of components.slice(0, 30)) out.push(`  ${c}`);
    }
    const natives = (await zipNames(path)).filter((n) => n.startsWith("lib/") && n.endsWith(".so"));
    if (natives.length > 0) out.push(`native libraries (${natives.length}): ${natives.slice(0, 20).join(" ")}`);
  } else if (kind === "dotnet") {
    const interop: string[] = [];
    for (const s of sources) {
      const text = await readFile(s.path, "utf8");
      for (const m of text.matchAll(/\[(?:DllImport|LibraryImport)\(\s*"([^"]+)"/g)) interop.push(`${m[1]} (${s.rel})`);
      if (interop.length >= 40) break;
    }
    out.push(
      `P/Invoke (${interop.length}${interop.length >= 40 ? "+" : ""}): ${[...new Set(interop)].slice(0, 40).join("; ") || "none"}`,
    );
  }
  out.push("next: managed(path, type=Namespace.Type) for one type; search(root, pattern) across the sources");
  return out.join("\n");
}

export const managedTool = defineTool({
  name: "managed",
  description:
    ".NET assemblies (via ilspycmd) and APK/DEX/JAR (via jadx): decompile once into the cache, summarize namespaces, manifest, P/Invoke and native libraries; type=Name returns one type's source.",
  schema: z.object({
    path: z.string(),
    type: z.string().optional().describe("Fully qualified or short type name"),
  }),
  run({ path, type }) {
    return managed(path, type);
  },
});
