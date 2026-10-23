import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheRoot, ensureDir, sha256 } from "./cache";

/** Maximum UTF-8 size of one tool response. */
export function maxBytes(): number {
  const value = Number(process.env.REVERSE_ENGINEER_MAX_BYTES);
  return Number.isFinite(value) && value >= 1024 ? value : 8192;
}

const FOOTER_RESERVE = 400;

/**
 * Returns text unchanged when it fits the budget. Otherwise writes the full
 * text to the cache and returns the head, cut at a line boundary, plus a
 * footer naming the file so read and search can page through it.
 */
export async function fit(text: string, label: string, limit = maxBytes()): Promise<string> {
  const size = Buffer.byteLength(text);
  if (size <= limit) return text;
  const dir = await ensureDir(join(cacheRoot(), "out"));
  const file = join(dir, `${label}-${sha256(text).slice(0, 12)}.txt`);
  await writeFile(file, text);
  let head = Buffer.from(text)
    .subarray(0, limit - FOOTER_RESERVE)
    .toString("utf8");
  const cut = head.lastIndexOf("\n");
  if (cut > 0) head = head.slice(0, cut);
  const shown = head.split("\n").length;
  const total = text.split("\n").length;
  return `${head}\n[truncated: ${shown}/${total} lines shown. Full output (${size} B): ${file} . Page it with read, or filter it with search.]`;
}
