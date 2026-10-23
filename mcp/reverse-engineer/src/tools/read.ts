import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import * as z from "zod";
import { formatSize, hex, looksText, readAt } from "../core/files";
import { defineTool } from "./types";

const LINE_CAP = 400;

export function hexdump(data: Uint8Array, base: number): string {
  const rows: string[] = [];
  for (let i = 0; i < data.length; i += 16) {
    const row = data.subarray(i, i + 16);
    const bytes = [...row].map((b) => b.toString(16).padStart(2, "0")).join(" ");
    const text = [...row].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
    rows.push(`${(base + i).toString(16).padStart(8, "0")}  ${bytes.padEnd(47)}  ${text}`);
  }
  return rows.join("\n");
}

async function listDirectory(path: string): Promise<string> {
  const entries = await readdir(path, { withFileTypes: true });
  const lines = [`directory: ${path} (${entries.length} entries)`];
  for (const entry of entries.slice(0, 200)) {
    if (entry.isDirectory()) lines.push(`  ${entry.name}/`);
    else lines.push(`  ${entry.name}  ${formatSize((await stat(join(path, entry.name))).size)}`);
  }
  return lines.join("\n");
}

const readSchema = z.object({
  path: z.string(),
  start: z.number().int().min(1).optional().describe("First line (1-based)"),
  end: z.number().int().min(1).optional().describe("Last line, default start+79"),
  col: z.number().int().min(1).optional().describe("Column in line `start` for minified code"),
  offset: z.number().int().min(0).optional().describe("Byte offset (hexdump for binaries)"),
  length: z.number().int().min(1).optional().describe("Characters (col/offset mode) or bytes"),
});

export type ReadOptions = Omit<z.output<typeof readSchema>, "path">;

export async function readSlice(path: string, options: ReadOptions): Promise<string> {
  const info = await stat(path);
  if (info.isDirectory()) return listDirectory(path);
  const sample = await readAt(path, 0, 8192);
  const binary = !looksText(sample);
  if (binary || (options.offset !== undefined && options.start === undefined)) {
    const offset = options.offset ?? 0;
    const length = Math.min(options.length ?? (binary ? 256 : 2000), binary ? 4096 : 6000);
    const data = await readAt(path, offset, length);
    const header = `${path}@${hex(offset)} (${data.length} of ${info.size} B)`;
    return binary ? `${header}\n${hexdump(data, offset)}` : `${header}\n${data.toString("utf8")}`;
  }
  // A whole-file string beyond V8's string limit (~512 MB) would throw: very large text files use offsets.
  if (info.size > 256 * 1024 * 1024)
    return `${path}: ${formatSize(info.size)} is too large to read by line; use offset and length, or search`;
  const text = await readFile(path, "utf8");
  const lines = text.split("\n");
  const start = Math.max(1, options.start ?? 1);
  if (start > lines.length) return `${path}: only ${lines.length} lines`;
  if (options.col !== undefined) {
    // Minified code: a character window inside one long line.
    const line = lines[start - 1] ?? "";
    const from = Math.max(0, options.col - 1);
    const length = Math.min(options.length ?? 1500, 6000);
    const slice = line.slice(from, from + length);
    return `${path}:${start}:${from + 1}-${from + slice.length} (line has ${line.length} chars)\n${slice}`;
  }
  const end = Math.min(lines.length, options.end ?? start + 79);
  const out = [`${path}:${start}-${end} (${lines.length} lines)`];
  for (let n = start; n <= end; n++) {
    const line = (lines[n - 1] ?? "").replace(/\r$/, "");
    const cut =
      line.length > LINE_CAP ? `${line.slice(0, LINE_CAP)}…[+${line.length - LINE_CAP} chars; use col]` : line;
    out.push(`${n}| ${cut}`);
  }
  return out.join("\n");
}

export const read = defineTool({
  name: "read",
  description:
    "Read a slice: lines start..end; for minified code a column window (start=line, col, length); for binaries a hexdump at offset. A directory path lists its entries.",
  schema: readSchema,
  run(args) {
    return readSlice(args.path, args);
  },
});
