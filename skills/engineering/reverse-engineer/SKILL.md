---
name: reverse-engineer
description: Reverse engineer shipped software quickly with compact, cited evidence. Covers Electron/asar apps, native PE/ELF/Mach-O binaries and Node addons, Go/Rust/.NET binaries, APKs and minified JS bundles. Use to explain how a feature works, trace IPC channels and native calls, extract versions and dependencies, or decompile one function.
---

# reverse-engineer

The `reverse-engineer` MCP tools never run the target. They write only to their own cache, plus a private Ghidra work folder in the temp directory when the cache path contains a dot folder such as `~/.cache`; the third-party tools keep their own settings in the home folder. Every fact they return cites `file:line:col`, `file@0xoffset`, a symbol or a string. A long result ends with a cache file path: page it with `read` or filter it with `search` instead of calling the tool again. Installing this skill does not install the server (the npm package `reverse-engineer`, source in `mcp/reverse-engineer` of https://github.com/Firzus/agent-skills): when its tools are not available, use [Without the MCP server](#without-the-mcp-server).

## Rules

- Turns cost more than bytes. Plan 2 to 4 calls: one map call, one or two targeted slices, then answer. Stop as soon as every requested item has evidence: a fact a tool already showed needs no second check.
- Route first: `triage(path)` on an unknown file or folder; skip it when the prompt already names the type.
- Search, then read slices around the hits. Minified code: `read(path, start=LINE, col=COL, length=1500)` around a hit.
- Answer from evidence. Mark each claim **seen** (cite file:line:col, file@offset, a symbol or a string), **inferred**, or **unknown**. Not found means unknown, not absent. Static reading is not observed execution.
- Work on the given files. Never launch the target unless the user asks.

## First move

| Target | Call | Then |
|---|---|---|
| Electron app: app dir, `resources/`, or `app.asar` | `electron_surface(path, focus=<word,synonym>)` | usually answer; else one `read` at a cited location |
| Unknown file or folder | `triage(path)` | follow its `next:` line |
| JS bundle or any source tree | `search(path, pattern, regex?, glob?)` | `read(path, start, col)` |
| Native binary or `.node` addon | `binary_inventory(path)` | `binary_inventory(path, part=strings, filter=RE)`; `decompile` for logic |
| Go or Rust binary | `buildinfo(path, filter=DEP)` | nothing else for versions |
| Logic inside native code | `decompile(path, containing=STRING)` | `decompile(path, function=ADDRESS)` |
| .NET assembly, APK, DEX, JAR | `managed(path)` | `managed(path, type=Name)` or `search(root, ...)` |

Tool notes:
- `electron_surface`: `focus` filters IPC channels and lists matching identifiers in main and preload code, classes first with their method names. Give two or three short stems from the question and their synonyms, comma-separated (`audio,microphone,mic`). The addon section lists names that the addon contains and that JS calls: the JS to native boundary. IPC is grouped by call site, including app wrappers; the listen/send role is inferred from the callee name. Hash mismatches on unpacked `.node` files are common (signed after packaging): report them as unverified, not as tampering.
- `binary_inventory`: the summary shows imports per library (the capability map), exports, the JS-visible names of a Node addon, and notable strings with offsets.
- `decompile`: the first call runs a Ghidra analysis (about a minute for 1 MB) and caches every function; later calls are instant. `containing` maps a string to the functions that use it. Decompiled code is inferred structure: name what it calls (APIs, constants, strings).

## Without the MCP server

With Node.js 24.11+, the same tools run as a CLI: `npx -y reverse-engineer@0.1.0-alpha.2 <tool> <path> --pattern X --glob '*.js'`. Otherwise use the shell (batch independent probes in one call with `echo '--- name'` markers and cap output with `head`):

| Need | Windows (Git Bash or PowerShell) | macOS / Linux |
|---|---|---|
| Extract asar | `npx -y @electron/asar extract app.asar X` | same |
| Search extracted code | `rg -uu -o '.{0,150}NEEDLE.{0,150}' X --glob '!node_modules'` | same |
| Strings of a binary | `rg -a -o '[ -~]{6,}' F` | `strings -a -n 6 F` |
| Imports, exports | `dumpbin /imports /exports F` (Visual Studio) | `otool -L`, `nm -gU`, `nm -u`; `readelf -dW`, `nm -D` |
| Go build info | `go version -m F`; without Go, the `rg` line below | same |
| Decompile | Ghidra `analyzeHeadless` with a post script that exports C, such as `mcp/reverse-engineer/ghidra/ExportDecompiled.java` | same, or `r2 -qc 'aaa; pdc @ sym.X' F` |
| .NET / APK | `ilspycmd -p -o X F` / `jadx -d X a.apk`, then search | same |

```sh
rg -a -o '(path|mod|dep)\t[^\t]+\t?[^\t]*' F   # Go build info without Go
```

Tools installed per user (see below) are not on `PATH`: call them by full path, such as `<tools root>/jadx/bin/jadx` or `<tools root>/ghidra_*/support/analyzeHeadless`, with `JAVA_HOME` set to `<tools root>/jdk-21*` (macOS: its `Contents/Home`).

## Missing third-party tools

`decompile` needs Ghidra and JDK 21; `managed` needs jadx and JDK 21, or ilspycmd. When one of them reports a missing tool, or the shell route needs one, install it with [references/install-tools.md](references/install-tools.md) (per-user, no admin rights, no restart), and meanwhile keep going with `triage`, `binary_inventory` and `search`.

## Speed patterns

- Electron features: go from the native boundary inward. Addon function, then the calling class, then the IPC registration in main, then the preload that exposes it.
- A channel has a producer and a consumer; `electron_surface` lists both sides with locations.
- Imports and strings usually explain a small binary before any decompilation.
- Comparing versions: diff inventories (channels, addon names, dependencies) before code.
