# Workspaces and task caching

## Target real packages

Read workspace membership and package names before choosing a filter, and
replace the example name below with an observed package. Without
`--fail-if-no-match`, a filter that matches nothing succeeds without running
anything.

```bash
vp run --filter @example/app --fail-if-no-match build
vp run -r build
```

For a built-in, select the package directory with `vp -C <directory> build` or
`vp -C <directory> pack`.

**Done:** output shows the intended package set and the task actually running.

## Keep lint and format policy at the root

Run shared lint and format policy from the workspace root and put
package-specific rules in root `lint.overrides` and `fmt.overrides`. Packages
can keep their own app and test configuration. From a package directory,
`vp lint` and `vp fmt` use the nearest config with a `lint` or `fmt` block (or
`-c <path>`), while `vp check` always uses the root blocks. A nested block
therefore makes them disagree rather than replace root policy.

## Choose caching deliberately

`package.json` scripts are uncached by default; `run.tasks` entries are cached
by default, and their names must not collide with script names. A cache hit
can restore files and replay old terminal output, so run
`vp run --no-cache <task>` when verification needs a fresh execution.

Mark tasks with external side effects, network writes, deployments, or
long-running processes as uncached:

```ts
run: {
  tasks: {
    verify: { command: 'vp test', cache: false },
  },
}
```

For a cached task, declare the environment variables, inputs, and outputs that
affect its result inside its `cache` object:

```ts
run: {
  tasks: {
    site: {
      command: 'vp build',
      cache: { env: ['API_URL'], input: [{ auto: true }, 'content/**'] },
    },
  },
}
```

| Field | Effect |
| --- | --- |
| `env` | Variables that are part of the cache key |
| `untrackedEnv` | Variables passed to the task without affecting the key |
| `input` | Globs that replace automatic tracking unless the list includes `{ auto: true }` |
| `output` | Files saved with the result and restored on a hit |

These fields at the task's top level make `vp run` fail; `vp migrate` moves
static ones under `cache`. Read the
[tracking contract](https://viteplus.dev/guide/automatic-data-tracking) before
overriding automatic tracking. A run reported as not cached because it traced
too many files can be cached by declaring `input` and `output`; a run that
modifies its own inputs is not cached.

**Done:** an unchanged-input run hits the cache, and changing a real input
produces a miss with updated output; a changed failing test must not replay an
earlier pass. The smoke script proves this for `vp test` and `cache.env`, not
for every build tool or external input.
