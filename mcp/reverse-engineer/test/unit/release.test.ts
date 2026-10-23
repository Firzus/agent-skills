import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";

const root = join(import.meta.dirname, "..", "..");
const json = (file: string) => JSON.parse(readFileSync(join(root, file), "utf8"));

describe("release metadata", () => {
  test("server.json matches package.json", () => {
    const pkg = json("package.json");
    const server = json("server.json");
    expect(server.name).toBe(pkg.mcpName);
    expect(server.version).toBe(pkg.version);
    expect(server.packages).toEqual([
      expect.objectContaining({ registryType: "npm", identifier: pkg.name, version: pkg.version }),
    ]);
  });

  test("every bundled dependency has a third-party notice", () => {
    const buildOnly = new Set(["@types/node", "typescript", "vite-plus"]);
    const bundled = Object.keys(json("package.json").devDependencies).filter((name) => !buildOnly.has(name));
    const listed = readFileSync(join(root, "THIRD_PARTY_NOTICES.md"), "utf8")
      .split("\n")
      .filter((line) => line.startsWith("| "))
      .map((line) => line.split("|")[1]?.trim());
    expect(listed).toEqual(expect.arrayContaining([...bundled, "@modelcontextprotocol/core"]));
  });
});
