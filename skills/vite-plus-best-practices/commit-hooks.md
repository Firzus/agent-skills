# Commit Hooks & Staged Files

Vite+ ships its own staged-file runner. It replaces `lint-staged` and `husky`-style setups.

- `vp config` — install Git hooks and project integration
- `vp staged` — run staged-file checks based on `vite.config.ts`

If `vp create` or `vp migrate` is used, both are offered interactively.

## Install Hooks

```bash
vp config
vp config --hooks-dir .vite-hooks       # default location
```

Hooks are written to `.vite-hooks/` by default and Git is pointed at this directory.

## Define Staged Checks

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*.{js,ts,tsx,vue,svelte}': 'vp check --fix',
  },
});
```

The `staged` block is the only supported format. Replace any `lint-staged.config.*` / `.lintstagedrc.*` here.

## Run Staged Checks

```bash
vp staged                       # run on currently staged files
vp staged --verbose
vp staged --fail-on-changes     # fail if autofix produced changes
```

When hooks are installed via `vp config`, `vp staged` runs automatically on commit.

## Recommended Default

```ts
staged: {
  '*.{js,ts,tsx,vue,svelte,json,md,css}': 'vp check --fix',
}
```

`vp check --fix` reuses the same `lint` and `fmt` blocks used by dev/CI, so staged-file behavior never drifts from project rules.
