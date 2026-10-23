import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import * as z from "zod";
import { sha256File } from "../core/cache";
import { formatSize, hex, readAt, walk } from "../core/files";
import { FUSE_SENTINEL, locateElectron } from "../formats/electron";
import { type Identity, identify } from "../formats/magic";
import { zipFlavor, zipNames } from "../formats/zip";
import { defineTool } from "./types";

const MARKERS: { label: string; needle: Buffer }[] = [
  { label: "go-buildinfo", needle: Buffer.from("\xff Go buildinf:", "latin1") },
  { label: "rust (.dep-v0 cargo-auditable)", needle: Buffer.from(".dep-v0", "latin1") },
  { label: "rust (rustc path)", needle: Buffer.from("/rustc/", "latin1") },
  { label: "electron-fuses", needle: Buffer.from(FUSE_SENTINEL, "latin1") },
  { label: "node-addon (N-API)", needle: Buffer.from("napi_register_module_v1", "latin1") },
  { label: "node-addon (NAN)", needle: Buffer.from("node_register_module_v", "latin1") },
  { label: "upx-packed", needle: Buffer.from("UPX!", "latin1") },
  { label: "pyinstaller", needle: Buffer.from("MEI\x0c\x0b\x0a\x0b\x0e", "latin1") },
  { label: "qt", needle: Buffer.from("QObject", "latin1") },
  { label: "dart/flutter", needle: Buffer.from("dart:core", "latin1") },
];

const SCAN_LIMIT = 512 * 1024 * 1024;

function nextSteps(id: Identity, markers: string[]): string {
  const has = (prefix: string) => markers.some((m) => m.startsWith(prefix));
  if (id.kind === "asar") return "electron_surface(path); then search/read on the extracted root";
  if (has("go-buildinfo") || has("rust")) return "buildinfo(path); binary_inventory(path, part=imports)";
  if (id.dotnet) return "managed(path); binary_inventory(path)";
  if (has("electron-fuses")) return "electron_surface(path of the app directory)";
  if (id.kind === "pe" || id.kind === "elf" || id.kind === "macho") {
    return "binary_inventory(path); decompile(path, function=NAME) only for logic questions";
  }
  if (id.kind === "zip") return "managed(path) for APK/JAR";
  if (id.kind === "text") return "read(path) or search(path, pattern)";
  return "read(path, offset=0) for a hexdump";
}

async function triageFile(path: string): Promise<string> {
  const info = await stat(path);
  const head = await readAt(path, 0, 65536);
  const id = identify(head);
  const lines = [`file: ${path}`, `size: ${info.size} B (${formatSize(info.size)})  sha256: ${await sha256File(path)}`];
  let format = id.format;
  if (id.kind === "zip") format = `${zipFlavor(await zipNames(path))} (zip)`;
  lines.push(`format: ${format}`);
  const markers: string[] = [];
  if (["pe", "elf", "macho", "data"].includes(id.kind) && info.size <= SCAN_LIMIT) {
    const data = await readFile(path);
    for (const { label, needle } of MARKERS) {
      const at = data.indexOf(needle);
      if (at >= 0) markers.push(`${label}@${hex(at)}`);
    }
  }
  lines.push(`markers: ${markers.length > 0 ? markers.join("; ") : "none"}`);
  lines.push(`next: ${nextSteps(id, markers)}`);
  return lines.join("\n");
}

const NOTABLE = new Set([".exe", ".dll", ".node", ".asar", ".so", ".dylib", ".apk", ".jar", ".wasm", ".sys", ".bin"]);

async function triageDirectory(path: string): Promise<string> {
  const lines = [`directory: ${path}`];
  const electron = await locateElectron(path);
  if (electron.asar) {
    lines.push(`electron: archive ${electron.asar}; binaries: ${electron.binaries.join(", ") || "none found"}`);
  }
  const byExt = new Map<string, number>();
  const notable: { rel: string; size: number }[] = [];
  let files = 0;
  for await (const entry of walk(path, true)) {
    files++;
    const ext = extname(entry.rel).toLowerCase() || "(none)";
    byExt.set(ext, (byExt.get(ext) ?? 0) + 1);
    if (NOTABLE.has(ext) || entry.rel.endsWith("package.json")) notable.push(entry);
    if (files >= 50000) break;
  }
  const exts = [...byExt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  lines.push(
    `files: ${files}${files >= 50000 ? "+" : ""}; by extension: ${exts.map(([e, n]) => `${e} ${n}`).join(", ")}`,
  );
  notable.sort((a, b) => b.size - a.size);
  lines.push(`notable (largest first, ${notable.length}):`);
  for (const entry of notable.slice(0, 40)) lines.push(`  ${entry.rel}  ${formatSize(entry.size)}`);
  lines.push(`next: ${electron.asar ? "electron_surface(path)" : "triage(path of one notable file)"}`);
  return lines.join("\n");
}

export const triage = defineTool({
  name: "triage",
  description:
    "Identify a file or directory: format, architecture, size, SHA-256, markers (Go, Rust, Electron, N-API, packers) and the next tool to call.",
  schema: z.object({ path: z.string().describe("File or directory") }),
  async run({ path }) {
    return (await stat(path)).isDirectory() ? triageDirectory(path) : triageFile(path);
  },
});
