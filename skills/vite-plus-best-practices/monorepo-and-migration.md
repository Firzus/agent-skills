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

Consolidates separate Vite, Vitest, Oxlint, Oxfmt, ESLint, Prettier, lint-staged, and tsdown setups into Vite+.

### Pre-requisites

- Upgrade to **Vite 8+** and **Vitest 4.1+** *before* running `vp migrate`.
- Audit any existing lint/format/test setup to preserve.

```bash
vp migrate                       # current dir
vp migrate my-app                # specific dir
vp migrate --no-interactive      # no prompts (CI / agents)
vp migrate --agent claude --editor zed
```

### What it does

- Updates dependencies; rewrites imports (`vite` → `vite-plus`, `vitest` → `vite-plus/test`)
- Merges tool-specific configs into `vite.config.ts` blocks
- Updates `package.json` scripts to the Vite+ command surface
- Optionally sets up commit hooks and agent/editor config

Expect manual follow-ups for non-trivial projects.

### Verification loop

```bash
vp install && vp check && vp test && vp build
```

### Tool-specific migrations

**Vitest** — `vite-plus` re-exports upstream `vitest@4.x` under `vite-plus/test*` and ships `vite`/`vitest` as direct deps, so a single `vite-plus` install is enough for node-mode tests. By hand:

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

> Remove old `vite` / `vitest` / `@vitest/browser*` deps **only after** rewrites are verified.
>
> **Browser providers stay opt-in.** `vite-plus` bundles `@vitest/browser` + `@vitest/browser-preview`, but Playwright/WebdriverIO providers are not shipped — install the provider and its peer (`playwright` / `webdriverio`) yourself, pinned to the bundled vitest version.
>
> **Do NOT rewrite type augmentations.** Leave `declare module 'vitest'` / `declare module '@vitest/browser*'` pointing at the upstream module — `vite-plus/test*` is a thin re-export.

**tsdown** — move `tsdown.config.ts` options into the `pack` block, then delete the file.

**lint-staged** — only the `staged` block format is auto-migrated; non-JSON `.lintstagedrc` and `lint-staged.config.*` are not. Move rules into `staged`, remove `lint-staged` from deps.

### Migration prompt (for coding agents)

```
Migrate this project to Vite+. Vite+ replaces the current split tooling around
runtime management, package management, dev/build/test commands, linting,
formatting, and packaging. Run `vp help` to understand Vite+ capabilities and
`vp help migrate` before making changes. Use `vp migrate --no-interactive` in
the workspace root. Make sure the project is using Vite 8+ and Vitest 4.1+
before migrating.

After the migration:

- Confirm `vite` imports were rewritten to `vite-plus` where needed
- Confirm `vitest` imports were rewritten to `vite-plus/test` (and
  `@vitest/browser*` to `vite-plus/test/browser*`) where needed
- Remove old `vite`, `vitest`, and `@vitest/browser*` dependencies only after
  those rewrites are confirmed — `vite-plus` ships them as direct deps
- Move remaining tool-specific config into the appropriate blocks in
  `vite.config.ts`

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
