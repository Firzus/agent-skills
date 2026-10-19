/**
 * Go build info, as written by the linker and read by `go version -m`
 * (src/debug/buildinfo/buildinfo.go): a 32-byte header starting with
 * "\xff Go buildinf:", then either two inline varint-prefixed strings (Go 1.18+)
 * or pointers to two Go string headers.
 */
import type { BinaryView } from "./binary";

export interface GoModule {
  path: string;
  version: string;
  sum?: string;
  replace?: { path: string; version: string };
}

export interface GoBuildInfo {
  offset: number;
  goVersion: string;
  path?: string;
  main?: GoModule;
  deps: GoModule[];
  settings: [string, string][];
}

const MAGIC = Buffer.from("\xff Go buildinf:", "latin1");
const MOD_START = Buffer.from("3077af0c9274080241e1c107e6d618e6", "hex");
const MOD_END = Buffer.from("f932433186182072008242104116d8f2", "hex");

function uvarint(buf: Uint8Array, at: number): [value: number, next: number] | undefined {
  let value = 0;
  let shift = 0;
  for (let i = 0; i < 10 && at + i < buf.length; i++) {
    const b = buf[at + i] as number;
    value += (b & 0x7f) * 2 ** shift;
    if ((b & 0x80) === 0) return [value, at + i + 1];
    shift += 7;
  }
  return undefined;
}

function readPointer(buf: Uint8Array, at: number, size: number, bigEndian: boolean): bigint | undefined {
  if (at + size > buf.length) return undefined;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return size === 8 ? view.getBigUint64(at, !bigEndian) : BigInt(view.getUint32(at, !bigEndian));
}

function decode(buf: Uint8Array, header: number, view: BinaryView | undefined): [Buffer, Buffer] | undefined {
  const ptrSize = buf[header + 14] ?? 0;
  const flags = buf[header + 15] ?? 0;
  if ((flags & ~3) !== 0) return undefined;
  if (flags & 2) {
    const strings: Buffer[] = [];
    let at = header + 32;
    for (let i = 0; i < 2; i++) {
      const length = uvarint(buf, at);
      if (!length || length[0] > 1 << 20 || length[1] + length[0] > buf.length) return undefined;
      strings.push(Buffer.from(buf.subarray(length[1], length[1] + length[0])));
      at = length[1] + length[0];
    }
    return [strings[0] as Buffer, strings[1] as Buffer];
  }
  if ((ptrSize !== 4 && ptrSize !== 8) || !view) return undefined;
  const bigEndian = (flags & 1) === 1;
  const readGoString = (pointerAt: number): Buffer | undefined => {
    const headerVa = readPointer(buf, pointerAt, ptrSize, bigEndian);
    const headerOff = headerVa === undefined ? undefined : view.vaToOffset(headerVa);
    if (headerOff === undefined) return undefined;
    const dataVa = readPointer(buf, headerOff, ptrSize, bigEndian);
    const length = readPointer(buf, headerOff + ptrSize, ptrSize, bigEndian);
    const dataOff = dataVa === undefined ? undefined : view.vaToOffset(dataVa);
    if (dataOff === undefined || length === undefined || length > 1n << 20n) return undefined;
    return Buffer.from(buf.subarray(dataOff, dataOff + Number(length)));
  };
  const version = readGoString(header + 16);
  const mod = readGoString(header + 16 + ptrSize);
  return version === undefined || mod === undefined ? undefined : [version, mod];
}

/** Strips the 16-byte sentinels around the module info, as `go version -m` does. */
function stripSentinels(raw: Buffer): string {
  if (raw.length >= 33 && raw.subarray(0, 16).equals(MOD_START) && raw.subarray(raw.length - 16).equals(MOD_END)) {
    return raw.subarray(16, raw.length - 16).toString("utf8");
  }
  return raw.toString("utf8");
}

export function parseModInfo(text: string): Omit<GoBuildInfo, "offset" | "goVersion"> {
  const result: Omit<GoBuildInfo, "offset" | "goVersion"> = { deps: [], settings: [] };
  let last: GoModule | undefined;
  for (const line of text.split("\n")) {
    const [kind, ...rest] = line.split("\t");
    if (kind === "path") result.path = rest[0];
    else if (kind === "mod" || kind === "dep") {
      const module: GoModule = { path: rest[0] ?? "", version: rest[1] ?? "", sum: rest[2] };
      if (kind === "mod") result.main = module;
      else result.deps.push(module);
      last = module;
    } else if (kind === "=>" && last) last.replace = { path: rest[0] ?? "", version: rest[1] ?? "" };
    else if (kind === "build") {
      const setting = rest.join("\t");
      const eq = setting.indexOf("=");
      result.settings.push(eq < 0 ? [setting, ""] : [setting.slice(0, eq), setting.slice(eq + 1)]);
    }
  }
  return result;
}

export function readGoBuildInfo(buf: Uint8Array, view: BinaryView | undefined): GoBuildInfo | undefined {
  const data = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let at = data.indexOf(MAGIC); at >= 0; at = data.indexOf(MAGIC, at + 1)) {
    const decoded = decode(buf, at, view);
    if (!decoded) continue;
    const goVersion = decoded[0].toString("utf8");
    const mod = decoded[1];
    if (!goVersion.startsWith("go") && !goVersion.startsWith("devel")) continue;
    return { offset: at, goVersion, ...parseModInfo(stripSentinels(mod)) };
  }
  return undefined;
}
