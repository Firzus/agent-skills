# Tauri Development

Read when changing the Rust/frontend boundary, shared state, events, windows,
or platform entry points.

## Commands and IPC

Tauri Specta is required for application commands and events exchanged
between Rust and TypeScript. Define their contracts in Rust and generate
frontend bindings, including arguments, results, errors, and event payloads.

Identify compatible versions of Tauri, tauri-specta, Specta, and the
TypeScript exporter. Consult the documentation for those versions before
changing the integration.
[Tauri Specta](https://github.com/specta-rs/tauri-specta)

If Specta is missing, include its setup and migration of the affected
contracts in the authorized IPC work. If that migration exceeds the
authorized scope or encounters an incompatibility, report the dependent
IPC changes as blocked and continue independent work. Another generator
or a manually typed wrapper does not satisfy this requirement.

- Route application calls through the generated bindings. An existing
  wrapper may encapsulate them but must not redefine their contracts.
  Keep official SDKs for plugin calls.
- Match registered commands, argument names, and serialization to the
  generated bindings.
- Deserialize inputs and serialize results and errors. Prefer owned inputs
  for async commands, then borrow inside helpers. Preserve working borrowed
  signatures supported by the versions in use.
- Return recoverable failures through `Result`. Preserve observable success
  and error behavior when migrating bindings, without exposing sensitive
  internal diagnostics.
- Integrate Specta into the single `invoke_handler` and preserve existing
  commands. A second registration replaces the first. Give commands the
  visibility required by their organization.
- Expose narrowly scoped business operations for sensitive actions.
  Validate their inputs and enforce their restrictions in Rust.
  Generated types provide neither business validation nor authorization.
  Apply [Permissions](permissions.md) to exposed operations.

[Calling Rust](https://v2.tauri.app/develop/calling-rust/)

Done when Rust contracts, generated bindings, registration, and call behavior
agree, with the checks specified in [Testing](testing.md).

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

Use commands to request an operation, events for notifications, and channels
for ordered or frequent streams.

Apply the generation contract in [Commands and IPC](#commands-and-ipc) to
application events. Target the intended windows or WebViews for sensitive
data. Typed events do not provide access control for their data.

Release frontend subscriptions when their owner unmounts. Make progress,
completion, and errors observable for operations that continue after a
command returns.
[Calling the Frontend](https://v2.tauri.app/develop/calling-frontend/)

Done when the recipient receives the expected data, subscriptions are
released, and failures remain observable.

## Diagnostics

When implementing an operation spanning Rust and the frontend, provide
errors and logs that allow its steps and outcome to be correlated. Reuse
the project's tools and include useful context: operation, application
version, platform, and a correlation ID when operations may overlap.

Exclude secrets and private payloads. Match log levels and volume to their
purpose. Choose crash reporting according to the project's support needs,
without requiring a particular vendor.

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
