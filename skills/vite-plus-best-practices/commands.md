# Commands: Surface, Binaries, Task Runner, Agent Workflow

## Command surface

The `vp` CLI has a fixed set of **built-in commands** that always run the bundled tool. They are **not** overridable by same-named `package.json` scripts.

| To run… | Use | Notes |
|---------|-----|-------|
| Bundled Vite dev server | `vp dev` | Always built-in |
| Bundled Vite production build | `vp build` | Always built-in |
| Bundled Vitest runner | `vp test` | Always built-in, single-run by default |
| `package.json` `"build"` script | `vp run build` (or `vpr build`) | |
| `package.json` `"test"` script | `vp run test` (or `vpr test`) | |

**Critical rule:** `vp build` ≠ `vp run build`. If a project has a custom `"build"` script, `vp build` still runs the built-in Vite build — use `vp run build` for the script.

### Categories

- **Start:** `vp create`, `vp migrate`, `vp config`, `vp install`, `vp env`
- **Develop:** `vp dev`, `vp check`, `vp lint`, `vp fmt`, `vp test`
- **Execute:** `vp run <task>` / `vpr`, `vpx <pkg>`, `vp exec`, `vp dlx`, `vp cache clean`
- **Build:** `vp build` (apps), `vp pack` (libs/CLIs), `vp preview`
- **Manage deps:** `vp add`, `vp remove`, `vp update`, `vp dedupe`, `vp outdated`, `vp why`, `vp info`, `vp list`, `vp rebuild`, `vp link`/`vp unlink`, `vp pm <cmd>`
- **Maintain:** `vp upgrade`, `vp implode`
- **Staged:** `vp staged`

Running `vp` (or `vp run`) with no args opens an interactive picker.

```bash
vp help              # global overview
vp help <command>    # per-command help — run before automating an unfamiliar command
```

## Running binaries

Three commands for executing binaries, by where the binary lives:

| Command | Resolution | Use when |
|---------|------------|----------|
| `vpx <pkg>` | Local first, downloads if missing | General-purpose default |
| `vp exec <cmd>` | **Only** `node_modules/.bin` | Must use the project's pinned version |
| `vp dlx <pkg>` | Always downloads, never installs | One-off remote tools |

```bash
vpx eslint .                      # resolves locally first
vpx typescript@5.5.4 tsc --version
vpx -p cowsay -c 'echo "hi" | cowsay'   # -p extra pkg, -c shell mode

vp exec tsc --noEmit              # fails if not installed locally (CI-safe)
vp dlx create-vite                # one-off, never added to package.json
```

`vpx pkg@version`, `vpx -p`, and `vpx -c` all force the `vp dlx` path.

## Task runner & caching (`vp run`)

`vp run` (alias `vpr`) executes tasks and `package.json` scripts with automatic input tracking, output caching, and dependency-aware execution.

| Source | Caching default |
|--------|-----------------|
| Task in `run.tasks` (`vite.config.ts`) | **Cached** |
| `package.json` script | **Not** cached |

Task names and script names must not overlap.

```bash
vp run build              # run a task or script named "build"
vp run                    # interactive picker
vp run --cache build      # force-enable caching
vp run --no-cache build   # disable caching
```

### Defining tasks

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    enablePrePostScripts: true,   // root-only; default true
    cache: { tasks: true, scripts: false },
    tasks: {
      build: { command: 'vp build', dependsOn: ['lint'], env: ['NODE_ENV'] },
      deploy: { command: 'deploy-script --prod', cache: false, dependsOn: ['build', 'test'] },
      dev: { command: 'vp dev', cache: false },   // never cache long-running servers
    },
  },
});
```

| Option | Notes |
|--------|-------|
| `command` | Shell command. `&&` splits into independently cached sub-tasks. |
| `dependsOn` | Tasks that must finish first. Supports `package#task`. |
| `cache` | Per-task opt-out (cannot be overridden by `--cache`). |
| `env` | Env vars in the cache fingerprint. Supports `VITE_*` wildcards. |
| `untrackedEnv` | Passed through but **not** in the cache key. |
| `input` | Override auto file tracking: `string` glob, `{ auto: true }`, or `{ pattern, base }` (`base`: `"package"`/`"workspace"`). |
| `cwd` | Working dir relative to package root. |

> **Outputs are not cached yet.** Only terminal output (stdout/stderr) is replayed on a hit; `dist/` is not. If you deleted build outputs, use `--no-cache`.

### Avoiding over-tracking

```ts
tasks: {
  build: { command: 'tsc', input: [{ auto: true }, '!**/*.tsbuildinfo', '!dist/**'] },
}
```

Use `input: []` to cache only on command/env changes. `&&` and nested `vp run` are inlined as independent sub-tasks; self-referential recursion (root `build` calling `vp run -r build`) is auto-pruned.

### Cache management

```bash
vp cache clean    # clears node_modules/.vite/task-cache (workspace root)
```

## Agent / AI workflow

Vite+ standardizes tooling for human and AI workflows.

### Validation loop

```bash
vp install
vp check    # format + lint + type-check, single command
vp test
vp build
```

- Prefer `vp check` over separate `vp lint` / `vp fmt` / `tsc --noEmit` — it dedupes work.
- Use `vp check --fix` in autofix loops.
- `vp test` is single-run by default (perfect for CI/agents); `vp test watch` only interactively.

### Bootstrapping

```bash
vp create vite:application --agent claude --editor vscode
vp migrate --agent claude --no-interactive
```

### Command mapping (npm/pnpm/yarn → Vite+)

| Replace | With |
|---------|------|
| `pnpm install` / `npm install` | `vp install` |
| `pnpm add <pkg>` | `vp add <pkg>` |
| `pnpm run build` (custom script) | `vp run build` |
| `vitest` | `vp test` |
| `vite build` / `vite` | `vp build` / `vp dev` |
| `eslint .` / `prettier .` | `vp lint` / `vp fmt` |
| `tsc --noEmit` | `vp check --no-fmt --no-lint` (with `typeCheck: true`) |
| `tsup` / `tsdown` | `vp pack` |
| `lint-staged` | `vp staged` |
| `npx <pkg>` / `pnpx <pkg>` | `vpx <pkg>` |

### Failure recovery

- A failed `vp check` points at the exact file/line — re-run `vp check --fix` first.
- After switching Node.js versions, `vp rebuild` if native modules fail to load.
- After `vp migrate`, confirm `vitest` is gone from deps and no source still imports `vitest` / `@vitest/browser*`.
