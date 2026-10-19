import { readFileSync } from "node:fs";
import { describe, expect, test } from "vite-plus/test";
import { fit } from "../../src/core/budget";
import { excerpt, lineLocator, walk } from "../../src/core/files";
import { isolateCache, tempDir, writeTree } from "../helpers";

describe("fit", () => {
  test("returns small text unchanged", async () => {
    isolateCache();
    expect(await fit("short", "t", 2048)).toBe("short");
  });

  test("truncates at a line boundary and stores the full text in the cache", async () => {
    const cache = isolateCache();
    const text = Array.from({ length: 400 }, (_, i) => `line ${i} ${"x".repeat(20)}`).join("\n");
    const out = await fit(text, "t", 2048);
    expect(Buffer.byteLength(out)).toBeLessThanOrEqual(2048);
    const footer = /Full output \((\d+) B\): (.+) \. Page/.exec(out);
    expect(footer?.[1]).toBe(String(Buffer.byteLength(text)));
    const file = footer?.[2] as string;
    expect(file.startsWith(cache)).toBe(true);
    expect(readFileSync(file, "utf8")).toBe(text);
    const body = out.slice(0, out.lastIndexOf("\n[truncated"));
    expect(text.startsWith(body)).toBe(true);
    expect(text[body.length]).toBe("\n");
  });
});

describe("files", () => {
  test("lineLocator maps offsets to 1-based line and column", () => {
    const locate = lineLocator("ab\ncde\n\nf");
    expect(locate(0)).toEqual({ line: 1, col: 1 });
    expect(locate(4)).toEqual({ line: 2, col: 2 });
    expect(locate(7)).toEqual({ line: 3, col: 1 });
    expect(locate(8)).toEqual({ line: 4, col: 1 });
  });

  test("excerpt stays on one line and marks clipped ends", () => {
    const text = `first\n${"a".repeat(50)}NEEDLE${"b".repeat(50)}\nlast`;
    const start = text.indexOf("NEEDLE");
    expect(excerpt(text, start, start + 6, 5)).toBe("…aaaaaNEEDLEbbbbb…");
    expect(excerpt("x NEEDLE y", 2, 8, 50)).toBe("x NEEDLE y");
  });

  test("walk includes hidden folders, skips node_modules unless asked, and sorts", async () => {
    const root = tempDir();
    writeTree(root, {
      "b.js": "",
      "a.js": "",
      ".webpack/main/index.js": "",
      "node_modules/dep/index.js": "",
      ".git/config": "",
    });
    const rels = async (deps: boolean) => {
      const out: string[] = [];
      for await (const entry of walk(root, deps)) out.push(entry.rel);
      return out;
    };
    expect(await rels(false)).toEqual(["a.js", "b.js", ".webpack/main/index.js"]);
    expect(await rels(true)).toContain("node_modules/dep/index.js");
  });
});
