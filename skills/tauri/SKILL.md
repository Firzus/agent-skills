---
name: tauri
description: >-
  Tauri v2+ app development and debugging for Rust-backed desktop and mobile
  apps. Use when configuring src-tauri, tauri.conf.json, commands, capabilities,
  plugin permissions, IPC, channels, WebviewWindow APIs, mobile support,
  updater/distribution, or automated desktop debugging.
---

# Tauri

Use this skill for Tauri v2+ apps with a web frontend and Rust backend. Prefer
the existing project conventions, then apply these rules to avoid the common
v2 failures: missing capabilities, unregistered commands, non-serializable IPC
types, blocked async commands, and unobservable desktop bugs.

## First Checks

1. Inspect `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`,
   `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, and
   `src-tauri/capabilities/*.json`.
2. Confirm the project's existing command runner and dev command from lockfiles,
   `package.json`, scripts, and `build.beforeDevCommand`; do not assume a tool.
3. Check whether the app targets desktop only or mobile too. Mobile-compatible
   apps need the `lib.rs` entry point shape and platform guards.
4. If debugging a running app, read [debugging.md](debugging.md) before
   launching anything.

## Choose The Workflow

- Adding a Rust command: update `lib.rs`, use serializable owned inputs, register
  the command in `generate_handler![...]` or the project's invoke abstraction,
  then verify the frontend invoke names and argument casing.
- Adding a plugin: install/register both frontend and Rust packages, add the
  matching capability permission, scope it narrowly, and verify the window label
  receives that capability. See [permissions.md](permissions.md).
- Debugging desktop behavior: capture logs first, then try DevTools/CDP only when
  the platform supports it. See [debugging.md](debugging.md).
- Testing or validating a fix: separate frontend, Rust, and Tauri-shell checks.
  See [testing.md](testing.md).
- Migrating older code: check for v1 API imports, removed window APIs, missing
  v2 capabilities, and plugin permission gaps before changing app behavior.

## Core Structure

- Keep `src-tauri/src/main.rs` thin. It should call the library entry point and
  contain no app logic:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}
```

- Put builder setup, commands, state, plugin registration, and runtime logic in
  `src-tauri/src/lib.rs`.
- Use `#[cfg_attr(mobile, tauri::mobile_entry_point)]` on `pub fn run()` in
  `lib.rs`.
- Keep `[lib]` in `Cargo.toml` with `crate-type = ["staticlib", "cdylib",
  "rlib"]` when the app may build for mobile.

## Commands And IPC

- Register every direct `#[tauri::command]` in `tauri::generate_handler![...]`.
  If the project uses a wrapper such as `tauri-specta`, verify the wrapper owns
  the invoke handler and includes the command.
- Use owned parameters in async commands. Do not use borrowed inputs such as
  `&str` in async command signatures.
- Command arguments must implement `serde::Deserialize`; return values and
  errors must implement `serde::Serialize`.
- Prefer `Result<T, AppError>` for fallible commands. Derive or implement
  `Serialize` for the error, commonly by serializing `self.to_string()`.
- Do not block the main thread. Use async I/O, `tokio::spawn`, or
  `tauri::async_runtime::spawn` for long work.
- Remember the JS/Rust naming boundary: frontend args are camelCase while Rust
  fields are usually snake_case.

## Permissions And Plugins

Tauri v2 denies APIs by default. Installing or registering a plugin is not
enough.

- Ensure `app.security.capabilities` names the relevant files in
  `src-tauri/capabilities/`.
- Add plugin permission strings to a capability file before using frontend APIs:
  `fs:default`, `dialog:default`, `opener:default`, `shell:default`,
  `http:default`, `store:default`, `log:default`, `process:default`, etc.
- Scope permissions narrowly when a plugin supports path, URL, or command
  allowlists.
- Check plugin docs for required `tauri.conf.json` configuration, especially
  updater, shell, fs, http, store, and platform-specific plugins.

See [permissions.md](permissions.md) for capability examples.

## State, Events, And Windows

- Manage shared state with `.manage(...)` and retrieve it with the exact same
  type in `State<T>`. For mutable shared data, use `Mutex`, `RwLock`, or an
  async-aware primitive that matches the access pattern.
- Use events for fire-and-forget notifications from Rust to frontend. Clean up
  JS listeners when components unmount.
- Use `tauri::ipc::Channel<T>` for high-frequency or typed streaming.
- In Tauri v2, access windows with `app.get_webview_window("main")` and
  `tauri::WebviewWindow`; do not use removed v1 APIs like `get_window`.
- Prefer `app.path()` and other Tauri path APIs over hardcoded paths.

See [best-practices.md](best-practices.md) for focused patterns.

## Configuration Essentials

- `build.devUrl` must match the frontend dev server started by
  `build.beforeDevCommand`.
- `build.frontendDist` must point to the built frontend output used by
  `beforeBuildCommand`.
- Keep CSP strict for production. If dev needs broader CSP, avoid letting dev
  relaxations become unexplained production defaults.
- Updater endpoints must be HTTPS in production and artifacts must be signed.
- Sidecars and external binaries must be declared in `bundle.externalBin` and
  packaged for each target platform.

## Automated Debugging

Default to the layered workflow in [debugging.md](debugging.md):

1. Capture frontend dev server output, Rust stdout/stderr, and plugin/file logs.
2. Check whether `build.devUrl` is already occupied before relaunching a dev app;
   use `scripts/check-dev-url.py` for a quick preflight.
3. Open WebView DevTools manually or programmatically when the app exposes it.
4. Try CDP only when you can verify a listening endpoint; use
   `scripts/probe-cdp.py` instead of assuming success.
5. Fall back to deterministic instrumentation: console forwarding,
   `tauri-plugin-log`, test-only commands, screenshots, event traces, and saved
   debug artifacts.
6. Stop every dev server or background Tauri process you start, including
   orphaned app executables after partial launch failures.

## Common Failure Playbooks

- `Command not found`: confirm the `#[tauri::command]` name and registration in
  `generate_handler![...]`, or the command export in wrappers such as
  `tauri-specta`.
- `Permission denied`: inspect plugin registration, capability permissions,
  `app.security.capabilities`, and the target window label.
- White screen: verify `build.devUrl`, `beforeDevCommand`, frontend console
  errors, CSP, and whether the built frontend exists for production runs.
- IPC returns `undefined`: check the Rust command return value, frontend invoke
  argument names, and serializable `Result`/error handling.
- Sidecar or updater failure: verify `bundle.externalBin`, target-specific
  binaries, HTTPS updater endpoints, and signed artifacts.

## Tauri v1 To v2 Traps

- Import frontend invoke APIs from `@tauri-apps/api/core`, not the v1
  `@tauri-apps/api/tauri` path.
- Use `app.get_webview_window("main")` and `tauri::WebviewWindow`; do not use
  removed v1 APIs like `get_window`.
- Treat capabilities as required, not optional. A registered plugin still fails
  without matching permissions.
- Keep mobile-ready apps split through `lib.rs`; do not put runtime setup only
  in `main.rs`.

## Mobile Notes

- IPC commands, events, channels, and `AppHandle` are portable patterns.
- System tray, many window APIs, sidecars, shell behavior, updater flows, and
  desktop notifications may be desktop-only or platform-constrained.
- Use `#[cfg(desktop)]`, `#[cfg(mobile)]`, and target-specific modules for
  platform behavior.
- Add Rust mobile targets and platform SDK setup before diagnosing build errors
  as app code defects.

## Verification Checklist

- `src-tauri/src/main.rs` is a passthrough and `lib.rs` owns runtime setup.
- Commands are registered directly or through the project's invoke-handler
  abstraction.
- Async commands use owned parameters and serializable return/error types.
- Capabilities include every used plugin permission.
- `tauri.conf.json` dev/build paths match actual frontend scripts.
- Frontend, Rust, and Tauri-shell checks have been run or explicitly scoped out.
- Debug runs preserve logs from both frontend and Rust, and any CDP claim is
  backed by a verified endpoint.
