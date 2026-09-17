# Vite+ smoke-test record

Executed on **2026-09-17**, Windows x64. Global and local Vite+ **0.3.2**;
managed Node **24.21.0**; harness Node **24.15.0**; TypeScript **5.9.3**.
The resolved toolchain reported Vite **8.3.0**, Vitest **4.1.11**, Rolldown
**1.2.8**, Oxlint **1.82.0**, Oxfmt **0.67.0**, oxlint-tsgolint **7.0.2001**,
and tsdown **0.23.0**. These are observations, not floating version promises.

## Reproduce the automated baseline

Prerequisites: compatible Node, npm, an already installed global `vp` 0.3.2,
and permission to download npm dependencies. From the repository root:

```bash
node skills/web/vite-plus/scripts/smoke.mjs
```

The helper creates a temporary project outside the repository, installs pinned
direct dependencies, and retains the fixture, per-command logs, and
`results.json` at the printed paths. It does not install or upgrade global
`vp`, edit a shell profile, or delete fixtures. npm/runtime caches can change;
the fixture is not a security sandbox. Its lockfile records transitive
resolutions; a later fresh install may resolve different transitives.

The source of truth for fixture files and executable assertions is
[`scripts/smoke.mjs`](../scripts/smoke.mjs). Each command must finish within
120 seconds and return the expected code. The complete run passed **24 command
checks**, plus filesystem assertions for build outputs and declarations.

| Contract | Commands / observation | Expected and observed exit |
| --- | --- | --- |
| Installation and selection | npm install; `vp --version` resolves local 0.3.2 | 0 |
| Formatting and full static checks | `vp fmt`, `vp check` | 0 |
| Finite test execution | `vp test`, one passing assertion, process exits | 0 |
| Built-in versus script | `vp build` produces HTML; `vp run build` prints `SCRIPT_BUILD` | 0 |
| Packaging | `vp pack` emits ESM/CJS and `.d.mts`/`.d.cts`; both JS consumers return 5 | 0 |
| Configured task | `vp run verify` executes the test | 0 |
| Bad formatting | Deliberately unformatted source; `vp check` | 1 |
| Type-check boundary | Assign string to number; `vp check --no-fmt --no-lint` reports TS2322 | 1 |
| Assertion boundary | Change expected sum to 6; `vp test` reports one failure | 1 |
| Recovery | Restore source/test, format, check, test | 0 |
| Cache reuse | Config task uses default caching; second run reports a hit | 0 |
| Cache invalidation | Change addition to subtraction; cached task executes and test fails | 1 |
| Fresh execution | Restore addition; `vp run --no-cache verify` reports cache disabled | 0 |
| Empty selection | `vp run --filter missing-package --fail-if-no-match build` | 1 |
| Final state | Format and full check after restoring the fixture | 0 |

The initial exploratory fixture lacked ignores and lint traversed dependencies.
Adding `.gitignore` entries for dependencies and build outputs fixed the fixture.
An initial cache harness wrote logs into its project; the added files correctly
invalidated caching. The final helper keeps logs outside the tracked project.
Neither exploratory failure is counted as a passing test.

## Additional manually executed contracts

### npm workspaces

Added `workspaces: ["packages/*"]` and two private packages named `@smoke/a`
and `@smoke/b`. Each defined a `probe` script printing its own marker.

| Command | Observation |
| --- | --- |
| `vp run --filter @smoke/a --fail-if-no-match probe` | Exit 0; only package A executed |
| `vp run -r probe` | Exit 0; both packages executed |

This tests task selection, not cross-package dependency order or root lint
overrides. The two packages had no dependency relationship.

### Migration

Created a separate temporary npm project with Vite **8.3.0**, Vitest **4.1.11**,
TypeScript **5.9.3**, and `packageManager: "npm@11.11.1"`. Its app, strict
tsconfig, test, and ignore patterns matched the automated fixture, except that
the config imported `defineConfig` from `vite`, the test imported from `vitest`,
and scripts were `build: "vite build"` and `test: "vitest run"`.

1. Ran `vp migrate --no-interactive --no-agent --no-editor --no-hooks`: exit 0.
2. Inspected the result: config/test imports moved to `vite-plus` and
   `vite-plus/test`; scripts became `vp build` and `vp test run`; the manifest
   retained a direct Vite core alias and override; type-aware/type-check options
   were enabled. No agent, editor, or hook setup files were created.
3. Ran `vp check`, `vp test`, and `vp build`: each exited 0; one test passed and
   built HTML plus its JavaScript asset existed.
4. Repeated the same migration: exit 0, already-migrated message. SHA-256 hashes
   of `package.json`, `package-lock.json`, `vite.config.ts`, and the test file
   remained identical.

## Scope limits

Executed: Windows/npm, vanilla TypeScript app, Node-mode tests, dual-format
library, minimal migration, task caching and workspace selection. Not executed:
Linux/macOS, pnpm/Yarn/Bun migration, framework or browser integrations, global
installation/runtime changes, hooks, remote CI, native executables, publishing,
and agent invocation-quality evaluation. Guidance for these branches does not
imply smoke coverage.
