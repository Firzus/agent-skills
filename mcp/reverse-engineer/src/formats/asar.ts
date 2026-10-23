import { createHash } from "node:crypto";
import { copyFile, mkdir, open, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { artifactPath, exists, readJson, sha256, sha256File, writeJson } from "../core/cache";

export interface AsarEntry {
  path: string;
  size: number;
  offset?: number;
  unpacked: boolean;
  link?: string;
  hash?: string;
}

export interface AsarHeader {
  headerString: string;
  dataOffset: number;
  entries: AsarEntry[];
}

interface RawNode {
  files?: Record<string, RawNode>;
  size?: number;
  offset?: string;
  unpacked?: boolean;
  link?: string;
  integrity?: { algorithm?: string; hash?: string };
}

/** Rejects names that could escape the extraction root. */
function safeName(name: string): boolean {
  return name !== "" && name !== "." && name !== ".." && !/[\\/:\0]/.test(name);
}

/** Names Windows cannot create: reserved characters, device names, a trailing dot or space. */
function windowsUnsafe(path: string): boolean {
  return path
    .split("/")
    .some(
      (name) =>
        /[<>"|?*]|[. ]$/.test(name) ||
        Array.from({ length: name.length }, (_, i) => name.charCodeAt(i)).some((code) => code < 32) ||
        /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(name),
    );
}

export async function readAsarHeader(path: string): Promise<AsarHeader> {
  const handle = await open(path, "r");
  try {
    const prefix = Buffer.alloc(16);
    await handle.read(prefix, 0, 16, 0);
    if (prefix.readUInt32LE(0) !== 4) throw new Error("not an asar archive (bad pickle prefix)");
    const headerSize = prefix.readUInt32LE(4);
    const stringLength = prefix.readUInt32LE(12);
    const { size } = await handle.stat();
    if (stringLength > headerSize || 16 + stringLength > size) throw new Error("asar header size out of range");
    const raw = Buffer.alloc(stringLength);
    await handle.read(raw, 0, stringLength, 16);
    const headerString = raw.toString("utf8");
    const root = JSON.parse(headerString) as RawNode;
    const entries: AsarEntry[] = [];
    const visit = (node: RawNode, prefixPath: string): void => {
      for (const [name, child] of Object.entries(node.files ?? {})) {
        if (!safeName(name)) continue;
        const rel = prefixPath ? `${prefixPath}/${name}` : name;
        if (child.files) {
          visit(child, rel);
          continue;
        }
        const hash = child.integrity?.algorithm === "SHA256" ? child.integrity.hash : undefined;
        entries.push({
          path: rel,
          size: child.size ?? 0,
          offset: child.offset === undefined ? undefined : Number(child.offset),
          unpacked: child.unpacked === true,
          link: child.link,
          hash,
        });
      }
    };
    visit(root, "");
    return { headerString, dataOffset: 8 + headerSize, entries };
  } finally {
    await handle.close();
  }
}

export interface AsarExtraction {
  asar: string;
  sha256: string;
  root: string;
  headerSha256: string;
  files: number;
  bytes: number;
  hashed: number;
  mismatches: { path: string; unpacked: boolean }[];
  missingUnpacked: string[];
  /** Members whose name cannot be created on this file system (Windows reserved names or characters). */
  skipped: string[];
  cached: boolean;
  seconds: number;
}

const inFlight = new Map<string, Promise<AsarExtraction>>();

/**
 * Extracts an archive into the cache (keyed by its SHA-256), copying unpacked
 * members from `<archive>.unpacked`. Every member with a declared SHA-256 is
 * hashed; mismatches are reported, never fatal. Concurrent calls share one extraction.
 */
export async function extractAsar(asar: string): Promise<AsarExtraction> {
  const sha = await sha256File(asar);
  const root = artifactPath(sha, "asar");
  const previous = await readJson<AsarExtraction>(`${root}.json`);
  // A cache built while `.unpacked` was absent is stale once it appears.
  const stale = previous && previous.missingUnpacked.length > 0 && (await exists(`${asar}.unpacked`));
  if (previous && !stale && (await exists(root))) return { ...previous, asar, cached: true, seconds: 0 };
  let pending = inFlight.get(root);
  if (!pending) {
    pending = extractInto(asar, sha, root).finally(() => inFlight.delete(root));
    inFlight.set(root, pending);
  }
  return pending;
}

/** Extracts into a temporary sibling, then renames it into place, so readers never see a partial tree. */
async function extractInto(asar: string, sha: string, root: string): Promise<AsarExtraction> {
  const started = Date.now();
  const work = `${root}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(work, { recursive: true });
  try {
    return await fill(asar, sha, root, work, started);
  } catch (error) {
    await rm(work, { recursive: true, force: true });
    throw error;
  }
}

async function fill(asar: string, sha: string, root: string, work: string, started: number): Promise<AsarExtraction> {
  const header = await readAsarHeader(asar);
  const unpackedRoot = `${asar}.unpacked`;
  const result: AsarExtraction = {
    asar,
    sha256: sha,
    root,
    headerSha256: sha256(header.headerString),
    files: 0,
    bytes: 0,
    hashed: 0,
    mismatches: [],
    missingUnpacked: [],
    skipped: [],
    cached: false,
    seconds: 0,
  };
  const data = await readFile(asar);
  for (const entry of header.entries) {
    if (entry.link !== undefined) continue;
    if (process.platform === "win32" && windowsUnsafe(entry.path)) {
      result.skipped.push(entry.path);
      continue;
    }
    const target = join(work, ...entry.path.split("/"));
    await mkdir(dirname(target), { recursive: true });
    let content: Buffer | undefined;
    if (entry.unpacked) {
      const source = join(unpackedRoot, ...entry.path.split("/"));
      if (!(await exists(source))) {
        result.missingUnpacked.push(entry.path);
        continue;
      }
      await copyFile(source, target);
      if (entry.hash) content = await readFile(source);
    } else {
      const start = header.dataOffset + (entry.offset ?? 0);
      content = data.subarray(start, start + entry.size);
      await writeFile(target, content);
    }
    result.files++;
    result.bytes += entry.size;
    if (entry.hash && content) {
      result.hashed++;
      const actual = createHash("sha256").update(content).digest("hex");
      if (actual !== entry.hash) result.mismatches.push({ path: entry.path, unpacked: entry.unpacked });
    }
  }
  result.seconds = (Date.now() - started) / 1000;
  await publish(work, root);
  await writeJson(`${root}.json`, result);
  return result;
}

/**
 * Moves the new tree into place: an older tree is renamed aside, then deleted. Renames refused while
 * a file is open (a reader, an antivirus scan on Windows) are retried; if the swap still fails, the
 * older tree is put back. Older trees left by an interrupted run are deleted on the way.
 */
async function publish(work: string, root: string): Promise<void> {
  const parent = dirname(root);
  const stale = `${basename(root)}.old-`;
  for (const name of await readdir(parent).catch(() => [] as string[])) {
    if (name.startsWith(stale)) await rm(join(parent, name), { recursive: true, force: true }).catch(() => {});
  }
  const old = `${root}.old-${process.pid}-${Date.now()}`;
  const hadRoot = await exists(root);
  if (hadRoot) await retrying(() => rename(root, old));
  try {
    await retrying(() => rename(work, root));
  } catch (error) {
    if (hadRoot) await rename(old, root).catch(() => {});
    throw error;
  }
  await rm(old, { recursive: true, force: true }).catch(() => {});
}

/** Retries a rename that Windows refuses while another handle is open on the folder. */
async function retrying(op: () => Promise<void>): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await op();
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= 5 || (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES")) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
}
