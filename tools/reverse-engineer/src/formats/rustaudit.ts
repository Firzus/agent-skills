/** Rust dependency data: the cargo-auditable `.dep-v0` section, else hints from strings. */
import { inflateSync } from "node:zlib";
import type { BinaryView } from "./binary";

export interface RustPackage {
  name: string;
  version: string;
  source?: string;
  kind?: string;
  root?: boolean;
}

export interface RustInfo {
  section?: { name: string; offset: number };
  packages: RustPackage[];
  rustcCommits: string[];
  crateHints: string[];
}

const RUSTC_PATH = /\/rustc\/([0-9a-f]{40})\//g;
const CRATE_PATH =
  /(?:registry\/src\/[^/\\]+[/\\]|cargo[/\\]git[/\\]checkouts[/\\][^/\\]+[/\\])([a-z0-9_-]+-\d+\.\d+\.\d+[^/\\]*)[/\\]/g;
const CHUNK = 64 << 20;
const OVERLAP = 4096;

/**
 * Distinct first groups of `pattern` over the bytes, searched in overlapping latin1 windows: one string for the
 * whole file would fail above V8's maximum string length. Matches longer than the overlap can be missed at a seam.
 * Files holding none of the `needles` (literal parts every match contains) are not decoded at all.
 */
function distinctMatches(buf: Uint8Array, pattern: RegExp, needles: string[]): string[] {
  const bytes = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (!needles.some((needle) => bytes.includes(needle, 0, "latin1"))) return [];
  const found = new Set<string>();
  for (let start = 0; start < bytes.length; start += CHUNK) {
    const text = bytes.subarray(start, start + CHUNK + OVERLAP).toString("latin1");
    for (const m of text.matchAll(pattern)) found.add(m[1] as string);
  }
  return [...found];
}

export function readRustInfo(buf: Uint8Array, view: BinaryView | undefined): RustInfo | undefined {
  const rustcCommits = distinctMatches(buf, RUSTC_PATH, ["/rustc/"]);
  const section = view?.sections.find((s) => s.name === ".dep-v0" || s.name.endsWith(",.dep-v0"));
  let packages: RustPackage[] = [];
  if (section && section.fileSize > 0 && section.fileSize < 1 << 20) {
    const start = (view?.base ?? 0) + section.offset;
    try {
      const json = inflateSync(buf.subarray(start, start + section.fileSize), { maxOutputLength: 32 << 20 });
      packages = (JSON.parse(json.toString("utf8")) as { packages?: RustPackage[] }).packages ?? [];
    } catch {
      packages = [];
    }
  }
  const crateHints = packages.length > 0 ? [] : distinctMatches(buf, CRATE_PATH, ["registry/src/", "checkouts"]);
  if (!section && rustcCommits.length === 0 && crateHints.length === 0) return undefined;
  return {
    section: section ? { name: section.name, offset: (view?.base ?? 0) + section.offset } : undefined,
    packages,
    rustcCommits,
    crateHints,
  };
}
