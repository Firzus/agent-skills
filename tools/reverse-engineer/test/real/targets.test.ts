// Tests against real shipped artifacts. They run only when the targets exist:
//   RE_TARGETS     directory holding app.asar, app.asar.unpacked/ and gh.exe (benchmark copies)
//   RE_NOTION_DIR  an installed Notion app directory (read only; Windows layout)
//   RE_GHIDRA=1    also run the Ghidra decompilation test (minutes)
//   RE_DOTNET_DLL  a small .NET assembly, for the managed tool (needs ilspycmd)
//   RE_APK         an Android APK, for the managed tool (needs jadx and JDK 21)
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { inventory } from "../../src/tools/binaryInventory";
import { buildInfo } from "../../src/tools/buildinfo";
import { decompile } from "../../src/tools/decompile";
import { electronSurface } from "../../src/tools/electronSurface";
import { managed } from "../../src/tools/managed";
import { searchPath } from "../../src/tools/search";
import { triage } from "../../src/tools/triage";
import { isolateCache } from "../helpers";

const targets = process.env.RE_TARGETS ?? "";
const notionDir = process.env.RE_NOTION_DIR ?? "";
const hasTargets = targets !== "" && existsSync(join(targets, "app.asar"));
const hasNotion = notionDir !== "" && existsSync(join(notionDir, "resources", "app.asar"));
const addon = join(
  targets,
  "app.asar.unpacked",
  "node_modules",
  "@notionhq",
  "desktop-native",
  "build",
  "Release",
  "win_utils.node",
);
const dotnetDll = process.env.RE_DOTNET_DLL ?? "";
const apk = process.env.RE_APK ?? "";

describe.skipIf(!hasTargets)("benchmark copies", () => {
  test("electron_surface traces meeting detection in Notion", async () => {
    isolateCache();
    const out = await electronSurface(join(targets, "app.asar"), { focus: "audio" });
    expect(out).toMatch(/win_utils\.node .*referenced at \.webpack\/main\/index\.js/);
    expect(out).toMatch(/getRunningInputAudioProcesses \(x\d+ \.webpack\/main\/index\.js:\d+:\d+\)/);
    expect(out).toContain("AudioController");
    expect(out).toMatch(
      /handleEventFromRenderer\.addListener \(listen\)[^[]*notion:initialize-running-input-audio-process-detection/,
    );
    expect(out).toMatch(/sendMainToAllNotionInstances \(send\)[^[]*notion:running-input-audio-processes-changed-v2/);
    expect(out).toMatch(/5 differ from the header \(5 unpacked/);
  });

  test("search reaches webpack output inside the archive", async () => {
    isolateCache();
    const out = await searchPath(join(targets, "app.asar"), { pattern: "exposeInMainWorld", glob: "*.js", max: 5 });
    expect(out).toMatch(/\.webpack\/renderer\/[\w_]+\/preload\.js:\d+:\d+: /);
  });

  test("triage spots Go build info in gh.exe", async () => {
    isolateCache();
    const out = await triage.run({ path: join(targets, "gh.exe") });
    expect(out).toContain("format: PE32+ x86-64 console executable");
    expect(out).toMatch(/go-buildinfo@0x[0-9a-f]+/);
  });
});

describe.skipIf(!hasNotion)("installed Notion", () => {
  test("fuses and the embedded asar integrity resource", async () => {
    isolateCache();
    const out = await electronSurface(notionDir);
    expect(out).toMatch(/integrity: header sha256 [0-9a-f]{16}… matches Notion\.exe resource INTEGRITY\/ELECTRONASAR/);
    expect(out).toMatch(/fuses \(Notion\.exe@0x[0-9a-f]+, wire v1\): RunAsNode=(on|off)/);
  });
});

describe.skipIf(!hasTargets)("native inventory and build info", () => {
  test("buildinfo matches go version -m for gh.exe 2.95.0", async () => {
    const out = await buildInfo(join(targets, "gh.exe"), "cli/go-gh|x/crypto");
    expect(out).toContain("go: go1.26.4");
    expect(out).toContain("path: github.com/cli/cli/v2/cmd/gh");
    expect(out).toContain("main module: github.com/cli/cli/v2 v2.95.0");
    expect(out).toContain("github.com/cli/go-gh/v2 v2.13.0");
    expect(out).toContain("golang.org/x/crypto v0.53.0");
  });

  test("binary_inventory lists win_utils.node imports, N-API names and the pipe prefix", async () => {
    isolateCache();
    const out = await inventory(addon, { part: "summary", skip: 0, max: 200 });
    expect(out).toContain("format: PE32+ x86-64 gui DLL");
    expect(out).toMatch(/KERNEL32\.dll \(\d+\): .*CreateNamedPipeW/);
    expect(out).toContain("node.exe (delay-load)");
    expect(out).toContain("requestSingleInstanceLock@0x");
    expect(out).toContain("installMSIXAndRestart@0x");
    expect(out).not.toMatch(/tsH91un/);
    expect(out).toContain(String.raw`\\.\pipe\ `.trim());
    const imports = await inventory(addon, { part: "imports", filter: "NamedPipe", skip: 0, max: 50 });
    expect(imports).toMatch(/KERNEL32\.dll ConnectNamedPipe/);
  });
});

describe.skipIf(!hasTargets || process.env.RE_GHIDRA !== "1")("ghidra", () => {
  test("decompile finds the function that uses the pipe prefix", { timeout: 900_000 }, async () => {
    // A dotted cache path (like ~/.cache) used to break Ghidra's project locator.
    process.env.REVERSE_ENGINEER_CACHE = join(isolateCache(), ".dotted", "cache");
    const out = await decompile(addon, { containing: "pipe", skip: 0, max: 60 });
    expect(out).toMatch(/ghidra: analyzed win_utils\.node/);
    expect(out).toMatch(/strings containing "pipe" \(\d+\)/);
    const listed = await decompile(addon, { skip: 0, max: 5 });
    expect(listed).toMatch(/functions \(\d+ with code/);
  });
});

describe.skipIf(apk === "" || !existsSync(apk))("managed APK", () => {
  test("jadx decompiles an APK and the manifest is summarized", { timeout: 900_000 }, async () => {
    isolateCache();
    const out = await managed(apk);
    expect(out).toMatch(/jadx: decompiled into .+ \(\d+ \.java files\)/);
    expect(out).toMatch(/manifest: package [\w.]+; \d+ components/);
    expect(out).not.toMatch(/packages \(\d+\): sources\./);
  });
});

describe.skipIf(dotnetDll === "" || !existsSync(dotnetDll))("managed", () => {
  test("ilspycmd decompiles a .NET assembly into the cache", { timeout: 600_000 }, async () => {
    isolateCache();
    const out = await managed(dotnetDll);
    expect(out).toMatch(/ilspycmd: decompiled into .+ \(\d+ \.cs files\)/);
  });
});
