import { open, readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export interface WalkEntry {
  path: string;
  rel: string;
  size: number;
}

const ALWAYS_SKIPPED = new Set([".git", ".hg", ".svn"]);

/** Depth-first walk that includes hidden entries and skips node_modules unless asked. */
export async function* walk(root: string, includeDeps = false): AsyncGenerator<WalkEntry> {
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const subdirs: string[] = [];
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (ALWAYS_SKIPPED.has(entry.name)) continue;
        if (!includeDeps && entry.name === "node_modules") continue;
        subdirs.push(path);
      } else if (entry.isFile()) {
        const { size } = await stat(path);
        yield { path, rel: toPosix(relative(root, path)), size };
      }
    }
    stack.push(...subdirs.reverse());
  }
}

export function toPosix(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}

/** Reads up to length bytes at position. */
export async function readAt(path: string, position: number, length: number): Promise<Buffer> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, position);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/** True when the sample has no NUL byte, the usual text heuristic. */
export function looksText(sample: Uint8Array): boolean {
  return !sample.includes(0);
}

/** Maps character offsets in a text to 1-based line and column. */
export function lineLocator(text: string): (offset: number) => { line: number; col: number } {
  const starts = [0];
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((starts[mid] as number) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: offset - (starts[lo] as number) + 1 };
  };
}

/** One-line excerpt around [start, end) with control characters flattened. */
export function excerpt(text: string, start: number, end: number, context: number): string {
  const from = Math.max(0, start - context);
  const to = Math.min(text.length, end + context);
  let lineFrom = text.lastIndexOf("\n", start - 1) + 1;
  let lineTo = text.indexOf("\n", end);
  if (lineTo === -1) lineTo = text.length;
  lineFrom = Math.max(lineFrom, from);
  lineTo = Math.min(lineTo, to);
  const body = text
    .slice(lineFrom, lineTo)
    .replace(/[\t\r\v\f]+/g, " ")
    .trim();
  return `${lineFrom > 0 && text[lineFrom - 1] !== "\n" ? "…" : ""}${body}${lineTo < text.length && text[lineTo] !== "\n" ? "…" : ""}`;
}

export function hex(value: number): string {
  return `0x${value.toString(16)}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
