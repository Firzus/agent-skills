# Testing

`vp test` runs [Vitest](https://vitest.dev/) through Vite+, reusing the same Vite config and plugins.

## Usage

```bash
vp test                       # single run (NOT watch)
vp test watch                 # watch mode
vp test run --coverage        # one-shot run with coverage
vp test --reporter verbose    # extra args forwarded to Vitest
```

> **Watch is opt-in.** Unlike running `vitest` directly, `vp test` does **not** stay in watch mode by default. Use `vp test watch` when you want it.

`vp test` always runs the built-in Vitest. To run a `package.json` `"test"` script instead, use `vp run test`.

## Config

Put Vitest config in the `test` block of `vite.config.ts`. Do **not** create a separate `vitest.config.ts`.

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
```

For the full option reference, see [Vitest config docs](https://vitest.dev/config/).

## Imports

Always import from `vite-plus/test`, **not** `vitest`:

```ts
// Bad
import { describe, expect, it, vi } from 'vitest';
const { page } = await import('@vitest/browser/context');

// Good
import { describe, expect, it, vi } from 'vite-plus/test';
const { page } = await import('vite-plus/test/browser/context');
```

`vp migrate` rewrites these imports automatically. Remove `vitest` from `dependencies` / `devDependencies` only **after** the rewrites are confirmed.

## Browser Mode

`vp test` supports Vitest Browser Mode for running unit tests in real browsers. Import context helpers from `vite-plus/test/browser/context`.

## Minimum Versions

`vp migrate` requires **Vitest 4.1+** (and **Vite 8+**). Upgrade before migrating.
