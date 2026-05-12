# Command Surface

The `vp` CLI has a fixed set of **built-in commands** that always run the bundled tool. They are not overridable by same-named `package.json` scripts.

## Built-in vs Scripts

| To run… | Use | Notes |
|---------|-----|-------|
| The bundled Vite dev server | `vp dev` | Always built-in |
| The bundled Vite production build | `vp build` | Always built-in |
| The bundled Vitest runner | `vp test` | Always built-in, single-run by default |
| `package.json` `"build"` script | `vp run build` (or `vpr build`) | |
| `package.json` `"test"` script | `vp run test` (or `vpr test`) | |

**Critical rule:** `vp build` ≠ `vp run build`. If a project has a custom `"build"` script in `package.json`, `vp build` still runs the built-in Vite build — use `vp run build` to execute the script.

## Categories

### Develop

- `vp dev` — start the Vite dev server (see [task-runner.md](./task-runner.md) for non-cached behavior)
- `vp check` — format + lint + type-check in one pass (see [check-lint-fmt.md](./check-lint-fmt.md))
- `vp lint` — Oxlint only
- `vp fmt` — Oxfmt only
- `vp test` — Vitest runner (see [testing.md](./testing.md))

### Execute

- `vp run <task>` — run a task or `package.json` script with caching (see [task-runner.md](./task-runner.md))
- `vpr <task>` — shorthand for `vp run`
- `vp cache clean` — clear the task cache

### Build

- `vp build` — application bundle (Vite 8 + Rolldown), see [build-and-pack.md](./build-and-pack.md)
- `vp pack` — library / CLI bundle (tsdown)
- `vp preview` — preview the production build locally

### Manage Dependencies

See [package-management.md](./package-management.md):
`vp install`, `vp add`, `vp remove`, `vp update`, `vp dedupe`, `vp outdated`, `vp why`, `vp info`, `vp list`, `vp rebuild`, `vp link`, `vp unlink`.

### Project

- `vp create` — scaffold a new project (see [scaffolding.md](./scaffolding.md))
- `vp migrate` — move an existing project onto Vite+ (see [migration.md](./migration.md))
- `vp config` — configure commit hooks (see [commit-hooks.md](./commit-hooks.md))
- `vp staged` — run checks on staged files

## Interactive Mode

Running `vp` with no arguments opens an interactive command picker.

Running `vp run` with no arguments opens an interactive task picker.

## Help

```bash
vp help              # global overview
vp help <command>    # per-command help
```

Always consult `vp help <command>` for the current flag surface — Vite+ is moving fast and flags evolve between releases.
