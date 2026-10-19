import { elfMachineName, elfTypeName, parseElfHeader } from "./elf";
import { parseMachoHeader } from "./macho";
import { PE_DIR, parsePe, peMachineName, peSubsystemName } from "./pe";

export type Kind =
  | "pe"
  | "elf"
  | "macho"
  | "asar"
  | "zip"
  | "wasm"
  | "hermes"
  | "dex"
  | "java-class"
  | "sqlite"
  | "plist"
  | "archive"
  | "text"
  | "data";

export interface Identity {
  kind: Kind;
  format: string;
  dotnet?: boolean;
}

const startsWith = (buf: Uint8Array, bytes: number[], at = 0): boolean => bytes.every((b, i) => buf[at + i] === b);

const ascii = (buf: Uint8Array, from: number, to: number): string =>
  Buffer.from(buf.subarray(from, to)).toString("latin1");

/** Identifies a file from its first bytes (the PE path needs the whole headers, 64 KB is enough). */
export function identify(head: Uint8Array): Identity {
  const pe = parsePe(head);
  if (pe) {
    const clr = pe.directories[PE_DIR.clr];
    const dotnet = clr !== undefined && clr.rva !== 0;
    const what = pe.isDll ? "DLL" : "executable";
    return {
      kind: "pe",
      format: `PE${pe.is64 ? "32+" : "32"} ${peMachineName(pe.machine)} ${peSubsystemName(pe.subsystem)} ${what}${dotnet ? " (.NET assembly)" : ""}`,
      dotnet,
    };
  }
  const elf = parseElfHeader(head);
  if (elf) {
    return {
      kind: "elf",
      format: `ELF${elf.is64 ? "64" : "32"} ${elf.littleEndian ? "LE" : "BE"} ${elfMachineName(elf.machine)} ${elfTypeName(elf.type)}`,
    };
  }
  const macho = parseMachoHeader(head);
  if (macho) {
    return {
      kind: "macho",
      format: macho.fat
        ? `Mach-O universal (${macho.cpu})`
        : `Mach-O ${macho.is64 ? "64" : "32"} ${macho.cpu} ${macho.fileType}`,
    };
  }
  if (startsWith(head, [0xca, 0xfe, 0xba, 0xbe])) return { kind: "java-class", format: "Java class file" };
  if (isAsarHead(head)) return { kind: "asar", format: "Electron asar archive" };
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04]))
    return { kind: "zip", format: "ZIP archive (APK, JAR, AAR, IPA or other)" };
  if (startsWith(head, [0x00, 0x61, 0x73, 0x6d])) return { kind: "wasm", format: "WebAssembly module" };
  if (startsWith(head, [0xc6, 0x1f, 0xbc, 0x03, 0xc1, 0x03, 0x19, 0x1f])) {
    return { kind: "hermes", format: "Hermes bytecode (React Native)" };
  }
  if (ascii(head, 0, 4) === "dex\n") return { kind: "dex", format: `Android DEX ${ascii(head, 4, 7)}` };
  if (ascii(head, 0, 16) === "SQLite format 3\0") return { kind: "sqlite", format: "SQLite 3 database" };
  if (ascii(head, 0, 8) === "bplist00") return { kind: "plist", format: "binary property list" };
  if (startsWith(head, [0x1f, 0x8b])) return { kind: "archive", format: "gzip" };
  if (startsWith(head, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00])) return { kind: "archive", format: "xz" };
  if (startsWith(head, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) return { kind: "archive", format: "7z" };
  if (ascii(head, 257, 262) === "ustar") return { kind: "archive", format: "tar" };
  if (ascii(head, 0, 5) === "%PDF-") return { kind: "data", format: "PDF document" };
  if (!head.subarray(0, 8192).includes(0)) {
    const text = ascii(head, 0, 512).trimStart();
    if (text.startsWith("<?xml") && text.includes("<plist")) return { kind: "plist", format: "XML property list" };
    return { kind: "text", format: "text" };
  }
  return { kind: "data", format: "unknown binary data" };
}

/** asar starts with a Chromium Pickle: uint32 4, header size, payload size, JSON length, then `{"files"`. */
export function isAsarHead(head: Uint8Array): boolean {
  if (head.length < 24) return false;
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  return view.getUint32(0, true) === 4 && ascii(head, 16, 24) === '{"files"';
}
