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

- Pin with `.node-version` at the project root (created by `vp env pin lts` or `vp env pin 22`)
- Install the pinned version with `vp env install`
- `vp install`, `vp dev`, `vp build`, etc. automatically pick up the right runtime

```bash
vp env pin lts            # write `.node-version`
vp env install            # install the version from .node-version or package.json
vp env default lts        # set the global default version
vp env use 20             # set version for current shell only
vp env current            # show resolved environment
vp env which node         # show which binary is used
```

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
