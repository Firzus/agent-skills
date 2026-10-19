import { open } from "node:fs/promises";

/** Lists member names from the ZIP central directory (no decompression). */
export async function zipNames(path: string, limit = 20000): Promise<string[]> {
  const handle = await open(path, "r");
  try {
    const { size } = await handle.stat();
    const tailSize = Math.min(size, 65557);
    if (tailSize < 22) return [];
    const tail = Buffer.alloc(tailSize);
    await handle.read(tail, 0, tailSize, size - tailSize);
    // The 22-byte record must fit: a signature in the last 21 bytes is not an end-of-central-directory.
    const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]), tailSize - 22);
    if (eocd < 0) return [];
    let count = tail.readUInt16LE(eocd + 10);
    let cdSize = tail.readUInt32LE(eocd + 12);
    let cdOffset = tail.readUInt32LE(eocd + 16);
    // ZIP64 end-of-central-directory locator sits right before the EOCD record.
    const locator = eocd - 20;
    if ((cdOffset === 0xffffffff || count === 0xffff) && locator >= 0 && tail.readUInt32LE(locator) === 0x07064b50) {
      const recordOffset = Number(tail.readBigUInt64LE(locator + 8));
      if (recordOffset + 56 > size) return [];
      const record = Buffer.alloc(56);
      await handle.read(record, 0, 56, recordOffset);
      count = Number(record.readBigUInt64LE(32));
      cdSize = Number(record.readBigUInt64LE(40));
      cdOffset = Number(record.readBigUInt64LE(48));
    }
    // Header fields are untrusted: read only the part of the central directory that lies inside the file.
    if (cdOffset >= size) return [];
    cdSize = Math.min(cdSize, size - cdOffset);
    if (cdSize > 256 * 1024 * 1024) return [];
    const cd = Buffer.alloc(cdSize);
    await handle.read(cd, 0, cdSize, cdOffset);
    const names: string[] = [];
    let at = 0;
    for (let i = 0; i < count && names.length < limit && at + 46 <= cd.length; i++) {
      if (cd.readUInt32LE(at) !== 0x02014b50) break;
      const nameLength = cd.readUInt16LE(at + 28);
      const extraLength = cd.readUInt16LE(at + 30);
      const commentLength = cd.readUInt16LE(at + 32);
      names.push(cd.subarray(at + 46, at + 46 + nameLength).toString("utf8"));
      at += 46 + nameLength + extraLength + commentLength;
    }
    return names;
  } finally {
    await handle.close();
  }
}

export function zipFlavor(names: string[]): string {
  const has = (name: string) => names.includes(name);
  if (has("AndroidManifest.xml") && names.some((n) => /^classes\d*\.dex$/.test(n))) {
    const native = names.filter((n) => n.startsWith("lib/") && n.endsWith(".so"));
    const extra = native.some((n) => n.endsWith("libflutter.so"))
      ? " (Flutter)"
      : native.some((n) => n.endsWith("libhermes.so"))
        ? " (React Native, Hermes)"
        : "";
    return `Android APK${extra}`;
  }
  if (has("AndroidManifest.xml")) return "Android AAR or bundle";
  if (names.some((n) => /^Payload\/[^/]+\.app\//.test(n))) return "iOS IPA";
  if (names.some((n) => n.endsWith(".nuspec"))) return "NuGet package";
  if (has("META-INF/MANIFEST.MF")) return "Java JAR";
  return "ZIP archive";
}
