# Package Management

`vp install`, `vp add`, `vp remove`, etc. wrap whichever package manager the project uses.

## Detection Order

Vite+ resolves the package manager from the workspace root in this order:

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

If nothing matches, Vite+ falls back to **pnpm**. The matching package manager is downloaded automatically. When detection comes from a lockfile or config file, the resolved version is written to `devEngines.packageManager` for determinism; projects that already declare `packageManager` or `devEngines.packageManager` are left as-is.

To pin a specific package manager + version, set `packageManager` in `package.json`:

```json
{
  "packageManager": "pnpm@9.12.0"
}
```

Or declare a semver range via `devEngines.packageManager` (stays the source of truth, never frozen into an exact pin):

```json
{
  "devEngines": {
    "packageManager": { "name": "pnpm", "version": "^11.0.0", "onFail": "download" }
  }
}
```

When both are set, `packageManager` drives selection and Vite+ warns (`vp env doctor`) if it does not satisfy the `devEngines` range.

## Core Commands

```bash
vp install                         # install per package.json + lockfile
vp install --frozen-lockfile       # fail if lockfile would change
vp install --no-frozen-lockfile    # allow lockfile updates
vp install --lockfile-only         # update lockfile without installing
vp install --prefer-offline        # prefer cached packages
vp install --offline               # require cached packages
vp install --ignore-scripts        # skip lifecycle scripts
vp install --filter <pkg>          # monorepo scope
vp install -w                      # install in workspace root

vp add react
vp add -D typescript vitest        # devDependencies
vp add -O fsevents                 # optionalDependencies
vp add --save-peer react

vp remove react
vp remove --filter web react

vp update                          # bump dependencies
vp dedupe                          # collapse duplicates
vp outdated                        # list available updates
vp list                            # installed packages
vp why <pkg>                       # why is <pkg> installed?
vp info <pkg>                      # registry metadata
vp rebuild                         # rebuild native modules
vp link / vp unlink                # local dev links
```

## Global Packages

```bash
vp install -g typescript
vp uninstall -g typescript
vp update -g
vp list -g
```

## Escape Hatches

- `vp pm <cmd>` — forward directly to the resolved package manager
  ```bash
  vp pm config get registry
  vp pm cache clean --force
  vp pm exec tsc --version
  ```
- `vp dlx <pkg>` — run a package binary without saving it as a dependency
  ```bash
  vp dlx create-vite
  vp dlx typescript tsc --version
  ```

## After Switching Node.js Versions

If native modules fail to load (e.g. `sharp`, `bcrypt`, `better-sqlite3`):

```bash
vp rebuild
vp rebuild -- --update-binary
```

`vp rebuild` is shorthand for `vp pm rebuild`.
