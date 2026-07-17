# Setup: Install, Runtime, Dependencies, Scaffolding, Upgrade

Everything to get a Vite+ project running and kept up to date.

## Install the global `vp`

```bash
curl -fsSL https://vite.plus | bash      # macOS / Linux
irm https://vite.plus/ps1 | iex          # Windows (PowerShell)
```

Alternatively download [`vp-setup.exe`](https://setup.viteplus.dev/). Open a **new shell**, then verify with `vp help`.

- **CI:** use the [`setup-vp`](https://github.com/voidzero-dev/setup-vp) GitHub Action (prefer it over the shell installer in CI).
- **Uninstall:** `vp implode` removes `vp` and Vite+ data from the machine.

### Platform support

- **Tier 1:** Linux x64/arm64 glibc, Windows x64, macOS x64/arm64
- **Tier 2:** Windows arm64 · **Experimental:** Linux x64 musl · **Other:** Linux arm64 musl
- On Alpine (musl): `apk add libstdc++` first.

## Managed runtime (`vp env`)

Vite+ defaults to **managed mode**: shims for `node`/`npm`/`npx` resolve through Vite+ and pick the right Node.js version per project.

| Mode | Command | Behavior |
|------|---------|----------|
| Managed (default) | `vp env on` | Shims always use Vite+-managed Node.js |
| System-first | `vp env off` | Shims prefer system Node.js, fall back to managed |

Managed runtime lives under `~/.vite-plus` (override with `VP_HOME`).

### Per-project Node.js version

Resolved in priority order:

1. `.node-version` (current or parent directories)
2. `devEngines.runtime` in `package.json`
3. `engines.node` in `package.json`
4. Global default (`vp env default`), then latest LTS

`VP_NODE_DIST_MIRROR` is a **download mirror** for Node.js dist archives (version still comes from the list above). Set it when installing behind a corporate proxy.

`vp env pin` is source-aware: updates an existing `.node-version` if present, otherwise writes `package.json#devEngines.runtime`; only creates `.node-version` when there is no `package.json`. Force with `--target node-version` / `--target dev-engines`. Leaves an existing `engines.node` unchanged.

```bash
vp env pin lts        # pin project version
vp env install        # install version from the pin / package.json
vp env default lts    # global default version
vp env use 20         # version for current shell only
vp env unpin          # remove the pin
vp env current        # resolved environment
vp env doctor         # diagnose conflicting version sources
vp env which node     # which binary is used
```

> **PowerShell:** to make `vp env use` affect only the current shell, dot-source once: `. "$env:USERPROFILE\.vite-plus\env.ps1"` (add to `$PROFILE` to persist).

### Corporate mirror

```bash
export VP_NODE_DIST_MIRROR=https://my-mirror.example.com/nodejs/dist
vp env install 22
```

## Dependencies (`vp install` & friends)

`vp install`, `vp add`, `vp remove`, etc. wrap whichever package manager the project uses.

### Detection order

1. `packageManager` in `package.json`
2. `devEngines.packageManager` in `package.json`
3. `pnpm-workspace.yaml`
4. `pnpm-lock.yaml`
5. `yarn.lock` or `.yarnrc.yml`
6. `package-lock.json`
7. `bun.lock` or `bun.lockb`
8. `.pnpmfile.cjs` or `pnpmfile.cjs`
9. `bunfig.toml`
10. `yarn.config.cjs`

Falls back to **pnpm** if nothing matches; the matching package manager is downloaded automatically. When detection comes from a lockfile/config, the resolved version is written to `devEngines.packageManager` for determinism (existing `packageManager` / `devEngines.packageManager` are left as-is).

```json
{ "packageManager": "pnpm@9.12.0" }
```

Or a semver range (stays the source of truth; Vite+ leaves the range unfrozen):

```json
{ "devEngines": { "packageManager": { "name": "pnpm", "version": "^11.0.0", "onFail": "download" } } }
```

When both are set, `packageManager` drives selection and `vp env doctor` warns on mismatch.

### Core commands

```bash
vp install                      # install per package.json + lockfile
vp install --frozen-lockfile    # fail if lockfile would change
vp install --lockfile-only      # update lockfile without installing
vp install --prefer-offline     # prefer cached packages
vp install --ignore-scripts     # skip lifecycle scripts
vp install --filter <pkg>       # monorepo scope
vp install -w                   # workspace root

vp add react
vp add -D typescript vitest     # devDependencies
vp add -O fsevents              # optionalDependencies
vp add --save-peer react

vp remove react
vp update                       # bump dependencies
vp dedupe                       # collapse duplicates
vp outdated                     # available updates
vp list / vp why <pkg> / vp info <pkg>
vp rebuild                      # rebuild native modules
vp link / vp unlink             # local dev links
```

Global packages: `vp install -g <pkg>`, `vp uninstall -g <pkg>`, `vp update -g`, `vp list -g`. Globals live under `VP_HOME/packages` (not the package manager's global directory).

### Escape hatch & native rebuilds

```bash
vp pm config get registry       # forward raw to the package manager
vp pm exec tsc --version
vp rebuild                       # after switching Node.js versions
vp rebuild -- --update-binary
```

`vp rebuild` is shorthand for `vp pm rebuild`. With pnpm v10+, bare `vp rebuild` only rebuilds packages in `onlyBuiltDependencies`; name a package explicitly to bypass the approval gate.

## Scaffolding (`vp create`)

```bash
vp create                       # interactive
vp create <template>
vp create <template> -- <opts>  # forward flags to the template
```

| Built-in template | Purpose |
|-------------------|---------|
| `vite:monorepo` | New monorepo |
| `vite:application` | New application |
| `vite:library` | New library |
| `vite:generator` | New code generator (monorepo only) |

- **Shorthands:** `vite`, `@tanstack/start`, `svelte`, `next-app`, `nuxt`, `react-router`, `vue`… (`vp create --list`).
- **Full specifiers:** `create-vite`, `create-next-app`, `github:user/repo`, `https://github.com/user/repo`.
- **Useful flags:** `--directory <path>`, `--agent <name>`, `--editor <name>`, `--hooks`/`--no-hooks`, `--no-interactive` (CI), `--approve-builds`.

```bash
vp create vite -- --template react-ts
vp create --agent claude --editor vscode
```

### Organization templates

An org publishes curated templates via an `@org/create` package carrying a `createConfig.templates` manifest in `package.json`:

```bash
vp create @your-org            # picker over the manifest
vp create @your-org:web        # direct entry
vp create @your-org@1.2.3      # pin version
```

Set a repo default with `create.defaultTemplate: '@your-org'` in `vite.config.ts`. Manifest entries: `name` (kebab, unique), `description`, `template` (npm specifier / `github:` / `vite:*` / local path), optional `monorepo`. Invalid manifests are a hard error.

## Upgrading Vite+

```bash
vp upgrade                      # the global vp binary
vp migrate                      # re-pin local vite-plus, vite→core alias, and vitest pin
```

For an existing Vite+ project, `vp migrate` is the recommended local re-pin (toolchain upgrade only; `--full` re-runs setup). Details — what gets re-pinned, legacy `-test` removal, hand-upgrade recovery — live in [monorepo-and-migration.md](./monorepo-and-migration.md)#migration-vp-migrate. Confirm with `vp --version` and `vp outdated`.
