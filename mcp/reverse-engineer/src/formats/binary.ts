/** One view over PE, ELF and Mach-O: sections, libraries, imports, exports and address mapping. */
import { elfMachineName, elfTypeName, parseElfHeader } from "./elf";
import { machoCpuName, parseMachoHeader } from "./macho";
import { parsePe, peExports, peImports, peMachineName, peResources, peSubsystemName } from "./pe";

export interface Section {
  name: string;
  va: bigint;
  size: number;
  offset: number;
  fileSize: number;
}

export interface ImportGroup {
  library: string;
  names: string[];
}

export interface BinaryView {
  format: string;
  /** Slice offset inside a universal Mach-O; 0 otherwise. */
  base: number;
  sections: Section[];
  libraries: string[];
  imports: ImportGroup[];
  exports: string[];
  notes: string[];
  resources?: { type: string; name: string; size: number; offset: number }[];
  vaToOffset(va: bigint): number | undefined;
  offsetToVa(offset: number): bigint | undefined;
}

function sectionMapper(sections: Section[], base: number) {
  return {
    vaToOffset(va: bigint): number | undefined {
      for (const s of sections) {
        if (va >= s.va && va < s.va + BigInt(s.size)) {
          const delta = Number(va - s.va);
          return delta < s.fileSize ? base + s.offset + delta : undefined;
        }
      }
      return undefined;
    },
    offsetToVa(offset: number): bigint | undefined {
      const local = offset - base;
      for (const s of sections) {
        if (s.fileSize > 0 && local >= s.offset && local < s.offset + s.fileSize)
          return s.va + BigInt(local - s.offset);
      }
      return undefined;
    },
  };
}

// Caps that keep hostile headers (huge counts, overlapping tables) from turning a parse into a hang.
const MAX_SYMBOLS = 500000;
const MAX_DYNAMIC_ENTRIES = 65536;
const MAX_LOAD_COMMANDS = 65536;
const MAX_SECTIONS = 65536;

const cstr = (buf: Uint8Array, at: number, max = 4096): string => {
  let end = at;
  while (end < buf.length && end - at < max && buf[end] !== 0) end++;
  return Buffer.from(buf.subarray(at, end)).toString("latin1");
};

function loadPe(buf: Uint8Array): BinaryView | undefined {
  const image = parsePe(buf);
  if (!image) return undefined;
  const sections: Section[] = image.sections.map((s) => ({
    name: s.name,
    va: image.imageBase + BigInt(s.virtualAddress),
    size: Math.max(s.virtualSize, s.rawSize),
    offset: s.rawOffset,
    fileSize: s.rawSize,
  }));
  const imports = peImports(buf, image).map((i) => ({
    library: i.delayed ? `${i.library} (delay-load)` : i.library,
    names: i.names,
  }));
  const { dllName, exports } = peExports(buf, image);
  const notes = [
    `image base 0x${image.imageBase.toString(16)}, entry rva 0x${image.entryRva.toString(16)}, built ${new Date(image.timestamp * 1000).toISOString().slice(0, 10)} (link timestamp, may be a hash)`,
  ];
  if (dllName) notes.push(`export name ${dllName}`);
  const resources = peResources(buf, image).map((r) => ({
    type: r.type,
    name: r.name,
    size: r.size,
    offset: r.offset,
  }));
  return {
    format: `PE${image.is64 ? "32+" : "32"} ${peMachineName(image.machine)} ${peSubsystemName(image.subsystem)} ${image.isDll ? "DLL" : "executable"}`,
    base: 0,
    sections,
    libraries: imports.map((i) => i.library),
    imports,
    exports: exports.map((e) =>
      e.name
        ? `${e.name}${e.forwarder ? ` -> ${e.forwarder}` : ""}`
        : `#${e.ordinal}${e.forwarder ? ` -> ${e.forwarder}` : ""}`,
    ),
    notes,
    resources,
    ...sectionMapper(sections, 0),
  };
}

function loadElf(buf: Uint8Array): BinaryView | undefined {
  const header = parseElfHeader(buf);
  if (!header) return undefined;
  const le = header.littleEndian;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const u16 = (at: number) => view.getUint16(at, le);
  const u32 = (at: number) => view.getUint32(at, le);
  const word = (at: number) => (header.is64 ? view.getBigUint64(at, le) : BigInt(view.getUint32(at, le)));
  const shoff = Number(word(header.is64 ? 0x28 : 0x20));
  const shentsize = u16(header.is64 ? 0x3a : 0x2e);
  const shnum = u16(header.is64 ? 0x3c : 0x30);
  const shstrndx = u16(header.is64 ? 0x3e : 0x32);
  interface Raw {
    nameOff: number;
    type: number;
    flags: number;
    addr: bigint;
    offset: number;
    size: number;
    link: number;
    entsize: number;
  }
  const raws: Raw[] = [];
  // An entry size too small for a section header leaves the sections unread rather than read past the file.
  const headerSize = header.is64 ? 64 : 40;
  for (let i = 0; i < shnum && shentsize >= headerSize && shoff + i * shentsize + headerSize <= buf.length; i++) {
    const at = shoff + i * shentsize;
    raws.push(
      header.is64
        ? {
            nameOff: u32(at),
            type: u32(at + 4),
            flags: Number(word(at + 8) & 0xffffffffn),
            addr: word(at + 16),
            offset: Number(word(at + 24)),
            size: Number(word(at + 32)),
            link: u32(at + 40),
            entsize: Number(word(at + 56)),
          }
        : {
            nameOff: u32(at),
            type: u32(at + 4),
            flags: u32(at + 8),
            addr: word(at + 12),
            offset: u32(at + 16),
            size: u32(at + 20),
            link: u32(at + 24),
            entsize: u32(at + 36),
          },
    );
  }
  const strtab = raws[shstrndx];
  const sections: Section[] = raws.map((r) => ({
    name: strtab ? cstr(buf, strtab.offset + r.nameOff, 256) : "",
    va: r.addr,
    size: r.size,
    offset: r.offset,
    fileSize: r.type === 8 ? 0 : r.size, // SHT_NOBITS
  }));
  // Only SHF_ALLOC sections are loaded: the others (.symtab, .comment, .debug_*) sit at address 0.
  const mapped = sections.filter((_, i) => ((raws[i] as Raw).flags & 0x2) !== 0);
  const libraries: string[] = [];
  const notes: string[] = [`type ${elfTypeName(header.type)}, entry 0x${header.entry.toString(16)}`];
  const imports: string[] = [];
  const exports: string[] = [];
  // The loader uses one dynamic section and one dynamic symbol table; extra copies are not walked.
  const dynamic = raws.find((r) => r.type === 6); // SHT_DYNAMIC
  const dynamicStrings = dynamic && raws[dynamic.link];
  if (dynamic && dynamicStrings) {
    const entry = header.is64 ? 16 : 8;
    const end = Math.min(dynamic.offset + dynamic.size, buf.length);
    for (let at = dynamic.offset, n = 0; at + entry <= end && n < MAX_DYNAMIC_ENTRIES; at += entry, n++) {
      const tag = Number(word(at));
      const value = Number(word(at + (header.is64 ? 8 : 4)));
      if (tag === 0) break;
      const text = () => cstr(buf, dynamicStrings.offset + value, 1024);
      if (tag === 1) libraries.push(text());
      else if (tag === 14) notes.push(`soname ${text()}`);
      else if (tag === 15 || tag === 29) notes.push(`${tag === 15 ? "rpath" : "runpath"} ${text()}`);
    }
  }
  // SHT_DYNSYM, or SHT_SYMTAB when the binary has no dynamic symbols.
  const symbols = raws.find((r) => r.type === 11) ?? raws.find((r) => r.type === 2);
  const symbolStrings = symbols && raws[symbols.link];
  if (symbols && symbolStrings) {
    const minimum = header.is64 ? 24 : 16;
    const entry = Math.max(symbols.entsize, minimum);
    const end = Math.min(symbols.offset + symbols.size, buf.length);
    for (let at = symbols.offset + entry, n = 0; at + entry <= end && n < MAX_SYMBOLS; at += entry, n++) {
      const nameOff = u32(at);
      const info = header.is64 ? (buf[at + 4] ?? 0) : (buf[at + 12] ?? 0);
      const shndx = header.is64 ? u16(at + 6) : u16(at + 14);
      const bind = info >> 4;
      const type = info & 0xf;
      if (nameOff === 0 || type === 4 || type === 3) continue; // FILE, SECTION
      const name = cstr(buf, symbolStrings.offset + nameOff, 1024);
      if (shndx === 0) imports.push(name);
      else if (bind === 1 || bind === 2) exports.push(name);
    }
  }
  return {
    format: `ELF${header.is64 ? "64" : "32"} ${le ? "LE" : "BE"} ${elfMachineName(header.machine)}`,
    base: 0,
    sections: sections.filter((s) => s.name !== ""),
    libraries,
    imports: imports.length > 0 ? [{ library: "(dynamic, any NEEDED library)", names: imports }] : [],
    exports,
    notes,
    ...sectionMapper(mapped, 0),
  };
}

const LC = {
  segment: 0x1,
  symtab: 0x2,
  loadDylib: 0xc,
  idDylib: 0xd,
  segment64: 0x19,
  uuid: 0x1b,
  lazyLoad: 0x20,
  buildVersion: 0x32,
  loadWeak: 0x80000018,
  rpath: 0x8000001c,
  reexport: 0x8000001f,
  loadUpward: 0x80000023,
} as const;

const PLATFORMS: Record<number, string> = {
  1: "macOS",
  2: "iOS",
  3: "tvOS",
  4: "watchOS",
  6: "Mac Catalyst",
  11: "visionOS",
};

function loadMacho(file: Uint8Array): BinaryView | undefined {
  const head = parseMachoHeader(file);
  if (!head) return undefined;
  let base = 0;
  let buf = file;
  let universal = "";
  if (head.fat) {
    // Slices whose header lies outside the file are skipped.
    const slices = head.slices.filter((s) => s.offset + 32 <= file.length && s.size >= 32);
    const slice = slices.find((s) => s.cpu === "arm64") ?? slices[0];
    if (!slice) return undefined;
    base = slice.offset;
    buf = file.subarray(slice.offset, slice.offset + slice.size);
    universal = ` (slice ${slice.cpu} of universal ${head.cpu})`;
  }
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = view.getUint32(0, false);
  const le = magic === 0xcffaedfe || magic === 0xcefaedfe;
  const is64 = magic === 0xcffaedfe || magic === 0xfeedfacf;
  const u32 = (at: number) => view.getUint32(at, le);
  const u64 = (at: number) => view.getBigUint64(at, le);
  const cpu = machoCpuName(u32(4));
  const ncmds = u32(16);
  const sections: Section[] = [];
  const libraries: string[] = [];
  const notes: string[] = [];
  let symtab: { symoff: number; nsyms: number; stroff: number } | undefined;
  let at = is64 ? 32 : 28;
  for (let i = 0; i < ncmds && i < MAX_LOAD_COMMANDS && at + 8 <= buf.length; i++) {
    const cmd = u32(at);
    const size = u32(at + 4);
    // Every field read below lies inside the command, so a command must fit in the file.
    if (size < 8 || at + size > buf.length) break;
    const holds = (bytes: number) => size >= bytes;
    if ((cmd === LC.segment64 || cmd === LC.segment) && holds(is64 ? 72 : 56)) {
      // nsects is only trusted as far as cmdsize has room for the section headers.
      const header = is64 ? 72 : 56;
      const entry = is64 ? 80 : 68;
      const nsects = Math.min(u32(at + (is64 ? 64 : 48)), Math.floor((size - header) / entry));
      let s = at + header;
      for (let k = 0; k < nsects && sections.length < MAX_SECTIONS; k++, s += entry) {
        const sect = cstr(buf, s, 16);
        const seg = cstr(buf, s + 16, 16);
        const size64 = is64 ? Number(u64(s + 40)) : u32(s + 36);
        const offset = u32(s + (is64 ? 48 : 40));
        const type = u32(s + (is64 ? 64 : 56)) & 0xff;
        sections.push({
          name: `${seg},${sect}`,
          va: is64 ? u64(s + 32) : BigInt(u32(s + 32)),
          size: size64,
          offset,
          fileSize: type === 1 || type === 12 ? 0 : size64, // S_ZEROFILL, S_GB_ZEROFILL
        });
      }
    } else if (
      [LC.loadDylib, LC.loadWeak, LC.reexport, LC.lazyLoad, LC.loadUpward].includes(cmd as never) &&
      holds(12)
    ) {
      const name = cstr(buf, at + u32(at + 8), 1024);
      libraries.push(cmd === LC.loadWeak ? `${name} (weak)` : cmd === LC.reexport ? `${name} (re-export)` : name);
    } else if (cmd === LC.idDylib && holds(12)) notes.push(`install name ${cstr(buf, at + u32(at + 8), 1024)}`);
    else if (cmd === LC.rpath && holds(12)) notes.push(`rpath ${cstr(buf, at + u32(at + 8), 1024)}`);
    else if (cmd === LC.uuid && holds(24))
      notes.push(`uuid ${Buffer.from(buf.subarray(at + 8, at + 24)).toString("hex")}`);
    else if (cmd === LC.buildVersion && holds(20)) {
      const v = (x: number) => `${x >>> 16}.${(x >> 8) & 0xff}`;
      notes.push(`platform ${PLATFORMS[u32(at + 8)] ?? u32(at + 8)} min ${v(u32(at + 12))} sdk ${v(u32(at + 16))}`);
    } else if (cmd === LC.symtab && holds(20))
      symtab = { symoff: u32(at + 8), nsyms: u32(at + 12), stroff: u32(at + 16) };
    at += size;
  }
  const imports: string[] = [];
  const exports: string[] = [];
  if (symtab) {
    const entry = is64 ? 16 : 12;
    for (let k = 0; k < symtab.nsyms && k < MAX_SYMBOLS; k++) {
      const s = symtab.symoff + k * entry;
      if (s + entry > buf.length) break;
      const type = buf[s + 4] ?? 0;
      if (type & 0xe0) continue; // debugging (stab) entries
      if ((type & 0x01) === 0) continue; // not external
      const name = cstr(buf, symtab.stroff + u32(s), 1024);
      if ((type & 0x0e) === 0) imports.push(name);
      else exports.push(name);
    }
  }
  return {
    format: `Mach-O ${is64 ? "64" : "32"} ${cpu} ${head.fat ? "" : head.fileType}${universal}`
      .replace(/\s+/g, " ")
      .trim(),
    base,
    sections,
    libraries,
    imports: imports.length > 0 ? [{ library: "(two-level namespace: see libraries)", names: imports }] : [],
    exports,
    notes,
    ...sectionMapper(sections, base),
  };
}

export function loadBinary(buf: Uint8Array): BinaryView | undefined {
  return loadPe(buf) ?? loadElf(buf) ?? loadMacho(buf);
}
