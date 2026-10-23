import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { loadBinary } from "../../src/formats/binary";
import { parsePe, peResources } from "../../src/formats/pe";
import { extractStrings, scanStrings } from "../../src/formats/strings";
import { zipNames } from "../../src/formats/zip";
import { inventory } from "../../src/tools/binaryInventory";
import { buildElf, buildMacho, buildPe, buildZip, isolateCache, tempDir } from "../helpers";

// Parsers run synchronously, so a hang cannot be interrupted by the test timeout: assert the elapsed time too.
const LIMIT_MS = 3000;
const options = { timeout: 10_000 };

function within<T>(run: () => T): T {
  const start = performance.now();
  const result = run();
  expect(performance.now() - start).toBeLessThan(LIMIT_MS);
  return result;
}

/** buildPe() grown to `size` bytes, its single section (rva 0x1000 at file 0x200) covering the whole tail. */
const OPT = 0x98;
function bigPe(size: number): Buffer {
  const buf = Buffer.concat([buildPe(), Buffer.alloc(size - 0x400)]);
  buf.writeUInt32LE(size - 0x200, OPT + 0xf0 + 8);
  buf.writeUInt32LE(size - 0x200, OPT + 0xf0 + 16);
  return buf;
}
const rvaOf = (offset: number) => offset - 0x200 + 0x1000;
function setDirectory(buf: Buffer, index: number, rva: number, size: number): void {
  buf.writeUInt32LE(rva, OPT + 112 + index * 8);
  buf.writeUInt32LE(size, OPT + 112 + index * 8 + 4);
}

describe("hostile PE", () => {
  test("resource tree whose entries point back to the root table", options, () => {
    const count = 4096;
    const buf = bigPe(0x400 + 16 + count * 8);
    setDirectory(buf, 2, 0x1000, 16 + count * 8);
    buf.writeUInt16LE(count, 0x200 + 14);
    for (let i = 0; i < count; i++) {
      buf.writeUInt32LE(i + 1, 0x210 + i * 8);
      buf.writeUInt32LE(0x80000000, 0x210 + i * 8 + 4);
    }
    const view = within(() => loadBinary(buf));
    expect(view?.resources).toEqual([]);
  });

  test("a well-formed three-level resource tree still lists its leaf", () => {
    const buf = bigPe(0x1000);
    setDirectory(buf, 2, 0x1000, 0x60);
    const table = (at: number, id: number, target: number) => {
      buf.writeUInt16LE(1, 0x200 + at + 14);
      buf.writeUInt32LE(id, 0x200 + at + 16);
      buf.writeUInt32LE(target, 0x200 + at + 20);
    };
    table(0x00, 16, 0x80000018);
    table(0x18, 1, 0x80000030);
    table(0x30, 1033, 0x48);
    buf.writeUInt32LE(0x1100, 0x200 + 0x48);
    buf.writeUInt32LE(0x20, 0x200 + 0x4c);
    const image = parsePe(buf);
    expect(image && peResources(buf, image)).toEqual([
      { type: "VERSION", name: "1", lang: 1033, offset: 0x300, size: 0x20 },
    ]);
  });

  test("thousands of import and delay-import descriptors sharing one long thunk array", options, () => {
    const thunks = 20000;
    const thunkAt = 0x200;
    const importsAt = thunkAt + thunks * 8 + 8;
    const delayAt = importsAt + 20 * 25000;
    const buf = bigPe(delayAt + 32 * 15000);
    for (let i = 0; i < thunks; i++) buf.writeBigUInt64LE((1n << 63n) | BigInt(i + 1), thunkAt + i * 8);
    for (let at = importsAt; at < delayAt; at += 20) {
      buf.writeUInt32LE(0x1000, at);
      buf.writeUInt32LE(0x1000, at + 12);
      buf.writeUInt32LE(0x1000, at + 16);
    }
    for (let at = delayAt; at + 32 <= buf.length; at += 32) {
      buf.writeUInt32LE(1, at);
      buf.writeUInt32LE(0x1000, at + 4);
      buf.writeUInt32LE(0x1000, at + 16);
    }
    setDirectory(buf, 1, rvaOf(importsAt), 0xffffffff);
    setDirectory(buf, 13, rvaOf(delayAt), 0xffffffff);
    const view = within(() => loadBinary(buf));
    const names = view?.imports.reduce((n, g) => n + g.names.length, 0) ?? 0;
    expect(names).toBeGreaterThan(0);
    expect(names).toBeLessThanOrEqual(100_000);

    // An understated directory size hides no descriptor: the Windows loader ignores it too.
    setDirectory(buf, 1, rvaOf(importsAt), 3 * 20);
    setDirectory(buf, 13, 0, 0);
    expect(within(() => loadBinary(buf))?.imports.length).toBeGreaterThan(3);
  });

  test("export tables running past the end of the file", () => {
    const buf = bigPe(0x1000);
    setDirectory(buf, 0, 0x1000, 40);
    buf.writeUInt32LE(100, 0x200 + 20);
    buf.writeUInt32LE(100, 0x200 + 24);
    buf.writeUInt32LE(rvaOf(0x1000 - 8), 0x200 + 28);
    buf.writeUInt32LE(rvaOf(0x1000 - 4), 0x200 + 32);
    buf.writeUInt32LE(rvaOf(0x1000 - 2), 0x200 + 36);
    buf.writeUInt32LE(0x1100, 0x1000 - 8);
    const view = loadBinary(buf);
    expect(view?.exports.length).toBeLessThanOrEqual(2);
  });

  test("optional header too short for the data directory count", () => {
    const full = buildPe();
    full.writeUInt16LE(0x60, 0x84 + 16);
    const buf = full.subarray(0, OPT + 0x60);
    expect(parsePe(buf)?.directories).toEqual([]);
    expect(loadBinary(buf)?.format).toContain("PE32+");
  });
});

/** ELF64 whose `count` section headers all have `type` and span the whole file. */
function sectionFloodElf(count: number, types: number[]): Buffer {
  const buf = Buffer.alloc(64 + count * 64);
  buf.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1]);
  buf.writeUInt16LE(3, 16);
  buf.writeUInt16LE(62, 18);
  buf.writeBigUInt64LE(64n, 0x28);
  buf.writeUInt16LE(64, 0x3a);
  buf.writeUInt16LE(count, 0x3c);
  for (let i = 0; i < count; i++) {
    const at = 64 + i * 64;
    buf.writeUInt32LE(types[i % types.length] as number, at + 4);
    buf.writeBigUInt64LE(BigInt(buf.length), at + 32);
    buf.writeBigUInt64LE(24n, at + 56);
  }
  return buf;
}

describe("hostile ELF", () => {
  test("65535 symbol table sections each spanning the file", options, () => {
    within(() => loadBinary(sectionFloodElf(65535, [2])));
  });

  test("65535 dynamic and dynamic symbol sections each spanning the file", options, () => {
    within(() => loadBinary(sectionFloodElf(65535, [6, 11])));
  });

  test("section header entry size too small for a section header", () => {
    const elf = buildElf();
    elf.writeUInt16LE(1, 0x3a);
    elf.writeBigUInt64LE(BigInt(elf.length - 8), 0x28);
    expect(loadBinary(elf)?.sections).toEqual([]);
  });

  test("only SHF_ALLOC sections take part in address mapping", () => {
    const elf = buildElf();
    const shoff = Number(elf.readBigUInt64LE(0x28));
    // .dynstr (section 1, file offset 64) has address 0 and no SHF_ALLOC in the fixture.
    const loose = loadBinary(elf);
    expect(loose?.offsetToVa(64)).toBeUndefined();
    expect(loose?.vaToOffset(0n)).toBeUndefined();
    elf.writeBigUInt64LE(2n, shoff + 64 + 8);
    elf.writeBigUInt64LE(0x1000n, shoff + 64 + 16);
    const mapped = loadBinary(elf);
    expect(mapped?.vaToOffset(0x1001n)).toBe(65);
    expect(mapped?.offsetToVa(65)).toBe(0x1001n);
  });
});

describe("hostile Mach-O", () => {
  test("segment commands 8 bytes apart, each claiming sections", options, () => {
    const buf = Buffer.alloc(1 << 20);
    for (let at = 32; at + 8 <= buf.length; at += 8) {
      buf.writeUInt32LE(0x19, at);
      buf.writeUInt32LE(8, at + 4);
    }
    buf.writeUInt32LE(0xfeedfacf, 0);
    buf.writeUInt32LE(0x0100000c, 4);
    buf.writeUInt32LE(0xffffffff, 16);
    const view = within(() => loadBinary(buf));
    expect(view?.sections).toEqual([]);
  });

  test("nsects larger than the segment command can hold", () => {
    const buf = buildMacho();
    buf.writeUInt32LE(0xffffffff, 32 + 64);
    expect(loadBinary(buf)?.sections.map((s) => s.name)).toEqual(["__TEXT,__text"]);
  });

  test("universal binary whose preferred slice lies outside the file", () => {
    const thin = buildMacho();
    const fat = Buffer.alloc(0x1000);
    fat.writeUInt32BE(0xcafebabe, 0);
    fat.writeUInt32BE(2, 4);
    fat.writeUInt32BE(0x01000007, 8);
    fat.writeUInt32BE(0x1000, 16);
    fat.writeUInt32BE(thin.length, 20);
    fat.writeUInt32BE(0x0100000c, 28);
    fat.writeUInt32BE(0x100000, 36);
    fat.writeUInt32BE(0x1000, 40);
    const view = loadBinary(Buffer.concat([fat, thin]));
    expect(view?.base).toBe(0x1000);
    expect(view?.libraries).toEqual(["/usr/lib/libSystem.B.dylib"]);
    expect(loadBinary(fat.subarray(0, 64))).toBeUndefined();
  });
});

describe("hostile ZIP", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("central directory size far beyond the file", async () => {
    const zip = buildZip(["a.txt"]);
    zip.writeUInt32LE(200 * 1024 * 1024, zip.length - 22 + 12);
    const path = join(tempDir(), "huge.zip");
    writeFileSync(path, zip);
    const alloc = vi.spyOn(Buffer, "alloc");
    await zipNames(path);
    expect(Math.max(...alloc.mock.calls.map((call) => call[0]))).toBeLessThanOrEqual(zip.length);
  });

  test("end-of-central-directory signature in the last 22 bytes", async () => {
    const dir = tempDir();
    const tiny = join(dir, "tiny.zip");
    writeFileSync(tiny, Buffer.from([0x50, 0x4b, 0x05, 0x06, 0, 0, 0, 0, 0, 0]));
    expect(await zipNames(tiny)).toEqual([]);
    const trailing = join(dir, "trailing.zip");
    writeFileSync(trailing, Buffer.concat([buildZip(["a.txt"]), Buffer.from([0x50, 0x4b, 0x05, 0x06, 0])]));
    expect(await zipNames(trailing)).toEqual(["a.txt"]);
  });
});

describe("string extraction limits", () => {
  test("a UTF-16LE string ending at the end of the buffer", () => {
    expect(extractStrings(Buffer.from("abcdefgh", "utf16le"))).toContainEqual({
      offset: 0,
      text: "abcdefgh",
      wide: true,
    });
  });

  test("the cap applies to filtered matches and is reported", () => {
    const buf = Buffer.from("one_match\0two_match\0nothing\0three_match\0");
    const all = scanStrings(buf, { limit: 2 });
    expect(all.truncated).toBe(true);
    const filtered = scanStrings(buf, { limit: 3, filter: (text) => text.includes("match") });
    expect(filtered.strings.map((s) => s.text)).toEqual(["one_match", "two_match", "three_match"]);
    expect(filtered.truncated).toBe(true);
    expect(scanStrings(buf, { limit: 4, filter: (text) => text.includes("match") }).truncated).toBe(false);
  });

  test("binary_inventory finds strings past 200000 others and reports the cap", options, async () => {
    isolateCache();
    const path = join(tempDir(), "many-strings.so");
    writeFileSync(
      path,
      Buffer.concat([
        buildElf(),
        Buffer.from("filler\0".repeat(200_001)),
        Buffer.from("needle_here\0https://example.com/late\0"),
      ]),
    );
    const found = await inventory(path, { part: "strings", filter: "needle", skip: 0, max: 10 });
    expect(found).toContain("needle_here");
    const summary = await inventory(path, { part: "summary", skip: 0, max: 200 });
    expect(summary).toContain("https://example.com/late");
    const all = await inventory(path, { part: "strings", skip: 0, max: 1 });
    expect(all).toMatch(/cap/);
  });
});
