---
name: vite-plus-best-practices
description: Provides best practices for Vite+ (vp), the unified web toolchain combining Vite, Vitest, Oxlint, Oxfmt, Rolldown, tsdown, and Vite Task. Covers setup (vp install, env, managed runtime), the vp command surface (dev, build, check, test, run, pack), the single unified vite.config.ts, the do/don't rules that matter most, monorepo overrides, task caching, commit hooks, library packaging, and migrating existing Vite/Vitest/ESLint/Prettier projects. Use when the user mentions Vite+, vite-plus, the `vp` or `vpx` CLI, Oxlint/Oxfmt in a Vite context, tsdown, Vite Task, or asks to set up, configure, migrate, scaffold, or upgrade a Vite+ project.
---

# Vite+ Best Practices

Apply these rules when setting up, writing, reviewing, or migrating a Vite+ project — configuring `vite.config.ts`, running `vp` commands, or wiring Vite+ into CI / coding agents.

Vite+ is a **unified toolchain**: one CLI and one config file replace the usual split of Vite, Vitest, ESLint/Oxlint, Prettier/Oxfmt, tsdown, lint-staged, and a task runner.

It ships in two parts:

| Part | What it is | Scope |
|------|-----------|-------|
| `vp` | Global CLI + managed Node.js / package-manager runtime | Per machine |
| `vite-plus` | Local package installed in each project | Per project |

## Setup

The fastest path to a working project. Full details in [setup.md](./setup.md).

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

Daily loop, identical for humans, CI, and agents:

```bash
vp dev        # dev server (Vite)
vp check      # format + lint + type-check, one pass
vp test       # tests (single run, NOT watch)
vp build      # production build (apps) — use vp pack for libs/CLIs
```

- **CI install:** use the [`setup-vp`](https://github.com/voidzero-dev/setup-vp) GitHub Action — never `curl | bash` in CI.
- **Managed runtime:** `vp` manages `node` / package managers by default (`vp env on`). Use `vp env off` for system-first, `vp implode` to fully remove Vite+.

## Golden Rules

These are the high-leverage rules. Each links to deeper reference material.

1. **One config file.** Everything lives in a single `vite.config.ts` using blocks (`server`, `build`, `preview`, `test`, `lint`, `fmt`, `run`, `pack`, `staged`, `create`). Never create `vitest.config.ts`, `tsdown.config.ts`, `oxlint.config.*`, `.oxfmtrc.*`, `.prettierrc`, `eslint.config.*`, or `lint-staged.config.*`. → [config.md](./config.md)
2. **Import from `vite-plus`, not `vite`/`vitest`.** Config from `vite-plus`, tests from `vite-plus/test`, browser context from `vite-plus/test/browser/context`. → [config.md](./config.md)
3. **Built-in commands ≠ scripts.** `vp build`/`vp test`/`vp dev` always run the bundled tool. To run a `package.json` script of the same name, use `vp run <name>` (alias `vpr`). → [commands.md](./commands.md)
4. **`vp check` is the validation command.** It dedupes work across Oxfmt + Oxlint + type-check (`tsgolint`/`tsgo`). Prefer it over standalone `vp lint` / `vp fmt` / `tsc --noEmit`. Keep `lint.options.typeAware` and `typeCheck` on. → [config.md](./config.md)
5. **`vp build` for apps, `vp pack` for libraries/CLIs.** Never package a library with `vp build`. → [config.md](./config.md)
6. **Migrate, then verify, then clean up.** Run `vp migrate`, confirm import rewrites, only then remove old `vite`/`vitest` deps, finally run `vp install && vp check && vp test && vp build`. → [monorepo-and-migration.md](./monorepo-and-migration.md)

## Do / Don't

| Do | Don't |
|----|-------|
| Keep all tool config in `vite.config.ts` blocks | Create `vitest.config.ts`, `tsdown.config.ts`, `.prettierrc`, `eslint.config.*`, `lint-staged.config.*` |
| `import { defineConfig } from 'vite-plus'` | `import { defineConfig } from 'vite'` / `'vitest/config'` |
| `import { it, expect } from 'vite-plus/test'` | `import { it, expect } from 'vitest'` |
| `vp run build` to run a `package.json` `"build"` script | Expect `vp build` to run your custom `"build"` script |
| `vp check` (+ `--fix`) as the lint/format/type loop | Chain `vp fmt && vp lint && tsc --noEmit` separately |
| `vp test` for CI/agents (single run) | Assume `vp test` watches like raw `vitest` |
| `vp build` for apps, `vp pack` for libs/CLIs | Use `vp build` to publish a library |
| Upgrade to Vite 8+ / Vitest 4.1+ **before** `vp migrate` | Run `vp migrate` on older Vite/Vitest |
| Remove `vite`/`vitest` deps **after** rewrites are verified | Delete deps before confirming imports were rewritten |
| Use `setup-vp` Action in CI | `curl \| bash` the installer in CI |
| Leave `declare module 'vitest'` augmentations pointing at upstream | Rewrite type augmentations to `vite-plus/test` |
| Also bump `@voidzero-dev/vite-plus-core` / `-test` when upgrading | Assume `vp update vite-plus` re-resolves the npm aliases |

## Reference Map

Read the relevant file on demand:

| File | Covers |
|------|--------|
| [setup.md](./setup.md) | Install, managed runtime (`vp env`), per-project Node.js, dependencies (`vp install`/`add`/`update`, detection order), scaffolding (`vp create`), upgrading |
| [commands.md](./commands.md) | Command surface (built-in vs scripts), binaries (`vpx`/`vp exec`/`vp dlx`), task runner & caching (`vp run`), agent workflow & command mapping |
| [config.md](./config.md) | Single `vite.config.ts` & blocks, aliases/imports, `vp check`/`lint`/`fmt`, `vp test`, `vp build` vs `vp pack`, commit hooks & `staged` |
| [monorepo-and-migration.md](./monorepo-and-migration.md) | Root config, `lint`/`fmt` overrides, workspace filters & concurrency, `vp migrate` flow, tool-specific migrations, agent prompt |
