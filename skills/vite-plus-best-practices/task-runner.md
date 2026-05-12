# Vite Task & Caching

`vp run` (and the `vpr` shorthand) executes tasks and `package.json` scripts with automatic input tracking, output caching, and dependency-aware execution.

## Tasks vs Scripts

| Source | Caching default |
|--------|-----------------|
| Task defined in `run.tasks` in `vite.config.ts` | **Cached by default** |
| `package.json` script | **Not** cached by default |

Task names and script names must not overlap.

```bash
vp run build              # run a task or script named "build"
vpr build                 # same
vp run                    # interactive picker
vp run --cache build      # force-enable caching for this invocation
vp run --no-cache build   # disable caching for this invocation
```

## Defining Tasks

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    enablePrePostScripts: true,   // pre/postX hooks for scripts (default: true)
    cache: {
      tasks: true,                 // default
      scripts: false,              // default
    },
    tasks: {
      build: {
        command: 'vp build',
        dependsOn: ['lint'],
        env: ['NODE_ENV'],
      },
      deploy: {
        command: 'deploy-script --prod',
        cache: false,              // never cache deploys
        dependsOn: ['build', 'test'],
      },
      dev: {
        command: 'vp dev',
        cache: false,              // never cache long-running servers
      },
    },
  },
});
```

Each task in `vite.config.ts` requires its own `command`. A task name cannot also exist as a `package.json` script.

`enablePrePostScripts` can only be set in the workspace root's `vite.config.ts`. Setting it in a sub-package errors.

## Task Options

| Option | Type | Notes |
|--------|------|-------|
| `command` | `string` | Shell command. `&&` splits into independently cached sub-tasks. |
| `dependsOn` | `string[]` | Tasks that must finish first. Supports `package#task` notation. |
| `cache` | `boolean` (default `true`) | Per-task opt-out. Cannot be overridden by `--cache`. |
| `env` | `string[]` | Env vars included in the cache fingerprint. Supports `VITE_*` wildcards. |
| `untrackedEnv` | `string[]` | Env vars passed through but **not** in the cache key. |
| `input` | `Array<string \| { auto: true } \| { pattern, base }>` | Override automatic file tracking. |
| `cwd` | `string` | Working dir relative to the package root. |

## Caching

Vite Task records, on success:
- Process exit was 0
- Stdout / stderr (replayed on cache hit)
- Hashes of every file the process opened
- Missing-file probes (creating that file later invalidates)
- Directory listings (adding/removing files in a watched dir invalidates)
- Values of `env` entries

Cache misses are explained:

```
$ vp lint  ✗ cache miss: 'src/utils.ts' modified, executing
$ vp build ✗ cache miss: env changed, executing
$ vp test  ✗ cache miss: args changed, executing
```

> **Outputs are not cached yet.** Only terminal output is cached and replayed. `dist/` is not. If you delete build outputs, use `--no-cache` to force a real re-run.

### Avoiding Over-tracking

Some tools maintain their own caches (`.tsbuildinfo`, `target/`) that change between runs even when source code does not. Exclude them:

```ts
tasks: {
  build: {
    command: 'tsc',
    input: [{ auto: true }, '!**/*.tsbuildinfo', '!dist/**'],
  },
}
```

To use explicit globs only (no auto-tracking):

```ts
tasks: {
  build: {
    command: 'vp build',
    input: ['src/**/*.ts', 'vite.config.ts'],
  },
}
```

String globs resolve relative to the package directory. For workspace-relative globs use the object form:

```ts
input: [
  { auto: true },
  { pattern: 'shared-config/**', base: 'workspace' },
]
```

`base` must be `"package"` or `"workspace"`.

To disable file tracking entirely and cache only on command/env changes, set `input: []`.

## Environment Variables

By default tasks run in a clean environment. A small set of common vars is always passed through:

- System: `HOME`, `USER`, `PATH`, `SHELL`, `LANG`, `TZ`
- Node.js: `NODE_OPTIONS`, `COREPACK_HOME`, `PNPM_HOME`
- CI/CD: `CI`, `VERCEL_*`, `NEXT_*`
- Terminal: `TERM`, `COLORTERM`, `FORCE_COLOR`, `NO_COLOR`

Add anything else explicitly via `env` (in fingerprint) or `untrackedEnv` (not in fingerprint).

## Compound Commands

`&&` is split into independently cached sub-tasks:

```json
{
  "scripts": {
    "check": "vp lint && vp build"
  }
}
```

Run `vp run --cache check` — `vp lint` and `vp build` each get their own cache entry. Only the affected one re-runs on a change.

Nested `vp run` is also inlined (not re-spawned), so each nested sub-task is cached independently. Self-referential recursion (root `build` script that calls `vp run -r build`) is auto-pruned.

## Workspace Execution

```bash
vp run build                       # current package only
vp run @my/app#build               # target a specific package
vp run -r build                    # all packages, dependency order
vp run -t @my/app#build            # one package + all its deps
vp run --filter @my/app build      # by name
vp run --filter "@my/*" build      # by glob
vp run --filter ./packages/app build  # by directory
vp run --filter "@my/app..." build    # include dependencies
vp run --filter "...@my/core" build   # include dependents
vp run --filter "@my/*" --filter "!@my/utils" build  # exclude
vp run -w build                    # workspace root
```

Multiple `--filter` flags union; exclusions apply after inclusions.

## Concurrency

```bash
vp run -r --concurrency-limit 8 build     # cap parallel tasks
vp run -r --concurrency-limit 1 build     # serial
vp run -r --parallel dev                  # ignore deps, unlimited
vp run -r --parallel --concurrency-limit 4 dev   # parallel + cap
```

`--concurrency-limit` overrides the `VP_RUN_CONCURRENCY_LIMIT` env var (default: 4).

## Execution Summary

```bash
vp run -r -v build         # show detailed summary now
vp run --last-details      # show summary from the last run
```

## Cache Management

```bash
vp cache clean             # clear node_modules/.vite/task-cache
```

Cache lives at `node_modules/.vite/task-cache` in the workspace root.
