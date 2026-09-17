# Workspaces and task caching

## Target a real package

Read workspace membership and package names before choosing filters. Run
shared lint/format policy from the workspace root; place package-specific
rules in root `lint.overrides` and `fmt.overrides`. Packages can retain their
own app/test configurations. Nested lint/format blocks are not an automatic
replacement for root policy.

Use `vp -C <package-directory> build` or `pack` to select an explicit working
directory. For named tasks:

```bash
vp run --filter @example/app --fail-if-no-match build
vp run -r build
```

Replace the example name with an observed workspace package. A filter with no
matches can otherwise succeed without testing anything. Finish with output
showing the intended package set and actual task execution.

## Choose caching deliberately

`package.json` scripts are uncached by default; `run.tasks` are cached by
default. Task names must not collide with script names. Keep external side
effects and long-running processes explicitly uncached:

```ts
run: {
  tasks: {
    verify: { command: 'vp test', cache: false },
  },
}
```

A hit can restore files and replay old terminal output. Run
`vp run --no-cache <task>` when verification requires fresh execution.

For a cached task, identify inputs, outputs, and environment variables that
affect the result. `env` contributes to the key; `untrackedEnv` does not.
Explicit input/output configuration replaces automatic tracking; consult the
[tracking contract](https://viteplus.dev/guide/automatic-data-tracking) before
overriding it. Keep network writes and deployment uncached.

Finish a cache change by observing an unchanged-input hit, then changing a
real input and requiring a miss with updated output. A failing changed test
must not replay a previously passing run. The baseline smoke tests this
boundary for `vp test`, not for every possible build tool or external input.
