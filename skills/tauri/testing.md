# Testing Tauri Apps

Use layered checks. A passing frontend test does not prove the Tauri shell works,
and a compiling Rust backend does not prove the webview can invoke it.

## Pick Commands From The Project

Read lockfiles, `package.json`, `src-tauri/tauri.conf.json`,
`src-tauri/Cargo.toml`, and local docs before running checks. Use the command
runner and scripts already present in the project. Do not assume or introduce a
tool that the project does not already use.

Common check categories:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
<existing-frontend-test-command>
<existing-frontend-build-command>
<existing-tauri-dev-command>
<existing-tauri-build-command>
```

Replace every placeholder with the actual project command, or skip that category
with a note when the project has no matching command.

## Frontend Layer

Use normal web tooling for frontend-only bugs:

- Run the configured frontend dev server or test command.
- Open `build.devUrl` in a normal browser for fast console/network inspection.
- Use Playwright, Chrome DevTools, or framework tests for DOM and routing issues.
- Only blame Tauri after the same path works in a browser and fails in the shell.

## Rust Layer

Use Rust checks for backend and command logic:

- Run `cargo check --manifest-path src-tauri/Cargo.toml` after command, state, or
  plugin changes.
- Add Rust unit tests for pure logic that does not require a webview.
- Keep command arguments and return types serializable so compile checks catch
  IPC boundary mistakes early.

## Tauri Shell Layer

Use `tauri dev` or the project's wrapper when behavior depends on the webview,
capabilities, plugins, windows, sidecars, or updater setup.

For shell checks:

1. Capture stdout/stderr.
2. Verify frontend logs or DevTools when available.
3. Probe CDP only when configured; see [debugging.md](debugging.md).
4. Confirm plugin permissions with [permissions.md](permissions.md).
5. Stop any dev server or spawned app process before ending the task.

## Release And Bundle Checks

When changes affect packaging, updater, icons, sidecars, or `frontendDist`, run a
bundle-oriented check if the project supports it. Verify:

- The frontend build output matches `build.frontendDist`.
- `bundle.externalBin` includes required sidecars for each target.
- Updater endpoints are HTTPS for production.
- Signing keys and generated artifacts are handled by the project's existing
  release process, not committed into the repo.

## Reporting

State checks by layer:

- Frontend: command or browser evidence.
- Rust: `cargo check` or Rust test evidence.
- Shell: Tauri run/build evidence, logs, DevTools, CDP endpoint, or fallback
  instrumentation.

If a layer was not run, say why.
