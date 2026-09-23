# tauri-agent-kit

Independent, unofficial MCP diagnostics and automation for Tauri 2 on Windows.

This application is maintained inside [Firzus/agent-skills](https://github.com/Firzus/agent-skills)
at `tools/tauri-agent-kit/`. It is not an installable agent skill. Run the build,
test, and packaging commands below from this directory.

The TypeScript server speaks MCP over stdio. The Rust plugin addresses the application's own WebView2 controllers over authenticated local named pipes. No Chrome instance, external DevTools MCP, remote-debugging port, or frontend framework is required.

## Requirements

- Windows x64 with WebView2 Evergreen.
- Tauri 2.11.5. The current implementation uses Tauri's `unstable` feature for child-WebView inventory.
- Node 22 or newer, pnpm 10.33.2, and Vite+ 0.3.2.
- Rust/Cargo and the Windows C++ build tools.

Version 0.1.0-alpha.1 is a pre-release candidate. Registry installation below becomes available after publication. APIs may change before 1.0.

## Build and test

```powershell
vp install
vp pack
vp check
vp test
cargo test -p tauri-plugin-agent-kit --lib --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo build -p agent-kit-fixture --locked
vp run test:live
vp run test:security
```

`vp pack` packages the server and instrumentation libraries. The fixture uses static HTML rather than a frontend build tool. `test:live` launches only its own fixture process, exercises it through a real MCP client, writes evidence under `artifacts/`, and stops that process in `finally`. It never starts a game or launcher.

## Integrate an application

Add the plugin dependency to the application's Cargo manifest:

```toml
[dependencies]
tauri-plugin-agent-kit = "=0.1.0-alpha.1"
```

Register the plugin before the application runs:

```rust
.plugin(tauri_plugin_agent_kit::init(tauri_plugin_agent_kit::Config {
    enabled: std::env::var_os("TAURI_AGENT_KIT").is_some(),
    advanced: std::env::var_os("TAURI_AGENT_KIT_ADVANCED").is_some(),
}))
```

Start the application using its normal launch command with `TAURI_AGENT_KIT=1`. Release builds do not start the bridge even when enabled. Preserve existing application launch/elevation rules.

Configure your MCP client to run the pinned npm package. On Windows, clients that cannot execute the npx shim directly can use this configuration:

```json
{
  "mcpServers": {
    "tauri-agent-kit": {
      "command": "cmd",
      "args": ["/d", "/s", "/c", "npx --yes tauri-agent-kit@0.1.0-alpha.1"]
    }
  }
}
```

Run `npx --yes tauri-agent-kit@0.1.0-alpha.1 --help` to inspect the CLI.

The client process must inherit `LOCALAPPDATA`. Advanced tools additionally require the server argument `--advanced` and the application's `advanced: true` setting. Treat this as privileged code execution inside the selected WebView, not a sandbox.

## Workflow

1. `list_instances`: choose the intended process and instance UUID.
2. `list_targets`: choose a `webviewId` or `windowId`; never select by title.
3. `diagnose`: inspect native visibility and bounded JavaScript readiness.
4. `snapshot`: obtain element references from the top-level document.
5. Perform one action, then take a fresh snapshot and verify the result.
6. `screenshot`: inspect actual WebView pixels, not a DOM reconstruction.

Each new snapshot invalidates earlier references. Detached elements, changed semantics, moved or resized targets and occlusion are rejected before dispatch; unrelated DOM animations do not invalidate all controls. Actions do not automatically assert their own success. `type_text` inserts literal single-line text without pressing Enter. Use `press_key` separately to submit.

## Tools

| Tools                                       | Purpose                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `list_instances`, `list_targets`            | Authenticated discovery and exact target identity                            |
| `diagnose`                                  | Rust responsiveness, native visibility/focus/DPI, bounded document readiness |
| `snapshot`, `screenshot`                    | DOM controls/text and native WebView viewport pixels                         |
| `click`, `type_text`, `press_key`, `scroll` | WebView interactions; explicit Windows mode for click/text/key               |
| `set_zoom`, `focus_window`                  | Explicit controller zoom and native focus requests                           |
| `get_logs`, `get_ipc_calls`                 | Bounded metadata records with source and cursor                              |
| `evaluate_js`, `invoke_command`             | Optional privileged tools, disabled by default                               |

## Optional IPC instrumentation

Grant `agent-kit:allow-record-ipc` only to the WebViews that will report IPC diagnostics. Install `tauri-agent-kit-instrumentation@0.1.0-alpha.1` and import `instrumentInvoke` from `tauri-agent-kit-instrumentation` and wrap the application's existing `invoke` function. The wrapper preserves arguments, results and failures; reporting failures do not change the application result.

Only command name, duration, outcome and WebView identity are recorded. Payloads and results are not collected. This does not intercept calls made through other wrappers and is not a complete command registry.

Rust consumers can feed the managed `Arc<Diagnostics>` using `push`, or attach `Diagnostics` as a `tracing::Layer` in their own subscriber. The plugin never installs a global logger. The built-in console observer records event metadata, not console argument values; the tracing layer similarly omits event fields. Explicit `push` callers are responsible for redacting their data.

## Limits

- Windows is the only implemented backend. No promise of Tauri 2.0.x or other OS compatibility.
- DOM snapshots cover the top-level document; iframe traversal, shadow roots, storage, cookies, drag-and-drop and navigation tools are not implemented.
- Screenshots show the WebView viewport, including its transparency, not the final Windows desktop composition.
- Windows input requires the target already in the foreground. Focus stealing, UIPI, transparency and occlusion can cause a safe rejection. No automatic elevation is attempted.
- A timeout or cancellation may follow an already dispatched action. Never automatically retry a write.
- A force-killed app can leave a stale manifest. Discovery probes and ignores unavailable endpoints; it does not delete someone else's files.

See [security](docs/security.md), [competitor audit](docs/competitor-audit.md), and [validation](docs/validation.md).

See [contributing](CONTRIBUTING.md), [troubleshooting](docs/troubleshooting.md), [release procedure](docs/releasing.md), and [fixture demonstration](docs/demo.md).
