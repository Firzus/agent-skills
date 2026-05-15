---
name: vite-plus-best-practices
description: Provides best practices for Vite+ (vp), the unified web toolchain combining Vite, Vitest, Oxlint, Oxfmt, Rolldown, tsdown, and Vite Task. Covers the vp command surface (dev, build, check, test, run, pack, install, env), unified vite.config.ts blocks, monorepo overrides, task caching, commit hooks, library packaging, and migrating existing Vite/Vitest/ESLint/Prettier projects. Use when the user mentions Vite+, vite-plus, the `vp` or `vpx` CLI, Oxlint/Oxfmt in a Vite context, tsdown, Vite Task, or asks to configure, migrate, scaffold, or upgrade a Vite+ project.
---

# Vite+ Best Practices

Apply these rules when writing or reviewing Vite+ code, configuring `vite.config.ts`, running `vp` commands, or migrating to Vite+.

Vite+ ships in two parts:
- `vp` — the global command-line tool (managed runtime + package manager)
- `vite-plus` — the local package installed in each project

All Vite+ configuration belongs in a single `vite.config.ts` using blocks (`server`, `build`, `test`, `lint`, `fmt`, `run`, `pack`, `staged`, `create`). Do **not** keep separate `vitest.config.ts`, `oxlint.config.json`, `tsdown.config.ts`, `.prettierrc`, or `lint-staged.config.*` files.

## Installation & Environment

See [getting-started.md](./getting-started.md) for:
- Installing `vp` on macOS/Linux (`curl -fsSL https://vite.plus | bash`) and Windows (`irm https://vite.plus/ps1 | iex`)
- CI install via `setup-vp` GitHub Action
- `vp env on` (managed) vs `vp env off` (system-first)
- Pinning Node.js per project with `.node-version` and `vp env pin lts`
- `VP_HOME` and `VP_NODE_DIST_MIRROR` for corporate mirrors

## Command Surface

See [commands.md](./commands.md) for:
- Built-in commands (`vp dev`, `vp build`, `vp preview`, `vp check`, `vp test`, `vp pack`) — these always run the built-in tool, never a same-named `package.json` script
- `vp run <script>` (and the `vpr` shorthand) to execute `package.json` scripts
- Why `vp build` ≠ `vp run build` and `vp test` ≠ `vp run test`
- `vp` with no args opens the interactive picker

## Scaffolding & Migration

See [scaffolding.md](./scaffolding.md) for:
- `vp create` with built-in templates (`vite:monorepo`, `vite:application`, `vite:library`, `vite:generator`)
- Shorthand and remote templates (`vp create vite`, `vp create @tanstack/start`, `vp create github:user/repo`)
- Organization templates via `@org/create` + `createConfig.templates` manifest
- `create.defaultTemplate` for repo-level defaults

See [migration.md](./migration.md) for:
- Pre-requisites: upgrade to Vite 8+ and Vitest 4.1+ **before** running `vp migrate`
- Running `vp migrate --no-interactive`
- Rewriting `vitest` imports → `vite-plus/test` and `@vitest/browser/context` → `vite-plus/test/browser/context`
- Removing `vite`, `vitest`, `tsdown`, `lint-staged` from dependencies after rewrite
- Verifying with `vp install && vp check && vp test && vp build`

## Unified Configuration

See [configuration.md](./configuration.md) for:
- The canonical `vite.config.ts` shape with all blocks
- Recommended defaults (`lint.options.typeAware: true`, `lint.options.typeCheck: true`)
- Aliased dependencies (`vite` → `@voidzero-dev/vite-plus-core`, `vitest` → `@voidzero-dev/vite-plus-test`)
- Why you should not use `vitest.config.ts`, `tsdown.config.ts`, `oxlint.config.json`, `.oxlintrc.json`, `.oxfmtrc.json`, or `lint-staged.config.*` with Vite+

## Check, Lint & Format

See [check-lint-fmt.md](./check-lint-fmt.md) for:
- `vp check` as the single entry for format + lint + type-check
- `vp check --fix` for autofixers
- `--no-fmt` / `--no-lint` flags (and "type-check only" mode)
- Oxlint config in the `lint` block, Oxfmt config in the `fmt` block
- Type-aware linting powered by `tsgolint`
- Editor integration (`oxc.fmt.configPath: "./vite.config.ts"`)
- JS plugin escape hatch for incomplete ESLint→Oxlint migrations

## Testing

See [testing.md](./testing.md) for:
- `vp test` (single-run by default — **not** watch) vs `vp test watch`
- Config in the `test` block of `vite.config.ts`
- Coverage with `vp test run --coverage`
- Imports must use `vite-plus/test`, not `vitest`
- Browser Mode via `vite-plus/test/browser/context`

## Building & Packaging

See [build-and-pack.md](./build-and-pack.md) for:
- `vp build` for **applications** (Vite 8 + Rolldown)
- `vp pack` for **libraries and CLIs** (tsdown), with `dts`, `format`, `sourcemap`, `exe`
- Standalone executables via `pack.exe: true`
- `vp preview` after `vp build`
- When to choose `vp build` vs `vp pack`

## Package Management

See [package-management.md](./package-management.md) for:
- Detection order (`packageManager`, `pnpm-workspace.yaml`, lockfiles…)
- `vp install`, `vp add`, `vp add -D`, `vp remove`, `vp update`, `vp outdated`, `vp dedupe`, `vp why`, `vp info`
- Global packages with `-g`
- Lockfile flags: `--frozen-lockfile`, `--lockfile-only`, `--prefer-offline`
- `vp rebuild` after Node.js version switches
- `vp pm <cmd>` escape hatch for package-manager-specific behavior

## Running Binaries

See [binaries.md](./binaries.md) for:
- `vpx <pkg>` — resolves locally first, downloads if missing
- `vp exec` — strictly local `node_modules/.bin`
- `vp dlx` — one-off remote execution, no install
- `vpx -p <pkg> -c '<shell>'` for shell-mode and extra packages

## Vite Task & Caching

See [task-runner.md](./task-runner.md) for:
- `vp run <script>` (and `vpr <script>` shorthand)
- Defining tasks in `run.tasks` with `command`, `dependsOn`, `env`, `untrackedEnv`, `input`, `cache`, `cwd`
- Tasks (cached by default) vs `package.json` scripts (not cached by default)
- `--cache` / `--no-cache` overrides
- `vp cache clean` (cache lives in `node_modules/.vite/task-cache`)
- `&&` splits into independently cached sub-tasks; nested `vp run` is inlined (not re-spawned)
- Automatic file tracking + when to use explicit `input` patterns

## Monorepo

See [monorepo.md](./monorepo.md) for:
- One root `vite.config.ts` driving lint/fmt/staged/tasks across the workspace
- `lint.overrides` and `fmt.overrides` for per-package rules (globs resolved from root)
- Plugin replacement behavior in `lint.overrides` (set `plugins` ⇒ replaces base list, omit ⇒ inherit)
- Composing config via plain JavaScript imports
- Workspace selection: `-r` (recursive), `-t` (transitive), `--filter "@org/*..."`, `-w` (root)
- `--parallel` and `--concurrency-limit` (or `VP_RUN_CONCURRENCY_LIMIT`)
- Targeting one app: `vp dev apps/web`, `vp build apps/web`

## Commit Hooks & Staged Files

See [commit-hooks.md](./commit-hooks.md) for:
- `vp config` to install Git hooks into `.vite-hooks`
- `vp staged` reads the `staged` block in `vite.config.ts`
- Replacing `lint-staged` entirely (only the `staged` block format is migrated)
- Pattern: `'*.{js,ts,tsx,vue,svelte}': 'vp check --fix'`

## Upgrading Vite+

See [upgrading.md](./upgrading.md) for:
- `vp upgrade` for the global `vp` binary
- `vp update vite-plus` for the local package
- Updating the aliased core packages: `vp update @voidzero-dev/vite-plus-core @voidzero-dev/vite-plus-test`
- Verifying with `vp outdated`
- `vp implode` to fully uninstall Vite+

## Agent / AI Workflow Integration

See [agent-workflow.md](./agent-workflow.md) for:
- `--agent <name>` on `vp create` / `vp migrate` to drop agent instruction files
- The recommended validation loop for coding agents: `vp install && vp check && vp test && vp build`
- Why `vp check` is the right loop for AI fix-it cycles (one command for fmt + lint + type-check)
- Standardizing best practices for human and AI-assisted workflows
