/** Minimal Mach-O header reader, thin and fat. */

export interface MachoSlice {
  cpu: string;
  offset: number;
  size: number;
}

export interface MachoHeader {
  fat: boolean;
  is64: boolean;
  cpu: string;
  fileType: string;
  slices: MachoSlice[];
}

const CPUS: Record<number, string> = {
  7: "x86",
  0x01000007: "x86-64",
  12: "arm",
  0x0100000c: "arm64",
  0x0200000c: "arm64_32",
  18: "ppc",
  0x01000012: "ppc64",
};

const FILE_TYPES: Record<number, string> = {
  1: "object",
  2: "executable",
  6: "dylib",
  7: "dylinker",
  8: "bundle",
  10: "dsym",
  11: "kext",
};

export function machoCpuName(cpu: number): string {
  return CPUS[cpu] ?? `cpu 0x${cpu.toString(16)}`;
}

/** Thin magic, with the endianness of the header fields. */
function thinMagic(view: DataView): { is64: boolean; little: boolean } | undefined {
  const be = view.getUint32(0, false);
  if (be === 0xfeedface) return { is64: false, little: false };
  if (be === 0xfeedfacf) return { is64: true, little: false };
  if (be === 0xcefaedfe) return { is64: false, little: true };
  if (be === 0xcffaedfe) return { is64: true, little: true };
  return undefined;
}

export function parseMachoHeader(buf: Uint8Array): MachoHeader | undefined {
  if (buf.length < 28) return undefined;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const thin = thinMagic(view);
  if (thin) {
    return {
      fat: false,
      is64: thin.is64,
      cpu: machoCpuName(view.getUint32(4, thin.little)),
      fileType: FILE_TYPES[view.getUint32(12, thin.little)] ?? "other",
      slices: [],
    };
  }
  const magic = view.getUint32(0, false);
  if (magic !== 0xcafebabe && magic !== 0xcafebabf) return undefined;
  // Java class files share 0xcafebabe; they carry a version >= 45 where fat files carry a small arch count.
  const count = view.getUint32(4, false);
  if (count === 0 || count > 20) return undefined;
  const entrySize = magic === 0xcafebabf ? 32 : 20;
  const slices: MachoSlice[] = [];
  for (let i = 0; i < count; i++) {
    const at = 8 + i * entrySize;
    if (at + entrySize > buf.length) break;
    const cpu = machoCpuName(view.getUint32(at, false));
    const offset = magic === 0xcafebabf ? Number(view.getBigUint64(at + 8, false)) : view.getUint32(at + 8, false);
    const size = magic === 0xcafebabf ? Number(view.getBigUint64(at + 16, false)) : view.getUint32(at + 12, false);
    slices.push({ cpu, offset, size });
  }
  return { fat: true, is64: false, cpu: slices.map((s) => s.cpu).join("+"), fileType: "universal", slices };
}
