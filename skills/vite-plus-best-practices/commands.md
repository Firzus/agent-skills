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

### Start

- `vp create` — scaffold a new project, monorepo, or app (see [scaffolding.md](./scaffolding.md))
- `vp migrate` — move an existing project onto Vite+ (see [migration.md](./migration.md))
- `vp config` — configure commit hooks and agent integration
- `vp install` — install dependencies (see [package-management.md](./package-management.md))
- `vp env` — manage Node.js versions (see [getting-started.md](./getting-started.md))

### Develop

- `vp dev` — start the Vite dev server
- `vp check` — format + lint + type-check in one pass (see [check-lint-fmt.md](./check-lint-fmt.md))
- `vp lint` — Oxlint only
- `vp fmt` — Oxfmt only
- `vp test` — Vitest runner

### Execute

- `vp run <task>` — run a task or `package.json` script with caching (see [task-runner.md](./task-runner.md))
- `vpr <task>` — shorthand for `vp run`
- `vpx <pkg>` — resolve a binary locally or download it (see [binaries.md](./binaries.md))
- `vp exec <cmd>` — run from local `node_modules/.bin`
- `vp dlx <pkg>` — one-off remote execution
- `vp cache clean` — clear the task cache

### Build

- `vp build` — application bundle (Vite + Rolldown)
- `vp pack` — library / CLI bundle (tsdown), supports DTS + standalone exes
- `vp preview` — preview the production build locally

### Manage Dependencies

`vp add`, `vp remove`, `vp update`, `vp dedupe`, `vp outdated`, `vp why`, `vp info`, `vp list`, `vp rebuild`, `vp link`, `vp unlink`, `vp pm <cmd>` (raw passthrough).

### Maintain

- `vp upgrade` — update the global `vp` binary
- `vp implode` — remove `vp` and related data from the machine

### Staged

- `vp staged` — run checks on staged files (uses the `staged` block in `vite.config.ts`)

## Interactive Mode

Running `vp` with no arguments opens an interactive command picker.

Running `vp run` with no arguments opens an interactive task picker.

## Help

```bash
vp help              # global overview
vp help <command>    # per-command help, e.g. vp help migrate
```

Always run `vp help` and `vp help <command>` before automating a command you have not used recently — flag surface evolves.
