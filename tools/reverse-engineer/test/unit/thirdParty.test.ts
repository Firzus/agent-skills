import { writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vite-plus/test";
import { findToolsJdk, toolEnv, toolsRoot } from "../../src/core/thirdParty";
import { findGhidra } from "../../src/tools/decompile";
import { managed, which } from "../../src/tools/managed";
import { buildZip, isolateCache, tempDir, writeTree } from "../helpers";

const win = process.platform === "win32";
const KEYS = ["REVERSE_ENGINEER_TOOLS", "GHIDRA_INSTALL_DIR", "PATH", "HOME", "USERPROFILE", "LOCALAPPDATA"];
let saved: Record<string, string | undefined> = {};
let root = "";

// Every lookup is confined to an empty home and an empty PATH, so tools installed on the machine do not leak in.
beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  const empty = tempDir();
  root = join(empty, "tools");
  Object.assign(process.env, {
    REVERSE_ENGINEER_TOOLS: root,
    PATH: empty,
    HOME: empty,
    USERPROFILE: empty,
    LOCALAPPDATA: empty,
  });
  delete process.env.GHIDRA_INSTALL_DIR;
});

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("tools root", () => {
  test("REVERSE_ENGINEER_TOOLS overrides the per-user default", () => {
    expect(toolsRoot()).toBe(root);
  });

  test("finds a JDK, Ghidra, jadx and ilspycmd installed there, newest version first", async () => {
    const exe = win ? ".exe" : "";
    writeTree(root, {
      [`jdk-21.0.4+7/bin/java${exe}`]: "",
      [`jdk-21.0.12+7/bin/java${exe}`]: "",
      [`ghidra_12.1.4_PUBLIC/support/analyzeHeadless${win ? ".bat" : ""}`]: "",
      [`jadx/bin/jadx${win ? ".bat" : ""}`]: "",
      [`dotnet-tools/ilspycmd${exe}`]: "",
      [`dotnet/dotnet${exe}`]: "",
    });
    expect(findToolsJdk()).toBe(join(root, "jdk-21.0.12+7"));
    expect(await findGhidra()).toBe(join(root, "ghidra_12.1.4_PUBLIC"));
    expect(which("jadx")).toBe(join(root, "jadx", "bin", `jadx${win ? ".bat" : ""}`));
    expect(which("ilspycmd")).toBe(join(root, "dotnet-tools", `ilspycmd${exe}`));

    const env = toolEnv({ PATH: "/usr/bin" });
    expect(env.JAVA_HOME).toBe(join(root, "jdk-21.0.12+7"));
    expect(env.DOTNET_ROOT).toBe(join(root, "dotnet"));
    expect(env.PATH?.split(delimiter)).toEqual([join(root, "jdk-21.0.12+7", "bin"), join(root, "dotnet"), "/usr/bin"]);
  });

  test("a macOS JDK archive nests the home under Contents/Home", () => {
    writeTree(root, { [`jdk-21.0.12+7/Contents/Home/bin/java${win ? ".exe" : ""}`]: "" });
    expect(findToolsJdk()).toBe(join(root, "jdk-21.0.12+7", "Contents", "Home"));
  });

  test("without installs, the environment is left as is", () => {
    expect(toolEnv({ PATH: "/usr/bin" })).toEqual({ PATH: "/usr/bin" });
  });
});

describe("missing tools", () => {
  test("a missing jadx points to the tools root and the install guide", async () => {
    isolateCache();
    const apk = join(root, "..", "app.apk");
    writeFileSync(apk, buildZip(["AndroidManifest.xml", "classes.dex"]));
    await expect(managed(apk)).rejects.toThrow(/jadx not found\. Install it and JDK 21 into .*tools \(install\.md/);
  });
});
