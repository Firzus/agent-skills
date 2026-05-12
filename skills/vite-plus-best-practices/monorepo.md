# Monorepo

A single root `vite.config.ts` drives lint, fmt, staged checks, and tasks for the whole workspace. Each package can still keep its own `vite.config.ts` for Vite / Vitest / framework / runtime config.

## Root Config Pattern

```ts
// vite.config.ts (workspace root)
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    plugins: ['typescript'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
    overrides: [
      {
        files: ['apps/web/**', 'packages/ui/**'],
        plugins: ['typescript', 'react'],
        rules: { 'react/self-closing-comp': 'error' },
      },
      {
        files: ['apps/api/**'],
        env: { node: true },
        rules: { 'no-console': 'off' },
      },
      {
        files: ['**/*.test.ts', '**/*.spec.ts'],
        plugins: ['typescript', 'vitest'],
        rules: {
          '@typescript-eslint/no-explicit-any': 'off',
          'vitest/no-disabled-tests': 'error',
        },
      },
    ],
  },
});
```

Globs in `overrides[].files` are resolved from the root `vite.config.ts`. Use workspace-relative paths (`apps/web/**`, `packages/ui/**`).

## Plugin Replacement in lint.overrides

> When an override sets `plugins`, it **replaces** the base `lint.plugins` list for the matched files. Include every plugin needed for that file group (e.g. `['typescript', 'react']`).
>
> Omit `plugins` if the override should inherit the base list unchanged.

This trips up most migrations from ESLint flat configs.

## Format Overrides

`fmt.overrides` puts settings under `options`:

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    singleQuote: true,
    semi: true,
    overrides: [
      {
        files: ['apps/api/**'],
        options: { printWidth: 120 },
      },
      {
        files: ['**/*.md'],
        options: { proseWrap: 'always' },
      },
    ],
  },
});
```

## Composing Configuration

Split shared lint/fmt fragments into modules and import them. Use the exported `OxlintOverride` type for safety:

```ts
// tooling/lint/react.ts
import type { OxlintOverride } from 'vite-plus/lint';

export const reactLint = {
  plugins: ['typescript', 'react'],
  rules: { 'react/self-closing-comp': 'error' },
} satisfies Omit<OxlintOverride, 'files'>;
```

```ts
// tooling/lint/node.ts
import type { OxlintOverride } from 'vite-plus/lint';

export const nodeLint = {
  env: { node: true },
  rules: { 'no-console': 'off' },
} satisfies Omit<OxlintOverride, 'files'>;
```

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';
import { nodeLint } from './tooling/lint/node';
import { reactLint } from './tooling/lint/react';

export default defineConfig({
  lint: {
    plugins: ['typescript'],
    options: { typeAware: true, typeCheck: true },
    overrides: [
      { files: ['apps/web/**', 'packages/ui/**'], ...reactLint },
      { files: ['apps/api/**'], ...nodeLint },
    ],
  },
});
```

## App-Level Commands

The root config is best for shared lint/fmt/staged/tasks. For per-app dev/build/test, pick the lightest pattern:

- Built-in Vite commands accept a folder:
  ```bash
  vp dev apps/web
  vp build apps/web
  ```
- Package-specific scripts when the command differs per app:
  ```json
  // apps/api/package.json
  {
    "scripts": {
      "dev": "tsx watch src/index.ts",
      "build": "tsc -p tsconfig.json"
    }
  }
  ```
- Run across the workspace with `vp run`:
  ```bash
  vp run -r build                       # all packages, dep order
  vp run -r --parallel dev              # all packages, ignore deps
  vp run --filter ./apps/web build      # one package by path
  ```

See [task-runner.md](./task-runner.md) for filters, concurrency, and caching.

## Recursion Guard

A common root-package script:

```json
// package.json (root)
{
  "scripts": { "build": "vp run -r build" }
}
```

…would normally recurse (root `build` → `vp run -r build` → root `build` → …). Vite Task detects the self-reference and prunes it automatically, so other packages still build.
