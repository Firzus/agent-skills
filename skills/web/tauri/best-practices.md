# Tauri Development

Read when changing the Rust/frontend boundary, shared state, events, windows,
or platform entry points.

## Commands and IPC

Trace the frontend caller through its existing bindings to the Rust handler.
Keep typed wrappers and generated bindings rather than introducing a second
invoke path.

- Import v2 invoke from `@tauri-apps/api/core`. Match the registered command
  name and argument casing; camelCase is the default unless the command
  explicitly changes it.
- Deserialize command inputs and serialize successful results and errors.
  Prefer owned input values for async commands, then borrow inside helpers.
  Borrowed async inputs are not universally invalid; preserve working
  signatures supported by the project's Tauri version.
- Keep errors in the application's existing IPC shape. Return recoverable
  failures through `Result`, not panics or raw internal diagnostics.
- Extend the existing invoke handler; a second `invoke_handler` registration
  replaces the first. Commands in separate modules need appropriate visibility;
  commands at the library root should not be made public automatically.

Verify exact signatures against
[Calling Rust](https://v2.tauri.app/develop/calling-rust/) when changing a
command or migrating its bindings.

Done when the caller, registered handler, argument names, serialized result,
and failure handling agree.

## State and long-running work

Match the managed type exactly: managing `Mutex<AppState>` and requesting
`State<AppState>` are different contracts. Type mismatches can fail at runtime.
Reuse the existing managed service rather than creating a duplicate singleton.

For short updates, use the project's synchronous lock and release its guard
before awaiting. Clone or copy the needed data under the lock, then perform
I/O outside it. Use an async mutex only when the access pattern requires
holding a lock across an await. See
[State Management](https://v2.tauri.app/develop/state-management/).

Move blocking I/O or CPU-heavy work to a blocking worker such as
`tauri::async_runtime::spawn_blocking`; wrapping blocking code in an async
task does not make it nonblocking. Use async I/O for asynchronous work.
When returning before work finishes, make completion, errors, progress, and
cancellation observable through the existing application contract.
[Runtime API](https://docs.rs/tauri/latest/tauri/async_runtime/index.html)

## Events and channels

Use events for notifications and channels for ordered streaming to a caller.
Target the intended window or WebView for local notifications instead of
broadcasting private data. Release frontend event listeners when their owner
unmounts. Event payloads and listeners need their own contract; events do not
replace validated command inputs.
[Calling the Frontend](https://v2.tauri.app/develop/calling-frontend/)

Done when the consumer receives the intended payload, subscriptions are
released, and long-running failures cannot disappear after command success.

## Windows and platform structure

Keep the desktop entry point thin and reuse the library's builder setup.
Organize commands and services in existing modules rather than concentrating
all runtime logic in `lib.rs`.

For mobile targets, preserve the library crate types and
`#[cfg_attr(mobile, tauri::mobile_entry_point)]` entry point. Gate desktop-only
dependencies, plugin registration, and calls together; gating only an import
does not make a desktop feature mobile-compatible.
[Project Structure](https://v2.tauri.app/start/project-structure/)

Distinguish a native window from its WebViews. When retrieving a combined
WebView window, use `Manager::get_webview_window` and handle a missing label.
Select labels from project configuration or runtime creation code, not a
display title. Propagate failed native operations when the task depends on
them succeeding.
[Manager API](https://docs.rs/tauri/latest/tauri/trait.Manager.html)

Use Tauri path resolvers for application directories rather than constructing
OS-specific paths. Before exposing a plugin operation to the frontend, read
[Permissions](permissions.md).

Done when the affected targets retain their entry points and platform guards,
and window operations account for missing or closed targets.
