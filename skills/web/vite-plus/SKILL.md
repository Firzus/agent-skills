---
name: vite-plus
description: >-
  Vite+ projects using vite-plus and the vp CLI. Use when setting up or
  migrating to Vite+, configuring its checks, tests or library builds,
  debugging built-in versus script execution, or configuring workspace tasks
  and caching. Applies to Vite+ integrations, not every standalone Vite project.
---

# Vite+

## 1. Identify the installed contract

Read the target package and workspace manifests, lockfile, scripts, existing
`vite.config.*`, TypeScript configuration, and relevant CI commands. Run
`vp --version` from the target project to distinguish the global CLI, local
`vite-plus`, bundled tools, and selected runtime. With no global CLI, use the
project's already installed binary through its package manager.

This skill's executable baseline is **Vite+ 0.3.2**, checked on **2026-09-17**.
For a different release, inspect its installed help and declarations before
copying options. Live documentation can describe unreleased behavior.

Choose the path before editing:

| Request | Read next |
| --- | --- |
| Install, scaffold, migrate, upgrade, or change CI setup | [setup-and-migration.md](./setup-and-migration.md) |
| Workspace targeting, shared lint/format policy, or cached tasks | [workspaces.md](./workspaces.md) |

Finish with the target package, resolved versions, existing command path, and
required validation identified. Ordinary feature work uses the installed
toolchain; it does not require migrating or upgrading it.

## 2. Select the command by its owner

| Intended action | Command |
| --- | --- |
| Bundled app dev server / production build | `vp dev` / `vp build` |
| Existing framework or custom build script | `vp run build` |
| Configured script or task | `vp run <name>` |
| Static validation | `vp check` |
| Apply formatting and lint fixes | `vp check --fix` |
| Check formatting without writing | `vp fmt --check` |
| Write formatting | `vp fmt` |
| Bundled tests, one finite run | `vp test` |
| Interactive test watching | `vp test watch` |
| Library build | `vp pack` |

Built-ins do not dispatch to same-named scripts. Preserve framework commands
and supplemental checks already required by the project. A direct `vp build`
must not silently replace a script that generates code or runs a framework CLI.

Finish with each requested action mapped to the built-in, script, or task that
actually owns it.

## 3. Configure only the relevant blocks

Use `defineConfig` from `vite-plus` in the Vite+ configuration. Preserve the
existing plugins and unrelated options. Add the blocks needed for the task,
rather than an empty block for every bundled tool.

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

`vp check` only provides the expected type validation when that path is enabled
and the relevant files belong to its TypeScript projects. Inspect `check.fmt`,
`check.lint`, ignore patterns, and CLI skips before treating a green exit as full
coverage. Keep dependency and generated-output directories ignored; the blank
smoke fixture needed `.gitignore` entries for `node_modules/` and its outputs.
Retain framework-specific type checkers until equivalent coverage is proven.

Use `vite-plus/test` for test APIs. A minimal finite test is:

```ts
import { expect, test } from 'vite-plus/test';
import { add } from './index';

test('adds two numbers', () => {
  expect(add(2, 3)).toBe(5);
});
```

For a library, add packaging options to the existing config:

```ts
pack: {
  entry: ['src/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
}
```

Select only the formats consumers need. Inspect emitted files and align
`package.json` exports/types with the actual filenames. `vp pack` builds files;
it neither publishes them nor substitutes for a package-manager tarball check.

Finish with the changed configuration loaded successfully by its actual
command, not merely accepted by an editor.

## 4. Verify the requested behavior

Run `vp check`, the relevant finite tests, and the owning app/library build.
Use the project's script path when it contains required additional steps.
Inspect build artifacts; for library changes, exercise a consumer import.

When changing validation or cache configuration, prove the failure boundary in
an isolated fixture: introduce a type error, failing assertion, or changed task
input; require the appropriate nonzero exit; restore the fixture and require a
passing run. A cached replay is not evidence of a fresh execution.

Finish by reporting the exact commands, versions, results, and any untested
scope. Do not report browser mode, a framework migration, another package
manager, or remote CI as validated by the Node-mode baseline smoke.
