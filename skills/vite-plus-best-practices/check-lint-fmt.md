# Check, Lint & Format

`vp check` is the recommended command for static checks. It runs format + lint + type-check in a single pass and is faster than calling each tool separately.

## vp check

```bash
vp check
vp check --fix              # format and run autofixers
vp check --no-fmt           # skip format; keep lint (+ type-check)
vp check --no-lint          # skip lint; keep type-check (if enabled)
vp check --no-fmt --no-lint # type-check only (requires lint.options.typeCheck)
```

Powered by:
- [Oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) — Prettier-compatible formatting
- [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) — 600+ ESLint-compatible rules
- [tsgolint](https://github.com/oxc-project/tsgolint) — type-aware checks via the TypeScript Go toolchain (`tsgo`)

## Recommended Base Config

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    ignorePatterns: ['dist/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  fmt: {
    ignorePatterns: ['dist/**'],
    singleQuote: true,
    semi: true,
    sortPackageJson: true,
  },
});
```

`typeAware: true` enables rules that require type info; `typeCheck: true` enables full type checking inside `vp check` / `vp lint`. Keep both on so a single command covers fmt + lint + type-check.

## Lint Only — vp lint

```bash
vp lint
vp lint --fix
vp lint --type-aware
```

For incomplete ESLint → Oxlint migrations, use Oxlint's [JS plugin support](https://oxc.rs/docs/guide/usage/linter/js-plugins) to keep critical plugins running during the migration.

## Format Only — vp fmt

```bash
vp fmt              # format in place (default)
vp fmt --check      # check only, exit non-zero on changes
vp fmt . --write    # explicit target + write
```

## Editor Integration

Point the Oxc VS Code extension at `vite.config.ts` so format-on-save uses the same `fmt` block:

```jsonc
// .vscode/settings.json
{
  "oxc.fmt.configPath": "./vite.config.ts"
}
```

## Monorepo Overrides

Use `lint.overrides` and `fmt.overrides` to apply rules to specific globs from the root config (see [monorepo.md](./monorepo.md)).

## Validation Loop for Agents

The recommended fix-it cycle for coding agents:

1. `vp check --fix` — apply formatting and safe lint autofixes
2. `vp test` — run the test suite
3. `vp build` — build for production

`vp check` is preferred over standalone `vp lint` / `vp fmt` / `tsc --noEmit` because it deduplicates work across the three tools.
