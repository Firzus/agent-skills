import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { describe, expect, test } from "vite-plus/test";
import { loadBinary } from "../../src/formats/binary";
import { parseModInfo, readGoBuildInfo } from "../../src/formats/gobuild";
import { readRustInfo } from "../../src/formats/rustaudit";
import { extractStrings } from "../../src/formats/strings";
import { inventory } from "../../src/tools/binaryInventory";
import { buildInfo } from "../../src/tools/buildinfo";
import { buildElf, buildGoBuildInfo, buildMacho, buildPe, isolateCache, tempDir } from "../helpers";

describe("loadBinary", () => {
  test("ELF: NEEDED, SONAME, imports and exports from .dynsym", () => {
    const view = loadBinary(buildElf());
    expect(view?.format).toBe("ELF64 LE x86-64");
    expect(view?.libraries).toEqual(["libc.so.6"]);
    expect(view?.notes).toContain("soname libdemo.so");
    expect(view?.imports[0]?.names).toEqual(["puts"]);
    expect(view?.exports).toEqual(["demo_api"]);
    expect(view?.sections.map((s) => s.name)).toContain(".dynamic");
  });

  test("Mach-O: sections, dylibs and symbols", () => {
    const view = loadBinary(buildMacho());
    expect(view?.format).toBe("Mach-O 64 arm64 dylib");
    expect(view?.sections[0]?.name).toBe("__TEXT,__text");
    expect(view?.libraries).toEqual(["/usr/lib/libSystem.B.dylib"]);
    expect(view?.imports[0]?.names).toEqual(["_malloc"]);
    expect(view?.exports).toEqual(["_demo_api"]);
  });

  test("PE: section mapping both ways", () => {
    const view = loadBinary(buildPe());
    expect(view?.vaToOffset(0x140001010n)).toBe(0x210);
    expect(view?.offsetToVa(0x210)).toBe(0x140001010n);
    expect(view?.vaToOffset(0x150000000n)).toBeUndefined();
  });
});

describe("strings", () => {
  test("ASCII and UTF-16LE with offsets", () => {
    const buf = Buffer.concat([
      Buffer.from([0, 1]),
      Buffer.from("hello world"),
      Buffer.from([0, 0]),
      Buffer.from("\\\\.\\pipe\\x", "utf16le"),
      Buffer.from([0, 0]),
    ]);
    const found = extractStrings(buf, 6);
    expect(found).toContainEqual({ offset: 2, text: "hello world", wide: false });
    expect(found).toContainEqual({ offset: 15, text: "\\\\.\\pipe\\x", wide: true });
  });
});

describe("Go build info", () => {
  const modinfo = [
    "path\texample.com/tool/cmd/tool",
    "mod\texample.com/tool\tv1.2.3\th1:abc=",
    "dep\tgolang.org/x/crypto\tv0.57.0\th1:def=",
    "dep\texample.com/old\tv1.0.0",
    "=>\texample.com/new\tv1.1.0\th1:ghi=",
    "build\t-ldflags=-s -w",
    "build\tGOOS=windows",
    "",
  ].join("\n");

  test("parseModInfo handles deps, replacements and settings", () => {
    const info = parseModInfo(modinfo);
    expect(info.path).toBe("example.com/tool/cmd/tool");
    expect(info.main).toEqual({ path: "example.com/tool", version: "v1.2.3", sum: "h1:abc=" });
    expect(info.deps[1]?.replace).toEqual({ path: "example.com/new", version: "v1.1.0" });
    expect(info.settings).toEqual([
      ["-ldflags", "-s -w"],
      ["GOOS", "windows"],
    ]);
  });

  test("reads the inline format and strips the sentinels", () => {
    const info = readGoBuildInfo(buildGoBuildInfo("go1.26.4", modinfo), undefined);
    expect(info?.offset).toBe(48);
    expect(info?.goVersion).toBe("go1.26.4");
    expect(info?.path).toBe("example.com/tool/cmd/tool");
    expect(info?.deps.map((d) => `${d.path} ${d.version}`)).toContain("golang.org/x/crypto v0.57.0");
  });

  test("buildinfo tool output with a filter", async () => {
    const path = join(tempDir(), "tool.bin");
    writeFileSync(path, buildGoBuildInfo("go1.26.4", modinfo));
    const out = await buildInfo(path, "crypto");
    expect(out).toContain("go: go1.26.4  (buildinfo @0x30)");
    expect(out).toContain("path: example.com/tool/cmd/tool");
    expect(out).toContain("deps (1 matching /crypto/ of 2):\n  golang.org/x/crypto v0.57.0");
  });
});

describe("Rust", () => {
  test("cargo-auditable section in a Mach-O-like view", () => {
    const json = JSON.stringify({
      packages: [
        { name: "demo", version: "0.1.0", source: "local", root: true, dependencies: [1] },
        { name: "serde", version: "1.0.219", source: "crates.io" },
      ],
    });
    const blob = deflateSync(Buffer.from(json));
    const buf = Buffer.concat([
      Buffer.alloc(64),
      blob,
      Buffer.from("/rustc/0123456789abcdef0123456789abcdef01234567/library"),
    ]);
    const view = {
      ...loadBinary(buildPe()),
      base: 0,
      sections: [{ name: "__DATA,.dep-v0", va: 0n, size: blob.length, offset: 64, fileSize: blob.length }],
    } as never;
    const info = readRustInfo(buf, view);
    expect(info?.packages.map((p) => `${p.name} ${p.version}`)).toEqual(["demo 0.1.0", "serde 1.0.219"]);
    expect(info?.rustcCommits).toEqual(["0123456789abcdef0123456789abcdef01234567"]);
  });

  test("crate hints from registry paths when there is no section", () => {
    const buf = Buffer.from("x /cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tokio-1.47.1/src/lib.rs y");
    expect(readRustInfo(buf, undefined)?.crateHints).toEqual(["tokio-1.47.1"]);
  });
});

describe("binary_inventory", () => {
  test("summary and paged parts on a synthetic ELF", async () => {
    isolateCache();
    const path = join(tempDir(), "libdemo.so");
    writeFileSync(path, buildElf());
    const summary = await inventory(path, { part: "summary", skip: 0, max: 200 });
    expect(summary).toContain("format: ELF64 LE x86-64");
    expect(summary).toContain("note: soname libdemo.so");
    expect(summary).toContain("exports (1): demo_api");
    const exports = await inventory(path, { part: "exports", skip: 0, max: 10 });
    expect(exports).toBe("demo_api\nexports: 1 total, showing 0..0");
    const notBinary = join(tempDir(), "a.txt");
    writeFileSync(notBinary, "text");
    expect(await inventory(notBinary, { part: "summary", skip: 0, max: 1 })).toContain("not a PE, ELF or Mach-O");
  });
});
