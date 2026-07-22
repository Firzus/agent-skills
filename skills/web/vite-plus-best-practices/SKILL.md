---
name: vite-plus-best-practices
description: >-
  Vite+ (vp) unified toolchain: unified config, built-in ≠ script, vp check,
  pack vs build, and migrate. Covers setup (vp install, env, managed runtime),
  the vp command surface (dev, build, check, test, run, pack, node),
  vite.config.ts blocks (including check), monorepo overrides, task caching,
  commit hooks, library packaging, and migrating Vite/Vitest/ESLint/Prettier
  projects. Use when the user mentions Vite+, vite-plus, the `vp` or `vpx` CLI,
  Oxlint/Oxfmt in a Vite context, tsdown, Vite Task, or asks to set up,
  configure, migrate, scaffold, review, or upgrade a Vite+ project.
---

# Vite+ Best Practices

Apply these rules when setting up, writing, reviewing, or migrating a Vite+ project — configuring `vite.config.ts`, running `vp` commands, or wiring Vite+ into CI / coding agents.

**Done when:** every touched package uses `vite-plus` / `vite-plus/test` imports where required (exceptions: non-config `vite` imports via the core alias; `@nuxt/test-utils` packages keeping upstream `vitest`; pnpm direct `vite` entries aliased to core — leave those); no legacy per-tool config remains unless a documented exception applies; upgrade/migrate followed the `vp migrate` path; and `vp check && vp test` plus `vp build` (apps) or `vp pack` (libs/CLIs) pass.

Vite+ is a **unified toolchain**: one CLI and one config file replace the usual split of Vite, Vitest, ESLint/Oxlint, Prettier/Oxfmt, tsdown, lint-staged, and a task runner.

| Part | What it is | Scope |
|------|-----------|-------|
| `vp` | Global CLI + managed Node.js / package-manager runtime | Per machine |
| `vite-plus` | Local package installed in each project | Per project |

## Setup

Fastest path to a working project. Full details in [setup.md](./setup.md) (install, env, deps, create, upgrade).

```bash
# 1. Install the global vp CLI (once per machine)
curl -fsSL https://vite.plus | bash      # macOS / Linux
irm https://vite.plus/ps1 | iex          # Windows (PowerShell)

# 2. Open a NEW shell, then verify
vp help

# 3a. New project
vp create                                # interactive scaffold
vp install                               # install dependencies

# 3b. OR migrate an existing project (Vite 8+ / Vitest 4.1+ required first)
vp migrate --no-interactive
```

Daily loop (humans, CI, agents):

```bash
vp dev        # dev server (Vite)
vp check      # format + lint + type-check, one pass
vp test       # tests (single run — watch is opt-in)
vp build      # production build (apps) — use vp pack for libs/CLIs
```

- **CI install:** use the [`setup-vp`](https://github.com/voidzero-dev/setup-vp) GitHub Action (prefer it over the shell installer in CI).
- **Managed runtime:** `vp` manages `node` / package managers by default (`vp env on`). Use `vp env off` for system-first, `vp implode` to fully remove Vite+.

## Golden Rules

High-leverage rules. Each links to deeper reference.

1. **Unified config.** Everything lives in a single `vite.config.ts` using blocks (`server`, `build`, `preview`, `test`, `lint`, `fmt`, `check`, `run`, `pack`, `staged`, `create`). Put tool settings in those blocks — not in `vitest.config.ts`, `tsdown.config.ts`, `oxlint.config.*`, `.oxfmtrc.*`, `.prettierrc`, `eslint.config.*`, or `lint-staged.config.*`. → [config.md](./config.md)
2. **Import from `vite-plus` for config and tests.** Config: `import { defineConfig } from 'vite-plus'`. Tests: `import { … } from 'vite-plus/test'` (browser context: `vite-plus/test/browser/context`). Rewrite nuances, Nuxt, and pnpm `vite` pins: → [monorepo-and-migration.md](./monorepo-and-migration.md)
3. **Built-in ≠ script.** `vp build` / `vp test` / `vp dev` always run the bundled tool. To run a same-named `package.json` script, use `vp run <name>` (alias `vpr`). → [commands.md](./commands.md)
4. **`vp check` is the validation command.** It dedupes Oxfmt + Oxlint + type-check (`tsgolint`/`tsgo`). Prefer it over chaining standalone `vp lint` / `vp fmt` / `tsc --noEmit`. Keep `lint.options.typeAware` and `typeCheck` on. Use the `check` block to set default skip flags. → [config.md](./config.md)
5. **`vp build` for apps, `vp pack` for libraries/CLIs.** Package libraries with `vp pack`. → [config.md](./config.md)
6. **Migrate, then verify.** Run `vp migrate` (also the recommended local upgrade path), confirm import rewrites, remove obsolete `vitest` / `@vitest/browser*` only where migrate allows (keep intentional pnpm `vite`→core entries), finally `vp install && vp check && vp test` plus `vp build` (apps) or `vp pack` (libs/CLIs). Prefer `vp migrate` over hand-updating aliases. → [monorepo-and-migration.md](./monorepo-and-migration.md)

## Reference Map

Load on demand:

| When | File |
|------|------|
| Installing `vp`, managed Node, deps, scaffolding, upgrading | [setup.md](./setup.md) |
| Built-in vs scripts, `vpx`/`exec`/`dlx`, task runner & caching, agent loop | [commands.md](./commands.md) |
| `vite.config.ts` blocks (incl. `check`), imports, check/test/build/pack, hooks | [config.md](./config.md) |
| Monorepo overrides, workspace filters, `vp migrate` flow & agent prompt | [monorepo-and-migration.md](./monorepo-and-migration.md) |
