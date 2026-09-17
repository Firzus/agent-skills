# Setup, migration, and CI

## Establish the setup boundary

Use the existing local `vite-plus` installation when it meets the request.
Global `vp` additionally manages runtimes and package managers; installing or
reconfiguring it changes the machine, not just the project. Select global or
project-local setup explicitly with the user before changing runtime ownership.
Follow the [official installation guide](https://viteplus.dev/guide/) for the
selected platform and verify a new shell can resolve the intended binary.

For 0.3.2 the local package's Node engine range is
`^20.19.0 || ^22.18.0 || >=24.11.0`. Check the installed release's manifest when
choosing a runtime. `vp env current` and `vp env doctor` inspect the global
manager's selection; reading system `node --version` alone is insufficient.

For a new project, inspect `vp help create` and choose a template appropriate to
the application or library. For an existing project, use migration rather than
scaffolding over its files. Keep its declared package manager and lockfile.
Finish setup by resolving the local toolchain and running its actual checks.

## Migrate with a reviewable boundary

1. Inventory existing scripts, plugins, checks, TypeScript projects, imports,
   dependencies, hooks, and editor/agent files. Preserve uncommitted work.
   The documented starting point is Vite 8+ and Vitest 4.1+; handle prerequisite
   upgrades as a distinct compatibility change.
2. Read `vp help migrate` from the selected release. Run from the workspace
   root. To preserve existing setup ownership while converting the toolchain:

   ```bash
   vp migrate --no-interactive --no-agent --no-editor --no-hooks
   ```

   These flags skip setup files, not installation: migration can download
   dependencies, package managers, and tool-specific migrators. Enable hook or
   editor setup only when it is part of the requested change.
3. Review every changed file against the inventory. Confirm scripts still do
   required work, plugins remain, test discovery is equivalent, and lint/format
   rules retain their intended coverage. Remove old configuration only after
   its behavior has been accounted for in the replacement.
4. Verify imports and dependency identities using the installed migration
   rules. Config entry points move to `vite-plus`; arbitrary non-config Vite
   API imports are not a global search-and-replace target. Keep required Vite
   core aliases, direct peer dependencies, package-manager overrides, and
   catalog entries. Align Vitest with the bundled release rather than removing
   every standalone-looking dependency.
5. Run the project's static checks, finite tests, and app or library build.
   Compare the outputs and relevant behavior with the baseline. Migration is
   complete only when every original requirement is preserved or an explicit
   remaining incompatibility is reported.

Load the release's [migration rules](https://viteplus.dev/guide/migrate-rules)
before handling browser providers, Nuxt test utilities, declaration merging,
dynamic configs, unsupported hook tools, or package-manager peer resolution.
Node-mode tests do not exercise these branches. Playwright/WebdriverIO browser
providers and their browser framework remain separate requirements.

Type checking uses the Go-based toolchain. A legacy `baseUrl` needs conversion;
do not hide incompatibility by silently disabling validation. Check installed
diagnostics and retain supplemental framework checks where needed.

## Upgrade the intended layer

`vp upgrade` updates the global installation. `vp migrate` aligns an existing
Vite+ project's local toolchain; `--full` also repeats setup. Treat either as an
explicit maintenance action, review changed pins/aliases, and repeat focused
validation. A global upgrade alone does not validate a project upgrade.

## CI

Keep frozen-lockfile installation and the project's existing required checks.
For GitHub Actions, select a verified exact release or commit of
[`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp); its `v1` tag
is frozen. Separate dependency caching from task-result caching. Test workflow
changes on the actual runner before claiming CI coverage; the local smoke
record establishes neither action execution nor cross-platform support.
