# reverse-engineer server

The read-only MCP server and CLI behind the [reverse-engineer](../../skills/engineering/reverse-engineer/SKILL.md) skill. The skill is the agent-facing entry point; this server replaces the commands that are missing or fragile on a given platform (`otool`, `strings`, `jq`, `go version -m`, asar extraction) with TypeScript parsers, and answers in at most 8 KB with citable locations. Installing the skill does not install the server.

## Tools

| Tool               | What it returns                                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `triage`           | Format by magic bytes, architecture, size, SHA-256, markers (Go, Rust, Electron fuses, N-API, packers) and the next call                                                                                   |
| `electron_surface` | Cached asar extraction, `main`, preloads and `exposeInMainWorld` keys, `.node` addons and the addon names called from JS, IPC channels grouped by call site (app wrappers included), fuses, asar integrity |
| `search`           | Bounded search in a tree, a `.asar` or one file (hidden folders included), with `file:line:col` or `file@offset` and a short excerpt                                                                       |
| `read`             | Line ranges, a column window for minified code (instead of reformatting it), hexdumps                                                                                                                      |
| `binary_inventory` | PE, ELF and Mach-O sections, libraries and imports, exports, Node addon names, ASCII and UTF-16 strings, PE resources                                                                                      |
| `buildinfo`        | Go build info (toolchain, main package, module, settings, dependencies) and Rust cargo-auditable packages                                                                                                  |
| `decompile`        | Ghidra headless, cached per file: list functions, map a string to the functions that use it, return one function's C                                                                                       |
| `managed`          | .NET (via `ilspycmd`) and APK/DEX/JAR (via `jadx`): decompile once, summarize, return one type                                                                                                             |

The catalog is about 6 KB for the 8 tools; the skill is about 5.5 KB.

Design rules:

- **Compact by default.** Each answer stays under `REVERSE_ENGINEER_MAX_BYTES` (8192). Longer output is written to the cache, and the answer ends with its path, so `read` and `search` can page through it.
- **Cited facts.** Every location is `file:line:col`, `file@0xoffset`, a symbol or a string.
- **No blocking on common cases.** A `.node` file signed after packaging shows up as an unverified hash, not as an error. Malformed or hostile binaries degrade to partial results instead of hanging.
- **Read-only.** The tools never run the target. They write only to their cache: `%LOCALAPPDATA%\reverse-engineer\cache`, `~/Library/Caches/reverse-engineer`, or `$XDG_CACHE_HOME/reverse-engineer` (override with `REVERSE_ENGINEER_CACHE`). Exceptions: Ghidra refuses project paths with a dot folder, so with such a cache path (the Linux default `~/.cache`) its projects go to a private per-user folder in the temp directory; when the cache path contains a space, Ghidra keeps its settings in the home folder; jadx and the .NET SDK may write their own settings there on first use.
- **Cache by SHA-256.** An extraction or an analysis is reused.

## Use

Requirements: Node.js 24.11 or later. Optional: Ghidra 11+ with JDK 21 for `decompile`, `ilspycmd` (.NET 10 SDK) and `jadx` (JDK 21) for `managed`. The agent can install them with the skill's [install guide](../../skills/engineering/reverse-engineer/references/install-tools.md): official releases go into a per-user tools root (`%LOCALAPPDATA%\reverse-engineer\tools`, `~/Library/Application Support/reverse-engineer/tools`, or `$XDG_DATA_HOME/reverse-engineer/tools`; override with `REVERSE_ENGINEER_TOOLS`), without admin rights or a `PATH` change. The tools look there first, then on `PATH`, `GHIDRA_INSTALL_DIR` and the usual install folders.

The package is published to npm as an alpha prerelease, [`reverse-engineer`](https://www.npmjs.com/package/reverse-engineer), and listed in the MCP Registry as `io.github.Firzus/reverse-engineer`. Pin the exact version:

```sh
npx -y reverse-engineer@0.1.0-alpha.1 triage ./some.exe
npx -y reverse-engineer@0.1.0-alpha.1 electron_surface "C:\Program Files\App" --focus audio,microphone
```

Claude Code MCP configuration (project `.mcp.json`):

```json
{
  "mcpServers": {
    "reverse-engineer": {
      "command": "npx",
      "args": ["-y", "reverse-engineer@0.1.0-alpha.1", "mcp"]
    }
  }
}
```

On Windows, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "reverse-engineer@0.1.0-alpha.1", "mcp"]`. To run an unreleased build from a clone, run the [Develop](#develop) commands, then point the configuration at `node <checkout>/tools/reverse-engineer/dist/cli.mjs mcp`.

Install the skill with `npx skills add Firzus/agent-skills --skill reverse-engineer`.

## Develop

The toolchain is [Vite+](https://viteplus.dev) (`vite-plus`, local dev dependency). `.github/workflows/reverse-engineer-check.yml` runs the same checks on Windows, macOS and Linux:

```sh
npm install
npx vp check    # format, lint, type check
npx vp test     # unit tests on synthetic and hostile fixtures
npx vp pack     # bundle dist/cli.mjs, a single file with no runtime dependency
```

Tests against real targets are opt-in: set `RE_TARGETS` (a folder with `app.asar`, `app.asar.unpacked/` and `gh.exe`), `RE_NOTION_DIR` (an installed Notion app), `RE_GHIDRA=1`, `RE_DOTNET_DLL`, or `RE_APK`.

## Release

Publication to npm and the MCP Registry requires the maintainer's explicit approval. From a clean checkout of the reviewed commit on `main`:

1. Set the same version in `package.json`, `package-lock.json`, `server.json`, the pinned commands above and in the skill's `SKILL.md`; a unit test checks the first three. When `vp pack` reports a new bundled dependency, add its license to `THIRD_PARTY_NOTICES.md`.
2. Run the [Develop](#develop) checks, then `npm pack` (it rebuilds `dist/`) and inspect the tarball: `LICENSE`, `README.md`, `THIRD_PARTY_NOTICES.md`, `dist/cli.mjs`, `ghidra/ExportDecompiled.java`, `package.json`.
3. Recheck the name on npm (a 404 is not a reservation), then `npm publish <tarball>`. `publishConfig` applies the `alpha` tag and public access. In an empty folder, run `npx -y reverse-engineer@<version> --version`.
4. Run `mcp-publisher login github`, then `mcp-publisher publish` from this folder, and check the entry at `https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.Firzus/reverse-engineer`.

Never overwrite or unpublish a version to hide a failed release; publish a new one.

## Benchmark

`bench/` adapts the harness from [leanrea](https://github.com/aicodeking/leanrea) to Windows and compares four arms: no skill, leanrea, REA (MCP and skill), and this tool. See [bench/BENCHMARK.md](bench/BENCHMARK.md) for the method, the results and their limits.

## License

MIT. The benchmark tasks and harness are adapted from leanrea, MIT-licensed; its notice is in [bench/LICENSE-leanrea](bench/LICENSE-leanrea). Fuse names and the Go build-info layout follow the public formats documented by Electron and the Go toolchain; no code is copied from REA.
