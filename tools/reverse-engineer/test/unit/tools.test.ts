import { chmodSync, mkdirSync, statSync, truncateSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vite-plus/test";
import { tmpdir } from "node:os";
import { parseArgs } from "../../src/args";
import { ensureWorkRoot, ghidraWorkRoot } from "../../src/tools/decompile";
import {
  addonIdentifiers,
  collectChannels,
  electronSurface,
  inferRole,
  isChannelLike,
  shortCallee,
} from "../../src/tools/electronSurface";
import { locateElectron } from "../../src/formats/electron";
import { readSlice } from "../../src/tools/read";
import { globToRegExp, search, searchPath } from "../../src/tools/search";
import { triage } from "../../src/tools/triage";
import { buildAsar, buildPe, isolateCache, tempDir, writeTree } from "../helpers";

describe("channel heuristics", () => {
  test("isChannelLike accepts app channels and rejects URLs and modules", () => {
    expect(isChannelLike("notion:get-state")).toBe(true);
    expect(isChannelLike("tabs:set-zen-mode")).toBe(true);
    expect(isChannelLike("https://x")).toBe(false);
    expect(isChannelLike("node:fs")).toBe(false);
    expect(isChannelLike("12:30")).toBe(false);
    expect(isChannelLike("a:b")).toBe(false);
  });

  test("shortCallee drops minified prefixes; inferRole reads the callee name", () => {
    expect(shortCallee("s.appController.sendMainToAll")).toBe("appController.sendMainToAll");
    expect(shortCallee("Ie.handleEventFromRenderer.addListener")).toBe("handleEventFromRenderer.addListener");
    expect(inferRole("handleEventFromRenderer.addListener")).toBe("listen");
    expect(inferRole("appController.sendMainToAll")).toBe("send");
    expect(inferRole("getSimpleEmitter")).toBe("?");
  });

  test("collectChannels finds wrappers, Electron APIs and (0,x.y)(...) calls", () => {
    const text = [
      'o.ipcMain.handle("get-version",()=>1);',
      'Ie.handleEventFromRenderer.addListener("app:start",f);',
      '(0,c.sendToMain)("app:stop");',
      'require("node:fs");',
      'logger.info("app:noise");',
    ].join("\n");
    const uses = collectChannels([{ rel: "main.js", text, side: "main" }]);
    expect(uses.map((u) => `${u.callee} ${u.channel} ${u.where}`)).toEqual([
      "ipcMain.handle get-version main.js:1:1",
      "handleEventFromRenderer.addListener app:start main.js:2:1",
      "sendToMain app:stop main.js:3:1",
    ]);
  });

  test("collectChannels resolves calls on call results and stays linear on long identifier runs", () => {
    const text = 'getWin().webContents.send("app:shown");x?.y.on("app:hidden",f);';
    const uses = collectChannels([{ rel: "main.js", text, side: "main" }]);
    expect(uses.map((u) => `${u.callee} ${u.channel}`)).toEqual(["webContents.send app:shown", "on app:hidden"]);
    const blob = `a${"0123456789abcdef".repeat(50_000)};${"a.b".repeat(100_000)};`;
    const started = Date.now();
    collectChannels([{ rel: "blob.js", text: blob, side: "main" }]);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  test("addonIdentifiers keeps camelCase names and drops JS built-ins", () => {
    const data = Buffer.from(
      "\0getRunningInputAudioProcesses\0toString\0napi_create_function\0isWindowOccluded\0",
      "latin1",
    );
    expect(addonIdentifiers(data)).toEqual(["getRunningInputAudioProcesses", "isWindowOccluded"]);
  });
});

describe("electron_surface on a synthetic app", () => {
  test("reports entry, preload, addon calls and IPC", async () => {
    isolateCache();
    const dir = tempDir();
    const addon = Buffer.concat([buildPe({ dll: true }), Buffer.from("\0startMeetingWatch\0", "latin1")]);
    buildAsar(join(dir, "app.asar"), {
      "package.json": { content: '{"name":"demo","version":"1.2.3","main":"./dist/main"}' },
      "dist/main/index.js": {
        content:
          'const n=require("../native/watch.node");class MeetingController{start(){n.startMeetingWatch()}}\nI.handleEventFromRenderer.addListener("demo:start-meeting-watch",()=>{});s.app.sendToAll("demo:meeting-changed")',
      },
      "dist/preload.js": {
        content:
          'a.contextBridge.exposeInMainWorld("__demoApi",{start:()=>(0,r.sendToMain)("demo:start-meeting-watch")})',
      },
      "native/watch.node": { content: addon, unpacked: true },
    });
    writeTree(join(dir, "app.asar.unpacked"), { "native/watch.node": addon });
    const out = await electronSurface(join(dir, "app.asar"), { focus: "meeting,zzz" });
    expect(out).toContain("app: demo 1.2.3; main: ./dist/main -> dist/main/index.js");
    expect(out).toContain("dist/preload.js  exposes: __demoApi");
    expect(out).toMatch(/native\/watch\.node .*referenced at dist\/main\/index\.js:1:/);
    expect(out).toMatch(/startMeetingWatch \(x1 dist\/main\/index\.js:1:\d+\)/);
    expect(out).toContain("class MeetingController");
    expect(out).toMatch(
      /\[main\] handleEventFromRenderer\.addListener \(listen\) 1:\n {4}demo:start-meeting-watch {2}dist\/main\/index\.js:2:1/,
    );
    expect(out).toMatch(/\[preload\] sendToMain \(send\) 1:/);
    expect(out).toContain("demo:meeting-changed");
    expect(out).toContain("no Electron binary beside the archive");

    // One-letter words used to build an empty alternation that never advanced.
    const ignored = await electronSurface(join(dir, "app.asar"), { focus: "a,b" });
    expect(ignored).toContain('focus "a,b" ignored');
    expect(ignored).toContain("demo:meeting-changed");
  });
});

describe("locateElectron", () => {
  test("a resources directory or a macOS Contents/MacOS executable resolves to the app", async () => {
    const dir = tempDir();
    writeTree(dir, {
      "win/resources/app.asar": "x",
      "win/Demo.exe": "",
      "mac/Demo.app/Contents/Info.plist": "<plist/>",
      "mac/Demo.app/Contents/Resources/app.asar": "x",
      "mac/Demo.app/Contents/MacOS/Demo": "x",
    });
    truncateSync(join(dir, "win", "Demo.exe"), 21 * 1024 * 1024);
    const win = await locateElectron(join(dir, "win", "resources"));
    expect(win.asar).toBe(join(dir, "win", "resources", "app.asar"));
    expect(win.binaries).toEqual([join(dir, "win", "Demo.exe")]);
    const contents = join(dir, "mac", "Demo.app", "Contents");
    for (const input of [join(contents, "Resources"), join(contents, "MacOS", "Demo")]) {
      const mac = await locateElectron(input);
      expect(mac.asar?.toLowerCase()).toBe(join(contents, "Resources", "app.asar").toLowerCase());
      expect(mac.infoPlist).toBe(join(contents, "Info.plist"));
    }
  });
});

describe("search", () => {
  test("glob translation", () => {
    expect(globToRegExp("*.js").test("index.js")).toBe(true);
    expect(globToRegExp("*.js").test("a/index.js")).toBe(false);
    expect(globToRegExp(".webpack/**/*.js").test(".webpack/main/index.js")).toBe(true);
    expect(globToRegExp("*.{js,mjs}").test("x.mjs")).toBe(true);
  });

  test("finds hits in hidden folders with line and column, skips node_modules and binaries", async () => {
    const root = tempDir();
    writeTree(root, {
      ".webpack/main/index.js": 'line1\nfoo.exposeInMainWorld("api")',
      "node_modules/x/index.js": "exposeInMainWorld",
      "bin.dat": new Uint8Array([0, 1, 2, 0x65]),
    });
    const out = await searchPath(root, { pattern: "exposeInMainWorld", context: 10 });
    expect(out).toContain('.webpack/main/index.js:2:5: foo.exposeInMainWorld("api")');
    expect(out).not.toContain("node_modules");
    expect(out).toContain("1 matches in 1 files; 1 binary files skipped");
    const regex = await search.run(
      search.schema.parse({ path: root, pattern: "expose\\w+World", regex: true, include_deps: true }),
    );
    expect(regex).toContain("2 matches in 2 files");
  });

  test("searches a single binary file and reports offsets", async () => {
    const path = join(tempDir(), "a.bin");
    writeFileSync(path, Buffer.concat([Buffer.alloc(16), Buffer.from("/tmp/com.demo.lock"), Buffer.alloc(4)]));
    const out = await searchPath(path, { pattern: "com.demo", context: 4 });
    expect(out).toContain("a.bin@0x15: ");
  });
});

describe("read", () => {
  test("line range, column window, hexdump and directory listing", async () => {
    const dir = tempDir();
    writeTree(dir, { "a.js": "one\ntwo\nthree\nfour", "min.js": `${"x".repeat(100)}NEEDLE${"y".repeat(100)}` });
    writeFileSync(join(dir, "b.bin"), Buffer.from([0, 0x41, 0x42, 0xff]));
    expect(await readSlice(join(dir, "a.js"), { start: 2, end: 3 })).toMatch(/:2-3 \(4 lines\)\n2\| two\n3\| three$/);
    expect(await readSlice(join(dir, "min.js"), { start: 1, col: 101, length: 6 })).toMatch(
      /:1:101-106 \(line has 206 chars\)\nNEEDLE$/,
    );
    expect(await readSlice(join(dir, "b.bin"), {})).toContain("00000000  00 41 42 ff");
    expect(await readSlice(dir, {})).toContain("a.js");
  });
});

describe("triage", () => {
  test("file and directory", async () => {
    isolateCache();
    const dir = tempDir();
    writeFileSync(join(dir, "tool.exe"), Buffer.concat([buildPe(), Buffer.from("\xff Go buildinf:", "latin1")]));
    const file = await triage.run({ path: join(dir, "tool.exe") });
    expect(file).toContain("format: PE32+ x86-64 console executable");
    expect(file).toMatch(/markers: go-buildinfo@0x400/);
    expect(file).toContain("next: buildinfo(path)");
    const listing = await triage.run({ path: dir });
    expect(listing).toContain("tool.exe");
  });
});

describe("ghidraWorkRoot", () => {
  test("moves dotted cache paths to the temp directory", () => {
    process.env.REVERSE_ENGINEER_CACHE = join(tmpdir(), ".cache", "reverse-engineer");
    const uid = process.getuid?.();
    expect(ghidraWorkRoot()).toBe(
      join(tmpdir(), uid === undefined ? "reverse-engineer-ghidra" : `reverse-engineer-ghidra-${uid}`),
    );
    process.env.REVERSE_ENGINEER_CACHE = join(tmpdir(), "plain", "cache");
    expect(ghidraWorkRoot()).toBe(join(tmpdir(), "plain", "cache"));
  });

  test.runIf(process.getuid !== undefined)("the temp fallback must be private; the cache root needs not", async () => {
    const savedTmp = process.env.TMPDIR;
    process.env.TMPDIR = tempDir();
    try {
      // The user's own cache root, created 0755 by the other tools, is used as is.
      const cache = join(tempDir(), "plain", "cache");
      mkdirSync(cache, { recursive: true, mode: 0o755 });
      process.env.REVERSE_ENGINEER_CACHE = cache;
      expect(await ensureWorkRoot()).toBe(cache);
      // A dotted cache moves the work to a private temp folder, created 0700 before anything inside it.
      process.env.REVERSE_ENGINEER_CACHE = join(tempDir(), ".cache", "reverse-engineer");
      const work = await ensureWorkRoot();
      expect(statSync(work).mode & 0o777).toBe(0o700);
      // A shared folder that someone opened up is refused.
      chmodSync(work, 0o755);
      await expect(ensureWorkRoot()).rejects.toThrow(/not a private directory/);
    } finally {
      process.env.TMPDIR = savedTmp;
    }
  });
});

describe("cli", () => {
  test("parseArgs maps positional path, numbers, booleans and dashes", () => {
    expect(
      parseArgs(search as never, ["./x", "--pattern", "a b", "--max", "5", "--ignore-case", "--glob=*.js"]),
    ).toEqual({
      path: "./x",
      pattern: "a b",
      max: 5,
      ignore_case: true,
      glob: "*.js",
    });
    expect(() => parseArgs(search as never, ["--nope", "1"])).toThrow("unknown option --nope");
    // A boolean flag before the path must not take the path as its value.
    expect(parseArgs(search as never, ["--ignore-case", "./app.asar", "--pattern", "x"])).toEqual({
      path: "./app.asar",
      ignore_case: true,
      pattern: "x",
    });
    expect(parseArgs(search as never, ["--ignore-case", "false", "./a"])).toMatchObject({ ignore_case: false });
  });
});
