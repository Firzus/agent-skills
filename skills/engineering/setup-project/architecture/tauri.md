# Fragment: architecture — Tauri v2

Architecture answers where code goes and what it may depend on.

The `tauri` skill in this library already covers the `src-tauri/` layout, the IPC rules and the capabilities checklist in depth. Keep this fragment to a short placement contract and let the skill carry the detail.

## The core section

```markdown
## Architecture

The frontend in `src/` renders; the Rust backend in `src-tauri/` owns everything privileged. Filesystem access, secrets and network credentials live on the Rust side and reach the frontend only through explicit commands.

Validate arguments inside the command implementation. Capabilities grant access to a command; they do not check what that command does with its arguments, so scope checking is the command's own job.

Declare permissions in `src-tauri/capabilities/`, granting the narrowest scope the feature needs.
```

The validation rule is worth its line because the capabilities system reads like a security boundary and is only half of one — Tauri's own docs list incorrect scope checks in a command as something capabilities do not protect against.

## Optional row — typed IPC bindings

Include only when the project wants type safety across the IPC edge, and present it as the third-party choice it is.

```markdown
Generate TypeScript bindings from the Rust commands with `tauri-specta`: annotate each command with `#[specta::specta]` beside `#[tauri::command]`, register them through `Builder::new().commands(collect_commands![...])`, and export with `builder.export(Typescript::default(), "../src/bindings.ts")`.
```

Tauri ships no first-party binding generator, and `invoke<T>()` types are asserted by the caller with no link to the Rust signature — which is the gap this fills.

Two caveats to pass on when proposing it: `tauri-specta` v2 is still a release candidate, so pin it with `=`; and the export runs under `#[cfg(debug_assertions)]`, so bindings refresh on a debug build rather than on every edit.

The older `ts::export` API is obsolete. Writing the rule with it would send agents down a dead end.

## Sources

- <https://tauri.app/security/capabilities/>
- <https://tauri.app/develop/calling-rust/>
