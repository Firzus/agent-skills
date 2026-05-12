# Package Management

`vp install`, `vp add`, `vp remove`, etc. wrap whichever package manager the project uses.

## Detection Order

Vite+ resolves the package manager from the workspace root in this order:

1. `packageManager` in `package.json`
2. `pnpm-workspace.yaml`
3. `pnpm-lock.yaml`
4. `yarn.lock` or `.yarnrc.yml`
5. `package-lock.json`
6. `bun.lock` or `bun.lockb`
7. `.pnpmfile.cjs` or `pnpmfile.cjs`
8. `bunfig.toml`
9. `yarn.config.cjs`

If nothing matches, Vite+ falls back to **pnpm**. The matching package manager is downloaded automatically.

To pin a specific package manager + version, set `packageManager` in `package.json`:

```json
{
  "packageManager": "pnpm@9.12.0"
}
```

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
