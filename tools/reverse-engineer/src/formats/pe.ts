/** Minimal pure-TypeScript PE/COFF reader: headers, sections, data directories, resources. */

export interface PeSection {
  name: string;
  virtualAddress: number;
  virtualSize: number;
  rawOffset: number;
  rawSize: number;
  characteristics: number;
}

export interface PeDirectory {
  rva: number;
  size: number;
}

export interface PeImage {
  machine: number;
  is64: boolean;
  isDll: boolean;
  timestamp: number;
  subsystem: number;
  entryRva: number;
  imageBase: bigint;
  sections: PeSection[];
  directories: PeDirectory[];
}

export const PE_DIR = { export: 0, import: 1, resource: 2, delayImport: 13, clr: 14 } as const;

const MACHINES: Record<number, string> = {
  0x14c: "x86",
  0x8664: "x86-64",
  0xaa64: "arm64",
  0x1c4: "arm",
  0xa641: "arm64ec",
};

const SUBSYSTEMS: Record<number, string> = { 1: "native", 2: "gui", 3: "console", 9: "wince", 10: "efi" };

export function peMachineName(machine: number): string {
  return MACHINES[machine] ?? `machine 0x${machine.toString(16)}`;
}

export function peSubsystemName(subsystem: number): string {
  return SUBSYSTEMS[subsystem] ?? `subsystem ${subsystem}`;
}

/** Offset of the PE signature, or -1 when the buffer is not a PE image. */
export function peHeaderOffset(buf: Uint8Array): number {
  if (buf.length < 0x40 || buf[0] !== 0x4d || buf[1] !== 0x5a) return -1;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const offset = view.getUint32(0x3c, true);
  if (offset + 24 > buf.length) return -1;
  return view.getUint32(offset, true) === 0x00004550 ? offset : -1;
}

export function parsePe(buf: Uint8Array): PeImage | undefined {
  const pe = peHeaderOffset(buf);
  if (pe < 0) return undefined;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const coff = pe + 4;
  const machine = view.getUint16(coff, true);
  const sectionCount = view.getUint16(coff + 2, true);
  const timestamp = view.getUint32(coff + 4, true);
  const optionalSize = view.getUint16(coff + 16, true);
  const characteristics = view.getUint16(coff + 18, true);
  const opt = coff + 20;
  if (opt + optionalSize > buf.length || optionalSize < 0x60) return undefined;
  const magic = view.getUint16(opt, true);
  const is64 = magic === 0x20b;
  const entryRva = view.getUint32(opt + 16, true);
  const imageBase = is64 ? view.getBigUint64(opt + 24, true) : BigInt(view.getUint32(opt + 28, true));
  const subsystem = view.getUint16(opt + 68, true);
  const dirCountOffset = opt + (is64 ? 108 : 92);
  // A short optional header has no room for the directory count: keep the image, without directories.
  const dirCount = dirCountOffset + 4 <= opt + optionalSize ? Math.min(view.getUint32(dirCountOffset, true), 16) : 0;
  const directories: PeDirectory[] = [];
  for (let i = 0; i < dirCount; i++) {
    const at = dirCountOffset + 4 + i * 8;
    if (at + 8 > opt + optionalSize) break;
    directories.push({ rva: view.getUint32(at, true), size: view.getUint32(at + 4, true) });
  }
  const sections: PeSection[] = [];
  const table = opt + optionalSize;
  // Real images have a few dozen sections; the cap bounds every RVA lookup, which scans them all.
  for (let i = 0; i < Math.min(sectionCount, 1024); i++) {
    const at = table + i * 40;
    if (at + 40 > buf.length) break;
    const rawName = Buffer.from(buf.subarray(at, at + 8)).toString("latin1");
    sections.push({
      name: rawName.replace(/\0+$/, ""),
      virtualSize: view.getUint32(at + 8, true),
      virtualAddress: view.getUint32(at + 12, true),
      rawSize: view.getUint32(at + 16, true),
      rawOffset: view.getUint32(at + 20, true),
      characteristics: view.getUint32(at + 36, true),
    });
  }
  return {
    machine,
    is64,
    isDll: (characteristics & 0x2000) !== 0,
    timestamp,
    subsystem,
    entryRva,
    imageBase,
    sections,
    directories,
  };
}

export function peRvaToOffset(image: PeImage, rva: number): number | undefined {
  for (const s of image.sections) {
    const span = Math.max(s.virtualSize, s.rawSize);
    if (rva >= s.virtualAddress && rva < s.virtualAddress + span) {
      const delta = rva - s.virtualAddress;
      return delta < s.rawSize ? s.rawOffset + delta : undefined;
    }
  }
  return undefined;
}

export interface PeResource {
  type: string;
  name: string;
  lang: number;
  offset: number;
  size: number;
}

const RESOURCE_TYPES: Record<number, string> = {
  1: "CURSOR",
  2: "BITMAP",
  3: "ICON",
  4: "MENU",
  5: "DIALOG",
  6: "STRING",
  9: "ACCELERATOR",
  10: "RCDATA",
  12: "GROUP_CURSOR",
  14: "GROUP_ICON",
  16: "VERSION",
  24: "MANIFEST",
};

const MAX_RESOURCES = 10000;
const MAX_RESOURCE_ENTRIES = 100000;

/**
 * Flattens the three-level resource tree (type / name / language). Each table is visited once and the walk is
 * capped, so entries pointing back to an earlier table cannot make it loop.
 */
export function peResources(buf: Uint8Array, image: PeImage): PeResource[] {
  const dir = image.directories[PE_DIR.resource];
  if (!dir || dir.rva === 0) return [];
  const base = peRvaToOffset(image, dir.rva);
  if (base === undefined) return [];
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out: PeResource[] = [];
  const label = (raw: number, level: number): string => {
    if (raw & 0x80000000) {
      const at = base + (raw & 0x7fffffff);
      if (at + 2 > buf.length) return "?";
      const len = view.getUint16(at, true);
      return Buffer.from(buf.subarray(at + 2, at + 2 + len * 2)).toString("utf16le");
    }
    return level === 0 ? (RESOURCE_TYPES[raw] ?? String(raw)) : String(raw);
  };
  const visited = new Set<number>();
  let entries = 0;
  const visit = (tableOffset: number, level: number, path: string[]): void => {
    const at = base + tableOffset;
    if (at + 16 > buf.length || level > 2 || visited.has(tableOffset)) return;
    visited.add(tableOffset);
    const count = view.getUint16(at + 12, true) + view.getUint16(at + 14, true);
    for (let i = 0; i < count && i < 4096; i++) {
      if (out.length >= MAX_RESOURCES || ++entries > MAX_RESOURCE_ENTRIES) return;
      const entry = at + 16 + i * 8;
      if (entry + 8 > buf.length) return;
      const nameField = view.getUint32(entry, true);
      const target = view.getUint32(entry + 4, true);
      const here = [...path, label(nameField, level)];
      if (target & 0x80000000) {
        visit(target & 0x7fffffff, level + 1, here);
      } else {
        const leaf = base + target;
        if (leaf + 16 > buf.length) continue;
        const offset = peRvaToOffset(image, view.getUint32(leaf, true));
        if (offset === undefined) continue;
        out.push({
          type: here[0] ?? "?",
          name: here[1] ?? "?",
          lang: Number(here[2] ?? 0),
          offset,
          size: view.getUint32(leaf + 4, true),
        });
      }
    }
  };
  visit(0, 0, []);
  return out;
}

export interface PeImport {
  library: string;
  delayed: boolean;
  names: string[];
}

function cString(buf: Uint8Array, offset: number, max = 512): string {
  let end = offset;
  while (end < buf.length && end - offset < max && buf[end] !== 0) end++;
  return Buffer.from(buf.subarray(offset, end)).toString("latin1");
}

// The Windows loader reads descriptors up to the null entry and ignores the directory size, so only a cap bounds them.
const MAX_DESCRIPTORS = 4096;
const MAX_THUNKS = 20000;
const MAX_IMPORT_NAMES = 100000;

/**
 * Import and delay-import tables: library names and imported symbols (or #ordinal). Descriptor and name counts
 * are capped, so descriptors sharing one long thunk array cannot exhaust memory.
 */
export function peImports(buf: Uint8Array, image: PeImage): PeImport[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out: PeImport[] = [];
  let total = 0;
  const readThunks = (rva: number, imageBaseRelative: boolean): string[] => {
    const names: string[] = [];
    let at = peRvaToOffset(image, rva);
    const step = image.is64 ? 8 : 4;
    while (at !== undefined && at + step <= buf.length && names.length < MAX_THUNKS && total < MAX_IMPORT_NAMES) {
      const raw = image.is64 ? view.getBigUint64(at, true) : BigInt(view.getUint32(at, true));
      if (raw === 0n) break;
      const ordinalFlag = image.is64 ? 1n << 63n : 1n << 31n;
      if (raw & ordinalFlag) names.push(`#${Number(raw & 0xffffn)}`);
      else {
        let hintRva = Number(raw & 0x7fffffffn);
        if (imageBaseRelative) hintRva = Number(raw - image.imageBase);
        const hint = peRvaToOffset(image, hintRva);
        names.push(hint === undefined ? "?" : cString(buf, hint + 2));
      }
      total++;
      at += step;
    }
    return names;
  };
  const imports = image.directories[PE_DIR.import];
  if (imports && imports.rva !== 0) {
    let at = peRvaToOffset(image, imports.rva);
    const limit = MAX_DESCRIPTORS;
    for (let i = 0; i < limit && at !== undefined && at + 20 <= buf.length && total < MAX_IMPORT_NAMES; i++) {
      const lookup = view.getUint32(at, true);
      const nameRva = view.getUint32(at + 12, true);
      const iat = view.getUint32(at + 16, true);
      if (nameRva === 0 && iat === 0) break;
      const nameAt = peRvaToOffset(image, nameRva);
      out.push({
        library: nameAt === undefined ? "?" : cString(buf, nameAt),
        delayed: false,
        names: readThunks(lookup || iat, false),
      });
      at += 20;
    }
  }
  const delay = image.directories[PE_DIR.delayImport];
  if (delay && delay.rva !== 0) {
    let at = peRvaToOffset(image, delay.rva);
    const limit = MAX_DESCRIPTORS;
    for (let i = 0; i < limit && at !== undefined && at + 32 <= buf.length && total < MAX_IMPORT_NAMES; i++) {
      const attributes = view.getUint32(at, true);
      const vaBased = (attributes & 1) === 0;
      const toRva = (value: number): number => (vaBased ? Number(BigInt(value) - image.imageBase) : value);
      const nameRva = view.getUint32(at + 4, true);
      const intRva = view.getUint32(at + 16, true);
      if (nameRva === 0) break;
      const nameAt = peRvaToOffset(image, toRva(nameRva));
      out.push({
        library: nameAt === undefined ? "?" : cString(buf, nameAt),
        delayed: true,
        names: readThunks(toRva(intRva), vaBased),
      });
      at += 32;
    }
  }
  return out;
}

export interface PeExport {
  name: string;
  ordinal: number;
  rva: number;
  forwarder?: string;
}

export function peExports(buf: Uint8Array, image: PeImage): { dllName: string; exports: PeExport[] } {
  const dir = image.directories[PE_DIR.export];
  if (!dir || dir.rva === 0) return { dllName: "", exports: [] };
  const at = peRvaToOffset(image, dir.rva);
  if (at === undefined || at + 40 > buf.length) return { dllName: "", exports: [] };
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const nameAt = peRvaToOffset(image, view.getUint32(at + 12, true));
  const base = view.getUint32(at + 16, true);
  const functionCount = Math.min(view.getUint32(at + 20, true), 65536);
  const nameCount = Math.min(view.getUint32(at + 24, true), 65536);
  const functions = peRvaToOffset(image, view.getUint32(at + 28, true));
  const names = peRvaToOffset(image, view.getUint32(at + 32, true));
  const ordinals = peRvaToOffset(image, view.getUint32(at + 36, true));
  if (functions === undefined) return { dllName: "", exports: [] };
  const named = new Map<number, string>();
  if (names !== undefined && ordinals !== undefined) {
    // Tables that run past the end of the file are read up to it.
    for (let i = 0; i < nameCount && names + i * 4 + 4 <= buf.length && ordinals + i * 2 + 2 <= buf.length; i++) {
      const nameRva = view.getUint32(names + i * 4, true);
      const index = view.getUint16(ordinals + i * 2, true);
      const off = peRvaToOffset(image, nameRva);
      if (off !== undefined) named.set(index, cString(buf, off));
    }
  }
  const exports: PeExport[] = [];
  for (let i = 0; i < functionCount && functions + i * 4 + 4 <= buf.length; i++) {
    const rva = view.getUint32(functions + i * 4, true);
    if (rva === 0) continue;
    const entry: PeExport = { name: named.get(i) ?? "", ordinal: base + i, rva };
    if (rva >= dir.rva && rva < dir.rva + dir.size) {
      const off = peRvaToOffset(image, rva);
      if (off !== undefined) entry.forwarder = cString(buf, off);
    }
    exports.push(entry);
  }
  return { dllName: nameAt === undefined ? "" : cString(buf, nameAt), exports };
}

/** File offset to RVA, for citing code and data locations. */
export function peOffsetToRva(image: PeImage, offset: number): number | undefined {
  for (const s of image.sections) {
    if (offset >= s.rawOffset && offset < s.rawOffset + s.rawSize) return s.virtualAddress + (offset - s.rawOffset);
  }
  return undefined;
}
