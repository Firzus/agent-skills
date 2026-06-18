# Getting Started

Install `vp` once globally, then use it across every project.

## Install

### macOS / Linux

```bash
curl -fsSL https://vite.plus | bash
```

### Windows (PowerShell)

```powershell
irm https://vite.plus/ps1 | iex
```

Alternatively download [`vp-setup.exe`](https://setup.viteplus.dev/). If SmartScreen warns about the installer, review the prompt and use **More info → Run anyway** only when you trust the source.

### CI

Use the [`setup-vp`](https://github.com/voidzero-dev/setup-vp) GitHub Action — do **not** `curl` the install script in CI.

After install, open a new shell and verify:

```bash
vp help
```

## Managed vs System-First Mode

Vite+ defaults to **managed mode**: shims for `node`, `npm`, `npx` resolve through Vite+ and pick the right Node.js version for the current project.

| Mode | Command | Behavior |
|------|---------|----------|
| Managed | `vp env on` (default) | Shims always use Vite+-managed Node.js |
| System-first | `vp env off` | Shims prefer system Node.js, fall back to managed |

Managed runtime + downloads live under `~/.vite-plus` by default. Override with the `VP_HOME` environment variable.

## Per-Project Node.js

The project Node.js version is resolved in this priority order:

1. `VP_NODE_DIST_MIRROR` (custom mirror)
2. `.node-version` (current or parent directories)
3. `devEngines.runtime` in `package.json`
4. `engines.node` in `package.json`
5. Global default (`vp env default`), then latest LTS

`vp env pin` is source-aware: it updates an existing `.node-version` if present, otherwise writes to `package.json#devEngines.runtime`; it only creates `.node-version` when there is no `package.json`. Force the target with `--target node-version` or `--target dev-engines`. An existing `engines.node` is never modified.

```bash
vp env pin lts            # pin project version (devEngines.runtime or .node-version)
vp env install            # install the version from the pin / package.json
vp env default lts        # set the global default version
vp env use 20             # set version for current shell only
vp env unpin              # remove the pin from wherever it was written
vp env current            # show resolved environment
vp env doctor             # diagnose conflicting version sources
vp env which node         # show which binary is used
```

> **PowerShell:** to make `vp env use` affect only the current shell, dot-source the generated script once: `. "$env:USERPROFILE\.vite-plus\env.ps1"` (add it to your `$PROFILE` to persist).

## Corporate Mirror

Behind a proxy / Artifactory, point Node.js downloads at your mirror:

```bash
export VP_NODE_DIST_MIRROR=https://my-mirror.example.com/nodejs/dist
vp env install 22
```

Add the export to `~/.zshrc` / `~/.bashrc` to make it permanent.

## Platform Support

Prebuilt binaries (grouped by Node.js v24 tier):

- **Tier 1:** Linux x64 glibc, Linux arm64 glibc, Windows x64, macOS x64, macOS arm64
- **Tier 2:** Windows arm64
- **Experimental:** Linux x64 musl
- **Other:** Linux arm64 musl

On Alpine (musl), install `libstdc++` first: `apk add libstdc++`.

## Uninstall

```bash
vp implode
```

Removes `vp` and Vite+ data from the machine.

## Quick Start

```bash
vp create        # scaffold a new project
vp install       # install dependencies
vp dev           # start dev server
vp check         # format + lint + type-check
vp test          # run tests
vp build         # build for production
```
