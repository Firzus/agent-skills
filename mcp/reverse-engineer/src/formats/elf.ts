/** Minimal ELF header reader. */

export interface ElfHeader {
  is64: boolean;
  littleEndian: boolean;
  type: number;
  machine: number;
  entry: bigint;
}

const MACHINES: Record<number, string> = {
  3: "x86",
  8: "mips",
  20: "ppc",
  21: "ppc64",
  40: "arm",
  62: "x86-64",
  183: "arm64",
  243: "riscv",
  258: "loongarch",
};

const TYPES: Record<number, string> = { 1: "relocatable", 2: "executable", 3: "shared object or PIE", 4: "core" };

export function isElf(buf: Uint8Array): boolean {
  return buf.length >= 20 && buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46;
}

export function parseElfHeader(buf: Uint8Array): ElfHeader | undefined {
  if (!isElf(buf) || buf.length < 0x40) return undefined;
  const is64 = buf[4] === 2;
  const littleEndian = buf[5] === 1;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return {
    is64,
    littleEndian,
    type: view.getUint16(16, littleEndian),
    machine: view.getUint16(18, littleEndian),
    entry: is64 ? view.getBigUint64(24, littleEndian) : BigInt(view.getUint32(24, littleEndian)),
  };
}

export function elfMachineName(machine: number): string {
  return MACHINES[machine] ?? `machine ${machine}`;
}

export function elfTypeName(type: number): string {
  return TYPES[type] ?? `type ${type}`;
}
