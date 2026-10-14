# Setup, migration, updates, and CI

## Choose who owns the toolchain

A local `vite-plus` dependency is enough for project commands. A global `vp`
also manages runtimes and package managers, so installing or reconfiguring it
changes the machine rather than the project. Agree on global or project-local
setup with the user before changing runtime ownership, follow the
[installation guide](https://viteplus.dev/guide/) for the platform, and confirm
that a new shell resolves the intended binary.

Select a Node version within the `engines` range of the installed `vite-plus`.
`vp staged` has stricter Node and Git requirements; read them before enabling
hooks. With a global `vp`, `vp env current` and `vp env doctor` show the runtime
it selects; system `node --version` alone does not.

For a new project, read `vp help create` and choose a template matching the
application or library. For an existing project, migrate instead of scaffolding
over its files, and keep its declared package manager and lockfile.

**Done:** the intended `vp` resolves and the project's own checks run.

## Migrate an existing project

1. Inventory scripts, plugins, checks, TypeScript projects, imports,
   dependencies, runtime pins, hooks, CI workflows, and editor or agent files.
   Compare the project's Vite and Vitest versions with the
   [migration guide](https://viteplus.dev/guide/migrate); treat an upgrade to
   its starting point as a separate prerequisite change.
2. Confirm uncommitted work is preserved: migration writes in place, and a
   `BLOCK` can stop it after partial writes.
3. Read `vp help migrate`, then run it from the workspace root. To leave hooks,
   editor files, and `AGENTS.md` untouched:

   ```bash
   vp migrate --no-interactive --no-agent --no-editor --no-hooks
   ```

   A non-interactive run (the default under `CI` or without a terminal) sets
   those files up on a first migration unless these flags are given. Enable
   them only when the request includes that setup. The flags do not prevent
   the remaining changes:

   | Always possible | Review |
   | --- | --- |
   | Downloads of dependencies, package managers, and tool migrators | Network access and lockfile |
   | ESLint, Prettier, and tsup configuration converted | Rule and format coverage |
   | `.nvmrc` replaced by `.node-version`, Node pins raised | Runtime and CI pins |
   | `voidzero-dev/setup-vp` references rewritten to a specific release | [CI](#ci) |
   | `@andrewbranch/ts5to6` run on a legacy `baseUrl` | Whether `typeAware`/`typeCheck` were enabled |

   When the `baseUrl` fix fails or is declined, migration leaves
   `typeAware`/`typeCheck` disabled. Husky, lefthook, and other hook tools are
   not converted, and hook setup is skipped when one is present.
4. Review the summary and every changed file against the inventory. A zero exit
   can still report `REVIEW` items. Confirm that scripts still do their work,
   plugins remain, test discovery is equivalent, and lint and format rules keep
   their coverage. Remove old configuration only once the replacement accounts
   for its behavior.
5. Check imports and dependencies against the
   [migration rules](https://viteplus.dev/guide/migrate-rules). Config entry
   points move to `vite-plus`; other Vite API imports are not a global
   search-and-replace target. Keep required Vite core aliases, direct peer
   dependencies, package-manager overrides, and catalog entries, and align
   Vitest with the bundled release.
6. Run the static checks, finite tests, and app or library build, then compare
   outputs and behavior with the baseline.

Read the migration rules before handling browser providers, Nuxt test
utilities, declaration merging, dynamic configs, or package-manager peer
resolution; Node-mode tests do not exercise them. Playwright and WebdriverIO
browser providers stay separate requirements; WebdriverIO comes from the
community `@vitest/browser-webdriverio` package. Type checking uses the
Go-based toolchain: keep supplemental framework checks where its diagnostics do
not cover them.

**Done:** every original requirement preserved, or each remaining
incompatibility reported.

## Update the intended layer

| Layer | Command |
| --- | --- |
| Global CLI | `vp upgrade` (Homebrew: `brew upgrade vite-plus`) |
| Project toolchain | `vp migrate`; `--full` also repeats setup |

Each is an explicit maintenance action: review changed pins and aliases, then
repeat focused validation. A global update does not validate a project. Updates
bring new Oxlint and Oxfmt rules that can flag code that passed before, so read
the release notes and repeat `vp check` after each one.

## CI

Keep frozen-lockfile installation and the project's required checks. On GitHub
Actions, reference the latest verified release or commit of
[`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp): its major
`v1` tag no longer follows new releases, and the release `vp migrate` writes can
be older than the latest one. Its dependency cache stays off unless enabled;
keep dependency caching distinct from task result caching. Run changed
workflows on the actual runner before claiming CI coverage; local checks prove
neither action execution nor other platforms.
