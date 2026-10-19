import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

/** Root of the only directory this tool writes to. */
export function cacheRoot(): string {
  const override = process.env.REVERSE_ENGINEER_CACHE;
  if (override) return override;
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return join(local, "reverse-engineer", "cache");
  }
  if (process.platform === "darwin") return join(homedir(), "Library", "Caches", "reverse-engineer");
  return join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "reverse-engineer");
}

const hashMemo = new Map<string, string>();

/** Streams a file through SHA-256, memoized by path, size and mtime. */
export async function sha256File(path: string): Promise<string> {
  const info = await stat(path);
  const key = `${path}|${info.size}|${info.mtimeMs}`;
  const memo = hashMemo.get(key);
  if (memo) return memo;
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  const hex = hash.digest("hex");
  hashMemo.set(key, hex);
  return hex;
}

export function sha256(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Cache location for one artifact (keyed by its SHA-256) and one kind of product. */
export function artifactPath(sha: string, kind: string): string {
  return join(cacheRoot(), sha.slice(0, 16), kind);
}

export async function ensureDir(dir: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** Reads a JSON product written by writeJson, or undefined when absent. */
export async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value));
}
