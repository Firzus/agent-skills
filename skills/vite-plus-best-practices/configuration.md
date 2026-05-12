# Unified Configuration

Vite+ consolidates every tool's config into a single `vite.config.ts`. Do **not** create the legacy per-tool files — `vp migrate` exists specifically to remove them.

## Canonical Shape

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
  run: {},      // Vite Task
  pack: {},     // tsdown (libraries / CLIs)
  staged: {},   // staged-file checks
  create: {},   // scaffolding defaults
});
```

The import must be from `vite-plus`, not `vite`.

## Recommended Defaults

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    singleQuote: true,
  },
  staged: {
    '*.{js,ts,tsx,vue,svelte}': 'vp check --fix',
  },
});
```

`vp create` and `vp migrate` enable both `typeAware` and `typeCheck` by default — keep them on so `vp check` becomes the single static-checks command.

## Files Vite+ Replaces

Delete these after migration (or never create them in Vite+ projects):

| Legacy file | Replaced by |
|-------------|-------------|
| `vitest.config.ts` | `test` block in `vite.config.ts` |
| `tsdown.config.ts` | `pack` block in `vite.config.ts` |
| `oxlint.config.ts`, `.oxlintrc.json`, `eslint.config.*`, `.eslintrc.*` | `lint` block |
| `.oxfmtrc.json`, `.prettierrc`, `.prettierrc.*`, `prettier.config.*` | `fmt` block |
| `lint-staged.config.*`, `.lintstagedrc.*` | `staged` block |

## Aliased Dependencies

During install, Vite+ rewires npm aliases:

- `vite` → `npm:@voidzero-dev/vite-plus-core@latest`
- `vitest` → `npm:@voidzero-dev/vite-plus-test@latest`

Implications:
- Source code must import from `vite-plus` and `vite-plus/test`, not `vite` / `vitest`
- `vp update vite-plus` does **not** re-resolve these aliases in the lockfile — also run `vp update @voidzero-dev/vite-plus-core @voidzero-dev/vite-plus-test` (see [upgrading.md](./upgrading.md))

## Imports Cheat Sheet

```ts
// Vite+ config
import { defineConfig } from 'vite-plus';

// Tests
import { describe, expect, it, vi } from 'vite-plus/test';

// Browser-mode tests
const { page } = await import('vite-plus/test/browser/context');

// Shared types for monorepo overrides
import type { OxlintOverride } from 'vite-plus/lint';
```

## Editor Integration

Point editor extensions at `vite.config.ts` so they read the same blocks:

```jsonc
// .vscode/settings.json
{
  "oxc.fmt.configPath": "./vite.config.ts"
}
```

## Composing Config

Because `vite.config.ts` is plain JavaScript, split shared pieces into modules and import them. See the composition pattern in [monorepo.md](./monorepo.md#composing-configuration).
