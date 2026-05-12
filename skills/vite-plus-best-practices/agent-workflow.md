# Agent / AI Workflow Integration

Vite+ is designed to standardize tooling for both human and AI-assisted workflows. Use these patterns when wiring Vite+ into a coding agent.

## Project Bootstrapping

`vp create` and `vp migrate` accept `--agent <name>` to drop agent instruction files into the project at scaffolding / migration time:

```bash
vp create vite:application --agent claude --editor vscode
vp migrate --agent claude
```

Use `--no-interactive` in CI or when invoked by another agent.

## Recommended Validation Loop

The canonical loop for an agent fixing a project:

```bash
vp install
vp check    # format + lint + type-check, single command
vp test
vp build
```

- Prefer `vp check` over separate `vp lint` / `vp fmt` / `tsc --noEmit` — it dedupes work between the three tools and runs them through `tsgolint`.
- Use `vp check --fix` in autofix loops.
- `vp test` is single-run by default — perfect for CI / agents. (Use `vp test watch` only interactively.)

## Command Mapping

For an agent translating from npm/pnpm/yarn workflows:

| Replace | With |
|---------|------|
| `pnpm install` / `npm install` / `yarn` | `vp install` |
| `pnpm add <pkg>` | `vp add <pkg>` |
| `pnpm run build` (custom script) | `vp run build` |
| `pnpm test` (custom script) | `vp run test` |
| `vitest` | `vp test` |
| `vite build` | `vp build` |
| `vite` | `vp dev` |
| `eslint .` | `vp lint` |
| `prettier .` | `vp fmt` |
| `tsc --noEmit` | `vp check --no-fmt --no-lint` (with `typeCheck: true`) |
| `tsup` / `tsdown` | `vp pack` |
| `lint-staged` | `vp staged` |
| `npx <pkg>` / `pnpx <pkg>` | `vpx <pkg>` |

## When to Cache

For agents running many short tasks (CI, repeated `vp check`):

```bash
vp run --cache check
```

…or set `run.cache.scripts: true` in `vite.config.ts` to cache `package.json` scripts repo-wide.

For long-running servers (`vp dev`) and deploys, set `cache: false` on the task.

## Agent Failure-Recovery Tips

- A failed `vp check` often points at the exact file/line. Re-run with `vp check --fix` to auto-fix everything safe before re-checking.
- After switching Node.js versions, run `vp rebuild` if native modules fail to load.
- If aliased core packages were updated but the lockfile feels stale, run `vp update @voidzero-dev/vite-plus-core @voidzero-dev/vite-plus-test` (see [upgrading.md](./upgrading.md)).
- After `vp migrate`, always confirm both:
  - `vitest` is gone from `dependencies` / `devDependencies`
  - No source file still imports from `vitest` or `@vitest/browser/context`
