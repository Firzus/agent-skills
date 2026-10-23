import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { extractAsar, readAsarHeader } from "../../src/formats/asar";
import { FUSE_SENTINEL, readFuses } from "../../src/formats/electron";
import { identify } from "../../src/formats/magic";
import { parsePe } from "../../src/formats/pe";
import { zipFlavor, zipNames } from "../../src/formats/zip";
import { buildAsar, buildPe, buildZip, isolateCache, tempDir, writeTree } from "../helpers";

describe("identify", () => {
  test("PE executable, DLL and .NET assembly", () => {
    expect(identify(buildPe()).format).toBe("PE32+ x86-64 console executable");
    expect(identify(buildPe({ dll: true, machine: 0xaa64 })).format).toBe("PE32+ arm64 console DLL");
    const dotnet = identify(buildPe({ dll: true, clr: true }));
    expect(dotnet.dotnet).toBe(true);
    expect(dotnet.format).toContain(".NET assembly");
  });

  test("PE sections", () => {
    const pe = parsePe(buildPe());
    expect(pe?.sections.map((s) => s.name)).toEqual([".text"]);
    expect(pe?.is64).toBe(true);
  });

  test("ELF and Mach-O headers", () => {
    const elf = Buffer.alloc(64);
    elf.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1]);
    elf.writeUInt16LE(3, 16);
    elf.writeUInt16LE(183, 18);
    expect(identify(elf).format).toBe("ELF64 LE arm64 shared object or PIE");

    const thin = Buffer.alloc(32);
    thin.writeUInt32BE(0xcffaedfe, 0);
    thin.writeUInt32LE(0x0100000c, 4);
    thin.writeUInt32LE(6, 12);
    expect(identify(thin).format).toBe("Mach-O 64 arm64 dylib");

    const fat = Buffer.alloc(64);
    fat.writeUInt32BE(0xcafebabe, 0);
    fat.writeUInt32BE(2, 4);
    fat.writeUInt32BE(0x01000007, 8);
    fat.writeUInt32BE(0x0100000c, 28);
    expect(identify(fat).format).toBe("Mach-O universal (x86-64+arm64)");
  });

  test("Java class is not mistaken for a universal binary", () => {
    const java = Buffer.alloc(16);
    java.writeUInt32BE(0xcafebabe, 0);
    java.writeUInt32BE(0x00000041, 4);
    expect(identify(java).kind).toBe("java-class");
  });

  test("other magics", () => {
    expect(identify(Buffer.from("SQLite format 3\0rest")).kind).toBe("sqlite");
    expect(identify(Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0])).kind).toBe("wasm");
    expect(identify(Buffer.from("const x = 1;\n")).kind).toBe("text");
  });
});

describe("zip", () => {
  test("lists central directory names and recognizes an APK", async () => {
    const path = join(tempDir(), "a.apk");
    writeFileSync(path, buildZip(["AndroidManifest.xml", "classes.dex", "lib/arm64-v8a/libflutter.so"]));
    const names = await zipNames(path);
    expect(names).toContain("classes.dex");
    expect(zipFlavor(names)).toBe("Android APK (Flutter)");
  });
});

describe("asar", () => {
  test("reads the header, extracts, verifies hashes and flags changed unpacked files", async () => {
    isolateCache();
    const dir = tempDir();
    const asar = join(dir, "app.asar");
    const headerHash = buildAsar(asar, {
      "package.json": { content: '{"name":"demo","main":"main.js"}' },
      ".webpack/main/index.js": { content: "console.log(1)" },
      "addon.node": { content: "signed later", unpacked: true, declaredHash: "0".repeat(64) },
    });
    writeTree(join(dir, "app.asar.unpacked"), { "addon.node": "signed later" });

    const header = await readAsarHeader(asar);
    expect(header.entries.map((e) => e.path).sort()).toEqual([".webpack/main/index.js", "addon.node", "package.json"]);

    const first = await extractAsar(asar);
    expect(first.cached).toBe(false);
    expect(first.headerSha256).toBe(headerHash);
    expect(first.hashed).toBe(3);
    expect(first.mismatches).toEqual([{ path: "addon.node", unpacked: true }]);
    expect(readFileSync(join(first.root, ".webpack", "main", "index.js"), "utf8")).toBe("console.log(1)");
    expect(readFileSync(join(first.root, "addon.node"), "utf8")).toBe("signed later");

    const second = await extractAsar(asar);
    expect(second.cached).toBe(true);
    expect(second.root).toBe(first.root);
  });

  test("skips entry names that would escape the root", async () => {
    isolateCache();
    const dir = tempDir();
    const asar = join(dir, "evil.asar");
    buildAsar(asar, { "ok.txt": { content: "ok" } });
    // Rewrite the header with a traversal name of the same length as "ok.txt".
    const data = readFileSync(asar);
    writeFileSync(asar, Buffer.from(data.toString("latin1").replace('"ok.txt"', '".."    '), "latin1"));
    const header = await readAsarHeader(asar);
    expect(header.entries).toEqual([]);
    const result = await extractAsar(asar);
    expect(existsSync(join(result.root, ".."))).toBe(true);
    expect(result.files).toBe(0);
  });
});

describe("fuses", () => {
  test("parses a v1 fuse wire after the sentinel", async () => {
    const path = join(tempDir(), "electron.exe");
    const wire = Buffer.concat([
      Buffer.from("padding"),
      Buffer.from(FUSE_SENTINEL, "latin1"),
      Buffer.from([1, 3, 0x30, 0x31, 0x72]),
    ]);
    writeFileSync(path, wire);
    const fuses = await readFuses([path]);
    expect(fuses?.version).toBe(1);
    expect(fuses?.fuses).toEqual([
      { name: "RunAsNode", state: "off" },
      { name: "EnableCookieEncryption", state: "on" },
      { name: "EnableNodeOptionsEnvironmentVariable", state: "removed" },
    ]);
  });
});
