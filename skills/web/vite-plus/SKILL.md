---
name: vite-plus
description: >-
  Vite+ projects using vite-plus and the vp CLI. Use when setting up, migrating
  to, or updating Vite+, configuring its checks, tests or library builds,
  debugging built-in versus script execution, or configuring workspace tasks
  and caching. Applies to Vite+ integrations, not every standalone Vite project.
---

# Vite+

Work within a project's Vite+ toolchain: choose the command that owns each
action, change only the configuration the task needs, and prove the result with
the project's real checks. These rules assume the latest Vite+ release is
installed. Ordinary feature work uses the toolchain as it is; setting it up,
migrating to it, or updating it is a separate, explicit change.

## 1. Read the project's setup

Read the target package and workspace manifests, lockfile, scripts,
`vite.config.*`, TypeScript configuration, and CI commands. Identify whether
the project runs a global `vp` or only its local `vite-plus` binary through the
package manager. Before using an option not shown here, read `vp help <command>`.

| Request | Read next |
| --- | --- |
| Install, scaffold, migrate, update, or change CI setup | [setup-and-migration.md](./setup-and-migration.md) |
| Workspace targeting, shared lint/format policy, or cached tasks | [workspaces.md](./workspaces.md) |

**Done:** target package, current command path, and required validation
identified.

## 2. Map each action to its owning command

| Intended action | Command |
| --- | --- |
| Bundled app dev server / production build | `vp dev` / `vp build` |
| Existing framework or custom build script | `vp run build` |
| Configured script or task | `vp run <name>` |
| Static validation (format, lint, types) | `vp check` |
| Apply formatting and lint fixes | `vp check --fix` |
| Check formatting without writing / write it | `vp fmt --check` / `vp fmt` |
| Bundled tests, one finite run | `vp test` |
| Interactive test watching | `vp test watch` |
| Library build | `vp pack` |

Built-ins never dispatch to a same-named script: `vp build` runs the bundled
Vite build, while `vp run build` runs the `build` script. Keep a script that
generates code or calls a framework CLI on its `vp run` path, and keep any
supplemental checks the project already requires.

**Done:** each requested action mapped to the built-in, script, or task that
actually owns it.

## 3. Configure only the relevant blocks

Import `defineConfig` from `vite-plus`, preserve existing plugins and unrelated
options, and add only the blocks the task needs:

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    options: { typeAware: true, typeCheck: true },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

`vp check` validates types only when `typeAware` and `typeCheck` are enabled and
the files belong to its TypeScript projects. Before treating a green exit as full
coverage, inspect `check.fmt`, `check.lint`, ignore patterns, and CLI skips.
Make sure `.gitignore` or ignore patterns exclude dependencies and generated
output. Keep framework-specific type checkers until equivalent coverage is
proven.

Import test APIs from `vite-plus/test`. Import a `vite-plus/test/*` subpath only
when the installed package's `exports` declares it.

```ts
import { expect, test } from 'vite-plus/test';
import { add } from './index';

test('adds two numbers', () => {
  expect(add(2, 3)).toBe(5);
});
```

For a library, add a `pack` block with only the formats consumers need:

```ts
pack: {
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
}
```

Inspect the emitted files and align `package.json` exports and types with their
actual names. `vp pack` only builds: it neither publishes nor replaces a
package-manager tarball check.

**Done:** the changed configuration loaded by the command that uses it, not
merely accepted by an editor.

## 4. Verify the requested behavior

1. Run `vp check`, the relevant finite tests, and the owning app or library
   build, through the project's script when it adds required steps.
2. Inspect build artifacts. For a library change, import it from a consumer.
3. When changing validation or cache configuration, prove the failure boundary
   in an isolated fixture: introduce a type error, failing assertion, or changed
   task input, require the expected nonzero exit or cache miss, then restore it
   and require a passing run. A cached replay is not a fresh execution.

[scripts/smoke.mjs](./scripts/smoke.mjs) checks these rules in a temporary
Node-mode fixture: commands, failure boundaries, and task caching. Run it with
Node when they must be confirmed on a host. It installs the latest `vite-plus`
from npm and calls `vp` from `PATH`, so it requires authorization for network
installs; it keeps the fixture and logs for review.

**Done:** exact commands and results reported, with untested scope named.
Browser mode, framework migrations, other package managers, and remote CI
remain untested unless exercised directly.
