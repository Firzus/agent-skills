# P3GLEG/tauri-plugin-mcp audit

Source revision: [c7d271a06469bdf4744bfdeadca7458a1f3d02e5](https://github.com/P3GLEG/tauri-plugin-mcp/tree/c7d271a06469bdf4744bfdeadca7458a1f3d02e5). This is a static source audit, not a reproduced runtime comparison. No competitor code was copied.

## Existing capabilities

The competitor already implements 19 tools, a TypeScript stdio server, a Rust transport/plugin, a frontend bridge, DOM references, screenshots, window operations, logs, IPC calls and application helpers. Rust diagnostics are not unique to this project.

Its [server manifest](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/mcp-server-ts/package.json) uses MCP SDK 1.27 and Zod 3; its [Cargo manifest](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/Cargo.toml) requires Tauri 2.11 with `unstable`. The [WebView request bridge](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/tools/webview.rs) correlates requests and registers listeners before emitting events. The application must initialize its guest JavaScript listeners.

## Windows and identity

The [Windows screenshot implementation](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/platform/windows.rs) selects windows by title and uses PrintWindow. This creates an identity risk for duplicate titles and does not establish transparent-Overlay composition correctness. The [Windows input implementation](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/native_input/windows.rs) delegates to a JavaScript fallback; those events are not evidence of native Windows input.

The [client](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/mcp-server-ts/src/tools/client.ts) substitutes a fixed Windows pipe path and derives a token-file path from it, while the [Rust transport](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/socket_server.rs) writes a filesystem sidecar. This appears inconsistent for Windows token autodiscovery and custom instance paths; runtime failure remains unverified.

The [target resolver](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/desktop.rs) can fall back to a configured default. [Inventory](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/tools/app_info.rs) walks WebView windows rather than all child-WebView layouts. Our contract uses explicit instance and WebView labels with no fallback.

## Diagnostics and security

The [IPC implementation](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/tools/manage_ipc.rs) documents that mediated and self-reported calls are captured, not all ordinary frontend invokes. Do not equate a tool history with complete passive IPC instrumentation.

The [log buffer](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/log_buffer.rs) is bounded, supports filtering, and offers explicit Rust publishing. It cannot replace an already-installed global logger. A byte-indexed string truncation appears capable of panicking on a non-UTF-8 boundary; this was not reproduced.

The competitor already has random-token authentication, constant-time verification, Unix 0600 permissions and a release-build guard. Those protections should be credited. Its [configuration](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/src/lib.rs) also permits explicit release enablement and replaces JavaScript dialogues by default. We do not replace dialogues and do not offer release enablement.

## Tests and licensing

The [smoke test](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/mcp-server-ts/test/smoke-test.mjs) checks MCP startup, tools and schemas, not a real Tauri GUI. The inspected [release workflow](https://github.com/P3GLEG/tauri-plugin-mcp/blob/c7d271a06469bdf4744bfdeadca7458a1f3d02e5/.github/workflows/release.yml) is not a multi-platform GUI test matrix.

README/npm metadata declare MIT, but the inspected tree did not contain a LICENSE file and Cargo omitted the license field. Clarify licensing before copying or redistributing substantial code. This project is independently implemented.

## Differentiation

Prioritize exact identity, WebView2-native pixels, explicit input semantics, meaningful partial diagnostics, a real GUI regression fixture and truthful coverage reporting. Do not claim competitor runtime superiority from static findings alone.
