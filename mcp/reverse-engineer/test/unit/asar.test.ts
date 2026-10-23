import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { extractAsar, readAsarHeader } from "../../src/formats/asar";
import { buildAsar, isolateCache, tempDir, writeTree } from "../helpers";

describe("asar extraction", () => {
  test("concurrent calls share one extraction and leave no temporary folder", async () => {
    isolateCache();
    const asar = join(tempDir(), "app.asar");
    const files = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`src/f${i}.js`, { content: `x${i}` }]));
    buildAsar(asar, files);
    const [a, b, c] = await Promise.all([extractAsar(asar), extractAsar(asar), extractAsar(asar)]);
    expect(a.root).toBe(b.root);
    expect(b).toBe(c);
    expect(readdirSync(join(a.root, "src"))).toHaveLength(200);
    expect(readdirSync(dirname(a.root)).filter((name) => name.includes(".tmp-"))).toEqual([]);
  });

  test("a cache built without the .unpacked folder is refreshed once it appears", async () => {
    isolateCache();
    const dir = tempDir();
    const asar = join(dir, "app.asar");
    buildAsar(asar, { "native/a.node": { content: "addon", unpacked: true } });
    const first = await extractAsar(asar);
    expect(first.missingUnpacked).toEqual(["native/a.node"]);
    writeTree(join(dir, "app.asar.unpacked"), { "native/a.node": "addon" });
    const second = await extractAsar(asar);
    expect(second.cached).toBe(false);
    expect(second.missingUnpacked).toEqual([]);
    expect(existsSync(join(second.root, "native", "a.node"))).toBe(true);
  });

  test.runIf(process.platform === "win32")("members with names Windows cannot create are skipped", async () => {
    isolateCache();
    const asar = join(tempDir(), "app.asar");
    buildAsar(asar, { "ok.js": { content: "1" }, "bad?.js": { content: "2" }, "CON.txt": { content: "3" } });
    const result = await extractAsar(asar);
    expect(result.files).toBe(1);
    expect(result.skipped.sort()).toEqual(["CON.txt", "bad?.js"]);
  });

  test("a header length beyond the file is rejected without a large allocation", async () => {
    const asar = join(tempDir(), "huge.asar");
    const prefix = Buffer.alloc(24);
    prefix.writeUInt32LE(4, 0);
    prefix.writeUInt32LE(0x1fffffff, 4);
    prefix.writeUInt32LE(0x1ffffff0, 12);
    writeFileSync(asar, prefix);
    await expect(readAsarHeader(asar)).rejects.toThrow(/out of range/);
  });
});
