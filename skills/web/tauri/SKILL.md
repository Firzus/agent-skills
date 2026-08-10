---
name: tauri
description: >-
  Tauri v2+ Rust-backed desktop/mobile apps. Use when working in src-tauri,
  tauri.conf.json, commands/IPC, capabilities, plugins, WebviewWindow,
  updater/sidecars, mobile entry points, or evidence-first desktop debugging.
---

# Tauri

Use this skill for Tauri v2+ apps with a web frontend and Rust backend. Prefer
the project's existing conventions, then steer with four leading words:
**owned IPC**, **capabilities-first**, **evidence ladder**, and **layered checks**.

## First Checks

1. Inspect `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`,
   `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, and
   `src-tauri/capabilities/*.json`.
2. Identify the project's existing command runner and dev/build commands from
   lockfiles, `package.json`, scripts, and `build.beforeDevCommand`.
3. Note whether the app targets desktop only or mobile too. Mobile-compatible
   apps need the `lib.rs` entry point shape and platform guards.
4. If debugging a running app, read [debugging.md](debugging.md) before
   launching anything.

Done when: every path in step 1 is accounted for, launch/test commands are
identified (or stated absent from the project), and desktop-vs-mobile scope is
stated.

## Choose The Workflow

Pick one branch. Complete its criterion before claiming the task done.

### Adding a Rust command

Apply **owned IPC**: owned serializable command inputs/outputs, register the
command in `generate_handler![...]` or the project's invoke wrapper, match
frontend invoke names and argument casing.

Before editing `#[tauri::command]` handlers or frontend `invoke` calls, read
[best-practices.md](best-practices.md) and apply its async, error, and state
rules.

For the surrounding Rust discipline — naming semantics, when to panic, error
type choice, visibility, unsafe — read [code-standards.md](code-standards.md).

Done when: every new or changed command is registered through the project's
handler, IPC types are owned and serializable at the boundary, frontend invoke
name/casing match, and `cargo check --manifest-path src-tauri/Cargo.toml`
succeeded — or the concrete blocker preventing that check is stated.

### Adding a plugin

Apply **capabilities-first**: install and register both frontend and Rust
packages, then grant the matching capability permission to the window that
needs it, scoped narrowly.

Before adding or calling a plugin API, read [permissions.md](permissions.md)
and complete its diagnosis checklist.

Done when: that checklist's six confirmation steps all pass (or the failing
step is named with log evidence).

### Debugging desktop behavior

Apply the **evidence ladder** in [debugging.md](debugging.md) end to end,
including cleanup.

Done when: [debugging.md](debugging.md) Cleanup is complete and the evidence
source used is named in the reply.

### Testing or validating a fix

Apply **layered checks** in [testing.md](testing.md).

Done when: each layer (frontend, Rust, shell) has either a recorded
command+result or a stated blocker for skipping it.

### Migrating older code

Before changing app behavior, account for v1 API imports
(`@tauri-apps/api/core` instead of `@tauri-apps/api/tauri`), removed window
APIs (`get_webview_window` / `WebviewWindow`), missing v2 capabilities, and
plugin permission gaps. Use [best-practices.md](best-practices.md) and
[permissions.md](permissions.md) for the replacement patterns.

Done when: every v1 import, removed window API, and missing capability touched
by the change is accounted for.

## Core Structure

- Keep `src-tauri/src/main.rs` thin: call the library entry point only.

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    app_lib::run();
}
```

- Put builder setup, commands, state, plugins, and runtime logic in
  `src-tauri/src/lib.rs`.
- Use `#[cfg_attr(mobile, tauri::mobile_entry_point)]` on `pub fn run()` in
  `lib.rs`.
- Keep `[lib]` in `Cargo.toml` with `crate-type = ["staticlib", "cdylib",
  "rlib"]` when the app may build for mobile.
- Use `#[cfg(desktop)]` / `#[cfg(mobile)]` for platform-only APIs (tray,
  many window APIs, sidecars, shell, updater).
- Keep `build.devUrl` aligned with `beforeDevCommand`, and `build.frontendDist`
  aligned with `beforeBuildCommand`.
