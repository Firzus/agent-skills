import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function tempDir(prefix = "re-test-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** Points the tool cache at a fresh temporary directory. */
export function isolateCache(): string {
  const dir = tempDir("re-cache-");
  process.env.REVERSE_ENGINEER_CACHE = dir;
  return dir;
}

export function writeTree(root: string, files: Record<string, string | Uint8Array>): void {
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, ...rel.split("/"));
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }
}

interface AsarFile {
  content: string | Uint8Array;
  unpacked?: boolean;
  /** Declared hash override, to simulate a file changed after packaging. */
  declaredHash?: string;
}

/** Builds an asar archive the way @electron/asar lays it out. */
export function buildAsar(path: string, files: Record<string, AsarFile>): string {
  const root: { files: Record<string, unknown> } = { files: {} };
  const chunks: Buffer[] = [];
  let offset = 0;
  for (const [rel, file] of Object.entries(files)) {
    const data = Buffer.from(file.content);
    const parts = rel.split("/");
    let node = root;
    for (const dir of parts.slice(0, -1)) {
      node.files[dir] ??= { files: {} };
      node = node.files[dir] as typeof root;
    }
    const hash = file.declaredHash ?? createHash("sha256").update(data).digest("hex");
    const entry: Record<string, unknown> = {
      size: data.length,
      integrity: { algorithm: "SHA256", hash, blockSize: 4194304, blocks: [hash] },
    };
    if (file.unpacked) entry.unpacked = true;
    else {
      entry.offset = String(offset);
      chunks.push(data);
      offset += data.length;
    }
    node.files[parts[parts.length - 1] as string] = entry;
  }
  const json = Buffer.from(JSON.stringify(root));
  const padded = Math.ceil(json.length / 4) * 4;
  const header = Buffer.alloc(16 + padded);
  header.writeUInt32LE(4, 0);
  header.writeUInt32LE(8 + padded, 4);
  header.writeUInt32LE(4 + padded, 8);
  header.writeUInt32LE(json.length, 12);
  json.copy(header, 16);
  writeFileSync(path, Buffer.concat([header, ...chunks]));
  return createHash("sha256").update(json).digest("hex");
}

/** A minimal PE32+ image: DOS stub, PE header, optional header and one section. */
export function buildPe(options: { dll?: boolean; clr?: boolean; machine?: number } = {}): Buffer {
  const buf = Buffer.alloc(0x400);
  buf.write("MZ", 0, "latin1");
  buf.writeUInt32LE(0x80, 0x3c);
  buf.writeUInt32LE(0x00004550, 0x80);
  const coff = 0x84;
  buf.writeUInt16LE(options.machine ?? 0x8664, coff);
  buf.writeUInt16LE(1, coff + 2);
  buf.writeUInt16LE(0xf0, coff + 16);
  buf.writeUInt16LE(options.dll ? 0x2022 : 0x0022, coff + 18);
  const opt = coff + 20;
  buf.writeUInt16LE(0x20b, opt);
  buf.writeBigUInt64LE(0x140000000n, opt + 24);
  buf.writeUInt16LE(3, opt + 68);
  buf.writeUInt32LE(16, opt + 108);
  if (options.clr) {
    buf.writeUInt32LE(0x2000, opt + 112 + 14 * 8);
    buf.writeUInt32LE(0x48, opt + 112 + 14 * 8 + 4);
  }
  const section = opt + 0xf0;
  buf.write(".text", section, "latin1");
  buf.writeUInt32LE(0x100, section + 8);
  buf.writeUInt32LE(0x1000, section + 12);
  buf.writeUInt32LE(0x100, section + 16);
  buf.writeUInt32LE(0x200, section + 20);
  return buf;
}

/** A stored (uncompressed) ZIP holding the given names, enough for central-directory listing. */
export function buildZip(names: string[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const name of names) {
    const raw = Buffer.from(name);
    const local = Buffer.alloc(30 + raw.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(raw.length, 26);
    raw.copy(local, 30);
    const central = Buffer.alloc(46 + raw.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(raw.length, 28);
    central.writeUInt32LE(offset, 42);
    raw.copy(central, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/** A little-endian ELF64 shared object with DT_NEEDED, DT_SONAME and a dynamic symbol table. */
export function buildElf(): Buffer {
  const dynstr = Buffer.from("\0libc.so.6\0libdemo.so\0puts\0demo_api\0");
  const strOff = (s: string) => dynstr.indexOf(Buffer.from(`\0${s}\0`)) + 1;
  const sym = (name: number, info: number, shndx: number) => {
    const b = Buffer.alloc(24);
    b.writeUInt32LE(name, 0);
    b.writeUInt8(info, 4);
    b.writeUInt16LE(shndx, 6);
    return b;
  };
  const dynsym = Buffer.concat([
    Buffer.alloc(24),
    sym(strOff("puts"), 0x12, 0), // GLOBAL FUNC, undefined: import
    sym(strOff("demo_api"), 0x12, 5), // GLOBAL FUNC in section 5: export
  ]);
  const dyn = (tag: number, value: number) => {
    const b = Buffer.alloc(16);
    b.writeBigUInt64LE(BigInt(tag), 0);
    b.writeBigUInt64LE(BigInt(value), 8);
    return b;
  };
  const dynamic = Buffer.concat([dyn(1, strOff("libc.so.6")), dyn(14, strOff("libdemo.so")), dyn(0, 0)]);
  const shstr = Buffer.from("\0.dynstr\0.dynsym\0.dynamic\0.shstrtab\0.text\0");
  const name = (s: string) => shstr.indexOf(Buffer.from(`\0${s}\0`)) + 1;
  const parts = [dynstr, dynsym, dynamic, shstr];
  let offset = 64;
  const offsets = parts.map((p) => {
    const at = offset;
    offset += p.length;
    return at;
  });
  const shoff = offset;
  const sh = (n: number, type: number, off: number, size: number, link: number, entsize: number) => {
    const b = Buffer.alloc(64);
    b.writeUInt32LE(n, 0);
    b.writeUInt32LE(type, 4);
    b.writeBigUInt64LE(BigInt(off), 24);
    b.writeBigUInt64LE(BigInt(size), 32);
    b.writeUInt32LE(link, 40);
    b.writeBigUInt64LE(BigInt(entsize), 56);
    return b;
  };
  const headers = Buffer.concat([
    Buffer.alloc(64),
    sh(name(".dynstr"), 3, offsets[0] as number, dynstr.length, 0, 0),
    sh(name(".dynsym"), 11, offsets[1] as number, dynsym.length, 1, 24),
    sh(name(".dynamic"), 6, offsets[2] as number, dynamic.length, 1, 16),
    sh(name(".shstrtab"), 3, offsets[3] as number, shstr.length, 0, 0),
    sh(name(".text"), 1, 0, 0, 0, 0),
  ]);
  const header = Buffer.alloc(64);
  header.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1]);
  header.writeUInt16LE(3, 16);
  header.writeUInt16LE(62, 18);
  header.writeBigUInt64LE(BigInt(shoff), 0x28);
  header.writeUInt16LE(64, 0x3a);
  header.writeUInt16LE(6, 0x3c);
  header.writeUInt16LE(4, 0x3e);
  return Buffer.concat([header, ...parts, headers]);
}

/** A thin arm64 Mach-O dylib with one section, one dependent library and two external symbols. */
export function buildMacho(): Buffer {
  const cmds: Buffer[] = [];
  const segment = Buffer.alloc(72 + 80);
  segment.writeUInt32LE(0x19, 0);
  segment.writeUInt32LE(segment.length, 4);
  segment.write("__TEXT", 8, "latin1");
  segment.writeUInt32LE(1, 64);
  segment.write("__text", 72, "latin1");
  segment.write("__TEXT", 88, "latin1");
  segment.writeBigUInt64LE(0x1000n, 104);
  segment.writeBigUInt64LE(0x10n, 112);
  segment.writeUInt32LE(0x400, 120);
  cmds.push(segment);
  const lib = Buffer.from("/usr/lib/libSystem.B.dylib\0\0\0\0\0\0");
  const dylib = Buffer.alloc(24 + lib.length);
  dylib.writeUInt32LE(0xc, 0);
  dylib.writeUInt32LE(dylib.length, 4);
  dylib.writeUInt32LE(24, 8);
  lib.copy(dylib, 24);
  cmds.push(dylib);
  const strtab = Buffer.from("\0_malloc\0_demo_api\0");
  const symtab = Buffer.alloc(24);
  symtab.writeUInt32LE(0x2, 0);
  symtab.writeUInt32LE(24, 4);
  cmds.push(symtab);
  const sizeofcmds = cmds.reduce((n, c) => n + c.length, 0);
  const symoff = 32 + sizeofcmds;
  const nlist = (strx: number, type: number) => {
    const b = Buffer.alloc(16);
    b.writeUInt32LE(strx, 0);
    b.writeUInt8(type, 4);
    return b;
  };
  const symbols = Buffer.concat([nlist(1, 0x01), nlist(9, 0x0f)]);
  symtab.writeUInt32LE(symoff, 8);
  symtab.writeUInt32LE(2, 12);
  symtab.writeUInt32LE(symoff + symbols.length, 16);
  symtab.writeUInt32LE(strtab.length, 20);
  const header = Buffer.alloc(32);
  header.writeUInt32LE(0xfeedfacf, 0);
  header.writeUInt32LE(0x0100000c, 4);
  header.writeUInt32LE(6, 12);
  header.writeUInt32LE(cmds.length, 16);
  header.writeUInt32LE(sizeofcmds, 20);
  return Buffer.concat([header, ...cmds, symbols, strtab]);
}

/** Go 1.18+ inline build info: header, then varint-prefixed version and module info with sentinels. */
export function buildGoBuildInfo(version: string, modinfo: string): Buffer {
  const varint = (n: number) => {
    const bytes: number[] = [];
    while (n >= 0x80) {
      bytes.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    bytes.push(n);
    return Buffer.from(bytes);
  };
  const header = Buffer.alloc(32);
  header.write("\xff Go buildinf:", 0, "latin1");
  header[14] = 8;
  header[15] = 2;
  const mod = Buffer.concat([
    Buffer.from("3077af0c9274080241e1c107e6d618e6", "hex"),
    Buffer.from(modinfo),
    Buffer.from("f932433186182072008242104116d8f2", "hex"),
  ]);
  return Buffer.concat([
    Buffer.alloc(48),
    header,
    varint(version.length),
    Buffer.from(version),
    varint(mod.length),
    mod,
  ]);
}
