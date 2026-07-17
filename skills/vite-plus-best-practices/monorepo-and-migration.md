# Monorepo & Migration

## Monorepo

A single root `vite.config.ts` drives lint, fmt, staged checks, and tasks for the whole workspace. Each package can still keep its own `vite.config.ts` for Vite / Vitest / framework config.

### Root config pattern

```ts
// vite.config.ts (workspace root)
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    plugins: ['typescript'],
    options: { typeAware: true, typeCheck: true },
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
    overrides: [
      {
        files: ['apps/web/**', 'packages/ui/**'],
        plugins: ['typescript', 'react'],
        rules: { 'react/self-closing-comp': 'error' },
      },
      { files: ['apps/api/**'], env: { node: true }, rules: { 'no-console': 'off' } },
      {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        plugins: ['typescript', 'vitest'],
        rules: { 'vitest/no-disabled-tests': 'error' },
      },
    ],
  },
});
```

Globs in `overrides[].files` resolve from the root `vite.config.ts`. Use workspace-relative paths (`apps/web/**`).

> **Plugin replacement.** When an override sets `plugins`, it **replaces** the base `lint.plugins` for the matched files — include every plugin needed (e.g. `['typescript', 'react']`). Omit `plugins` to inherit the base list. This trips up most ESLint-flat-config migrations.

### Format overrides

```ts
export default defineConfig({
  fmt: {
    singleQuote: true,
    semi: true,
    overrides: [
      { files: ['apps/api/**'], options: { printWidth: 120 } },
      { files: ['**/*.md'], options: { proseWrap: 'always' } },
    ],
  },
});
```

`fmt.overrides` puts settings under `options`.

### Composing configuration

Split shared lint/fmt fragments into modules and import them, using the exported `OxlintOverride` type:

```ts
// tooling/lint/react.ts
import type { OxlintOverride } from 'vite-plus/lint';

export const reactLint = {
  plugins: ['typescript', 'react'],
  rules: { 'react/self-closing-comp': 'error' },
} satisfies Omit<OxlintOverride, 'files'>;
```

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';
import { reactLint } from './tooling/lint/react';

export default defineConfig({
  lint: {
    plugins: ['typescript'],
    options: { typeAware: true, typeCheck: true },
    overrides: [{ files: ['apps/web/**', 'packages/ui/**'], ...reactLint }],
  },
});
```

### Workspace execution

```bash
vp run build                          # current package only
vp run @my/app#build                  # target a specific package
vp run -r build                       # all packages, dependency order
vp run -t @my/app#build               # one package + all its deps
vp run --filter @my/app build         # by name
vp run --filter "@my/*" build         # by glob
vp run --filter ./packages/app build  # by directory
vp run --filter "@my/app..." build    # include dependencies
vp run --filter "...@my/core" build   # include dependents
vp run --filter "@my/*" --filter "!@my/utils" build  # exclude
vp run -w build                       # workspace root
```

Multiple `--filter` flags union; exclusions apply after inclusions.

```bash
vp run -r --concurrency-limit 8 build   # cap parallel tasks (env: VP_RUN_CONCURRENCY_LIMIT, default 4)
vp run -r --concurrency-limit 1 build   # serial
vp run -r --parallel dev                # ignore deps, unlimited
vp run -r -v build                      # detailed execution summary
```

### App-level commands

Built-in Vite commands accept a folder; per-app behavior can live in package scripts run via `vp run`:

```bash
vp dev apps/web
vp build apps/web
vp run -r build               # all packages, dep order
vp run -r --parallel dev      # all packages, ignore deps
```

A root script `"build": "vp run -r build"` would normally recurse — Vite Task detects and prunes the self-reference automatically.

## Migration (`vp migrate`)

Consolidates separate Vite, Vitest, Oxlint, Oxfmt, ESLint, Prettier, lint-staged, and tsdown setups into Vite+. On a project that already uses `vite-plus`, the same command is the recommended **local upgrade** path.

### Upgrade re-pin (existing Vite+ projects)

```bash
vp upgrade    # global CLI first
vp migrate    # re-pin local toolchain (skip first-time setup); --full also re-runs setup
```

What migrate re-pins:

- `vite-plus` to the version bundled by the running global `vp`
- the `vite` → `@voidzero-dev/vite-plus-core` alias to the matching release
- the workspace **vitest override/resolution pin** to the bundled Vitest version

Imports use `vite-plus/test*`. Migrate removes legacy `@voidzero-dev/vite-plus-test` everywhere. If you bumped `vite-plus` by hand without migrate, re-pin `vitest` in the package-manager override block (or re-run `vp migrate`) so the project and `vp test` share one Vitest copy.

### Pre-requisites

- Run `vp upgrade` so the global CLI has the latest migration rules.
- Upgrade to **Vite 8+** and **Vitest 4.1+** *before* running `vp migrate` on a non-Vite+ project.
- Audit any existing lint/format/test setup to preserve.

```bash
vp migrate                       # current dir
vp migrate my-app                # specific dir
vp migrate --no-interactive      # no prompts (CI / agents)
vp migrate --agent claude --editor zed
vp migrate --full                # existing Vite+ project: also re-run setup actions
```

### What it does

- Updates dependencies; rewrites imports where needed (`vite` → `vite-plus` in **config entry files**; `vitest` → `vite-plus/test*`)
- Merges tool-specific configs into `vite.config.ts` blocks
- Updates `package.json` scripts to the Vite+ command surface
- Optionally sets up commit hooks and agent/editor config
- Removes legacy `@voidzero-dev/vite-plus-test` aliases/deps everywhere

Expect manual follow-ups for non-trivial projects.

### Verification loop

```bash
vp install && vp check && vp test && vp build
```

### Tool-specific migrations

**Vitest** — `vite-plus` re-exports upstream `vitest@4.x` under `vite-plus/test*`, so a single `vite-plus` install is enough for node-mode tests. By hand:

```ts
// before
import { describe, it } from 'vitest';
import { playwright } from '@vitest/browser-playwright';
const { page } = await import('@vitest/browser/context');

// after
import { describe, it } from 'vite-plus/test';
import { playwright } from 'vite-plus/test/browser-playwright';
const { page } = await import('vite-plus/test/browser/context');
```

> Remove obsolete `vitest` / `@vitest/browser*` deps **only after** rewrites are verified — and only where migrate removed them. Under **pnpm**, migrate often **keeps or adds** a direct `vite` entry aliased to `@voidzero-dev/vite-plus-core` so peers resolve correctly; treat that entry as intentional.
>
> **Browser providers stay opt-in.** `vite-plus` bundles `@vitest/browser` + `@vitest/browser-preview`. Playwright/WebdriverIO providers stay separate — install the provider and its peer (`playwright` / `webdriverio`) yourself, pinned to the bundled vitest version.
>
> **Leave type augmentations on upstream.** Keep `declare module 'vitest'` / `declare module '@vitest/browser*'` pointing at the upstream module — `vite-plus/test*` is a thin re-export.
>
> **Nuxt exception.** Packages that declare `@nuxt/test-utils` keep `vitest` / `vitest/*` import identity package-wide (Nuxt's transform needs the upstream module). Scoped `@vitest/browser*` imports still rewrite.

**vite imports** — only config entry files (`vite.config.*`, `vitest.config.*`, and configs migrate resolved) rewrite `vite` → `vite-plus`. Other files keep `vite` imports (they resolve via the core alias). Prefer `vite` for pass-through Vite APIs outside config — `vite-plus` is not a full Vite API re-export.

**tsdown** — move `tsdown.config.ts` options into the `pack` block, then delete the file.

**lint-staged** — only the `staged` block format is auto-migrated; non-JSON `.lintstagedrc` and `lint-staged.config.*` are not. Move rules into `staged`, remove `lint-staged` from deps.

**Git hook tools** — automatic hook migration targets Husky v9+ and lint-staged-style setups. Older Husky (before 9.0.0) is skipped — upgrade Husky first. `lefthook`, `simple-git-hooks`, and `yorkie` are left alone with a warning — move staged rules into `staged`, run `vp config`, add `.vite-hooks/pre-commit` → `vp staged`, then remove the old tool after verifying.

### Migration prompt (for coding agents)

```
Migrate this project to Vite+. Vite+ replaces the current split tooling around
runtime management, package management, dev/build/test commands, linting,
formatting, and packaging. Run `vp help` to understand Vite+ capabilities and
`vp help migrate` before making changes. Use `vp migrate --no-interactive` in
the workspace root. Make sure the project is using Vite 8+ and Vitest 4.1+
before migrating.

After the migration:

- Confirm `vite` imports were rewritten to `vite-plus` in config entry files
  where needed (non-config `vite` imports may remain — they resolve via the
  core alias)
- Confirm `vitest` imports were rewritten to `vite-plus/test` (and
  `@vitest/browser*` to `vite-plus/test/browser*`) where needed — except
  packages using `@nuxt/test-utils`, which keep upstream `vitest` identity
- Remove obsolete `vitest` and `@vitest/browser*` dependencies only after
  those rewrites are confirmed and only where migrate removed them. Under
  pnpm, a direct `vite` entry aliased to `@voidzero-dev/vite-plus-core` may
  be intentional — leave it when migrate added or kept it
- Move remaining tool-specific config into the appropriate blocks in
  `vite.config.ts`
- Prefer `vp migrate` for later local upgrades (re-pins vite-plus, the
  vite→core alias, and the vitest override). Keep imports on
  `vite-plus/test*` (legacy `@voidzero-dev/vite-plus-test` stays removed)

Command mapping to keep in mind:

- `vp run <script>` is the equivalent of `pnpm run <script>`
- `vp test` runs the built-in test command, while `vp run test` runs the
  `test` script from `package.json`
- `vp install`, `vp add`, and `vp remove` delegate through the package manager
  declared by `packageManager`
- `vp dev`, `vp build`, `vp preview`, `vp lint`, `vp fmt`, `vp check`, and
  `vp pack` replace the corresponding standalone tools
- Prefer `vp check` for validation loops

Finally, verify the migration by running: `vp install`, `vp check`, `vp test`,
and `vp build`.

Summarize the migration at the end and report any manual follow-up still required.
```
