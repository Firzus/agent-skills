# Migration

`vp migrate` consolidates separate Vite, Vitest, Oxlint, Oxfmt, ESLint, Prettier, lint-staged, and tsdown setups into Vite+.

## Pre-requisites

- Upgrade to **Vite 8+** and **Vitest 4.1+** *before* running `vp migrate`.
- Audit any existing lint, format, or test setup you must preserve.

## Run

```bash
vp migrate                       # current dir
vp migrate my-app                # specific dir
vp migrate --no-interactive      # no prompts (CI / agents)
vp migrate --agent claude --editor zed   # also write agent + editor config
```

### Options

- `--agent <name>` / `--no-agent` — write agent instruction files
- `--editor <name>` / `--no-editor` — write editor config
- `--hooks` / `--no-hooks` — install pre-commit hooks
- `--no-interactive` — no prompts

## What It Does

- Updates project dependencies
- Rewrites imports (`vite` → `vite-plus`, `vitest` → `vite-plus/test`)
- Merges tool-specific configs into `vite.config.ts` blocks
- Updates `package.json` scripts to use the Vite+ command surface
- Optionally sets up commit hooks
- Optionally writes agent and editor config files

Expect manual follow-ups for non-trivial projects.

## Post-migration Verification Loop

```bash
vp install
vp check
vp test
vp build
```

This is the recommended validation loop for both humans and coding agents.

## Tool-Specific Migrations

### Vitest

`vp migrate` rewrites imports automatically. If migrating by hand:

```ts
// before
import { describe, expect, it, vi } from 'vitest';
const { page } = await import('@vitest/browser/context');

// after
import { describe, expect, it, vi } from 'vite-plus/test';
const { page } = await import('vite-plus/test/browser/context');
```

**Only remove `vite` / `vitest` from dependencies after the rewrites are verified.**

### tsdown

Move `tsdown.config.ts` options into the `pack` block:

```ts
// before — tsdown.config.ts
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
});
```

```ts
// after — vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    dts: true,
    format: ['esm', 'cjs'],
  },
});
```

Delete `tsdown.config.ts` after merging.

### lint-staged

Only the `staged` block format is auto-migrated. Non-JSON `.lintstagedrc` and `lint-staged.config.*` are not.

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*.{js,ts,tsx,vue,svelte}': 'vp check --fix',
  },
});
```

Remove `lint-staged` from dependencies and delete the old config files.

## Migration Prompt (for coding agents)

Paste this into a coding agent to delegate the migration:

```
Migrate this project to Vite+. Vite+ replaces the current split tooling around
runtime management, package management, dev/build/test commands, linting,
formatting, and packaging. Run `vp help` to understand Vite+ capabilities and
`vp help migrate` before making changes. Use `vp migrate --no-interactive` in
the workspace root. Make sure the project is using Vite 8+ and Vitest 4.1+
before migrating.

After the migration:

- Confirm `vite` imports were rewritten to `vite-plus` where needed
- Confirm `vitest` imports were rewritten to `vite-plus/test` where needed
- Remove old `vite` and `vitest` dependencies only after those rewrites are
  confirmed
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
