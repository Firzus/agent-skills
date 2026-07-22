# Config: Unified vite.config.ts, Check, Test, Build, Hooks

## Unified `vite.config.ts`

Vite+ consolidates every tool's config into a single `vite.config.ts`. Prefer the blocks below over legacy per-tool files — `vp migrate` exists to remove them.

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  // Vite (apps)
  server: {},
  build: {},
  preview: {},

  // Vite+ blocks
  test: {},     // Vitest
  lint: {},     // Oxlint
  fmt: {},      // Oxfmt
  check: {},    // defaults for composite `vp check` (--no-fmt / --no-lint)
  run: {},      // Vite Task
  pack: {},     // tsdown (libraries / CLIs)
  staged: {},   // staged-file checks
  create: {},   // scaffolding defaults
});
```

Config entry files import from `vite-plus`, not `vite` / `vitest/config`.

### Files Vite+ replaces

| Legacy file | Replaced by |
|-------------|-------------|
| `vitest.config.ts` | `test` block |
| `tsdown.config.ts` | `pack` block |
| `oxlint.config.*`, `.oxlintrc.json`, `eslint.config.*`, `.eslintrc.*` | `lint` block |
| `.oxfmtrc.json`, `.prettierrc`, `prettier.config.*` | `fmt` block |
| `lint-staged.config.*`, `.lintstagedrc.*` | `staged` block |

### Aliased dependencies

During install / migrate, Vite+ points `vite` at `@voidzero-dev/vite-plus-core` (same release as the running `vp`). Vitest comes through `vite-plus` (and optional direct pins + package-manager overrides). Legacy `@voidzero-dev/vite-plus-test` is removed by `vp migrate` — use `vite-plus/test*` instead.

Upgrade local pins with `vp migrate`. See [setup.md](./setup.md)#upgrading-vite and [monorepo-and-migration.md](./monorepo-and-migration.md)#migration-vp-migrate.

### Imports cheat sheet

```ts
import { defineConfig } from 'vite-plus';
import { describe, expect, it, vi } from 'vite-plus/test';
const { page } = await import('vite-plus/test/browser/context');
import type { OxlintOverride } from 'vite-plus/lint';
```

Import rewrite nuances (non-config `vite`, Nuxt, pnpm pins): → [monorepo-and-migration.md](./monorepo-and-migration.md). Config entry files use `vite-plus`; `vite-plus` exposes `defineConfig`, `defineProject`, and `lazyPlugins` as its own surface.

### Editor integration

```jsonc
// .vscode/settings.json
{ "oxc.fmt.configPath": "./vite.config.ts" }
```

## Check, lint & format

`vp check` runs format + lint + type-check in a single pass — faster than calling each tool, and the recommended validation command.

```bash
vp check
vp check --fix              # format + autofixers
vp check --no-fmt           # skip format; keep lint (+ type-check)
vp check --no-lint          # skip lint; keep type-check
vp check --no-fmt --no-lint # type-check only (requires lint.options.typeCheck)
```

Powered by [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) (Prettier-compatible), [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) (hundreds of ESLint-compatible rules), and [tsgolint](https://github.com/oxc-project/tsgolint) (type-aware checks via `tsgo`).

### Recommended base config

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    ignorePatterns: ['dist/**'],
    options: { typeAware: true, typeCheck: true },
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },
  fmt: {
    ignorePatterns: ['dist/**'],
    singleQuote: true,
    semi: true,
    sortPackageJson: true,
  },
});
```

`vp create`/`vp migrate` enable `typeAware` + `typeCheck` by default — keep both on so `vp check` is the single static-checks command.

### `check` block (composite defaults)

Skip a step for every `vp check` (including hooks that call it) without remembering CLI flags:

```ts
export default defineConfig({
  check: {
    fmt: false,  // vp check lints (+ type-checks) but does not format
    lint: true,  // default true
  },
});
```

These options only affect `vp check`. Standalone `vp fmt` / `vp lint` still run. There is no flag to re-enable a step disabled here — run the standalone command instead.

```bash
vp lint        # Oxlint only (+ --fix, --type-aware)
vp fmt         # Oxfmt in place (default); --check to verify; . --write explicit
```

For incomplete ESLint → Oxlint migrations, use Oxlint's [JS plugin support](https://oxc.rs/docs/guide/usage/linter/js-plugins).

## Testing (`vp test`)

`vp test` runs [Vitest](https://vitest.dev/) through Vite+, reusing the same Vite config and plugins.

```bash
vp test                       # single run (watch is opt-in via `vp test watch`)
vp test watch                 # watch mode
vp test run --coverage        # one-shot with coverage
vp test --reporter verbose    # extra args forwarded to Vitest
```

> **Watch is opt-in.** Unlike raw `vitest`, `vp test` does not stay in watch mode.

Config goes in the `test` block (no separate `vitest.config.ts`):

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: { reporter: ['text', 'html'] },
  },
});
```

Import tests from `vite-plus/test`:

```ts
import { describe, expect, it, vi } from 'vite-plus/test';
const { page } = await import('vite-plus/test/browser/context');
```

`vp migrate` rewrites these automatically (requires **Vitest 4.1+** and **Vite 8+**). Browser Mode: `vite-plus/test/browser/context`. Exceptions (Nuxt, etc.): → [monorepo-and-migration.md](./monorepo-and-migration.md).

## Building & packaging

| Command | For | Powered by |
|---------|-----|------------|
| `vp build` | **Applications** (SPAs, SSR, sites) | Vite 8 + Rolldown |
| `vp pack` | **Libraries** and **CLIs / binaries** | tsdown |

```bash
vp build
vp build --watch
vp preview         # serve the production build locally
```

Use standard Vite config (`build`, `server`, `preview`) — see [Vite config docs](https://vite.dev/config/). `vp build` always runs the built-in build; use `vp run build` for a custom script.

### `vp pack` (libraries & CLIs)

```bash
vp pack
vp pack src/index.ts --dts
vp pack --watch
```

Config in the `pack` block (no `tsdown.config.ts`):

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    dts: true,
    format: ['esm', 'cjs'],
    sourcemap: true,
  },
});
```

Covers [dts](https://tsdown.dev/options/dts), [output formats](https://tsdown.dev/options/output-format) (ESM/CJS/IIFE), [watch](https://tsdown.dev/options/watch-mode), and automatic `package.json` exports.

Standalone executables (tsdown's experimental [`exe`](https://tsdown.dev/options/exe#executable)):

```ts
export default defineConfig({ pack: { entry: ['src/cli.ts'], exe: true } });
```

`exe: true` requires **Node.js ≥ 25.7.0**.

**Choosing:** web host/CDN → `vp build`. npm package → `vp pack`. CLI `bin` → `vp pack` with `entry`. Native executable → `vp pack` with `exe: true` (and a new enough Node).

## Commit hooks & staged files

Vite+ ships its own staged-file runner, replacing `lint-staged` + `husky`.

```bash
vp config                          # install Git hooks into .vite-hooks/
vp staged                          # run checks on staged files
vp staged --fail-on-changes        # fail if autofix produced changes
```

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*.{js,ts,tsx,vue,svelte,json,md,css}': 'vp check --fix',
  },
});
```

The `staged` block is the only supported format. `vp check --fix` reuses the same `lint`/`fmt` blocks, so staged behavior stays aligned with project rules. When hooks are installed via `vp config`, `vp staged` runs automatically on commit.
