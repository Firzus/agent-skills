# Testing Tauri Apps

Use **layered checks**. A passing frontend test does not prove the Tauri shell
works, and a compiling Rust backend does not prove the webview can invoke it.

Read this file when validating a fix; report each layer with a command-or-skip
reason.

## Pick Commands From The Project

Read lockfiles, `package.json`, `src-tauri/tauri.conf.json`,
`src-tauri/Cargo.toml`, and local docs before running checks. Use the command
runner and scripts already present in the project for frontend and Rust layers.
For Playwright CLI on shell CDP, see [debugging.md](debugging.md).

Common check categories:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features --locked -- -D warnings
<existing-frontend-test-command>
<existing-frontend-build-command>
<existing-tauri-dev-command>
<existing-tauri-build-command>
```

Replace every placeholder with the actual project command, or skip that category
with a note when the project has no matching command. If the project cannot use
`--locked` or `--all-features`, adapt to the existing Cargo workflow and report
the exact command that was run.

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
- Run `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
  --all-features --locked -- -D warnings` when compatible with the project.
  Pay attention to Tauri-relevant lints such as `redundant_clone`,
  `clone_on_copy`, `needless_collect`, and `large_enum_variant`.
- Add Rust unit tests for pure logic that does not require a webview.
- Keep command arguments and return types serializable so compile checks catch
  IPC boundary mistakes early.
- Exercise command error paths. A command returning `Result<T, AppError>` should
  have tests for expected failures in the pure helper layer, and the error text
  or tagged shape should be stable enough for the frontend to handle.
- Keep production command paths on `Result`. In tests, prefer assertions that
  show the unexpected error, such as
  `assert!(result.is_ok(), "unexpected error: {result:?}")`.

Keep tests close to the code they explain. Use descriptive names for backend
logic under `src-tauri`, and split independent behaviors into separate tests:

```rust
#[cfg(test)]
mod parse_settings {
    use super::*;

    #[test]
    fn returns_error_when_json_is_invalid() {
        let error = parse_settings("{").unwrap_err();

        assert_eq!(error.to_string(), "invalid settings JSON");
    }
}
```

For command functions, prefer extracting pure helpers that accept borrowed
inputs (`&str`, `&[T]`, `&Path`) and can be tested without a webview. Leave the
`#[tauri::command]` wrapper focused on deserializing owned IPC inputs, retrieving
state, and converting errors into the serialized IPC shape.

## Tauri Shell Layer

Use `tauri dev` or the project's wrapper when behavior depends on the webview,
capabilities, plugins, windows, sidecars, or updater setup.

For shell checks:

1. Capture stdout/stderr.
2. Verify frontend logs or DevTools when available.
3. Use Playwright CLI on shell CDP only when configured; see
   [debugging.md](debugging.md).
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
- Shell: Tauri run/build evidence, logs, DevTools, Playwright CLI attach, or
  fallback instrumentation.

If a layer was not run, say why.
