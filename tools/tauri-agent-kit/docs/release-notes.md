# tauri-agent-kit 0.1.0-alpha.1

First public alpha candidate: independent, unofficial MCP automation and diagnostics for Tauri 2.11.5 development builds on Windows x64.

- Authenticated local named pipes; no public debugging port.
- Exact instance and WebView identity, snapshots, native viewport screenshots and zoom.
- WebView actions and explicitly requested native Windows input.
- Bounded Rust/console metadata and optional payload-free IPC instrumentation.

Requires WebView2 and Node 22+. Advanced tools are opt-in in both processes. Native input depends on foreground state; an acknowledgement is not a verified effect. Other operating systems and Tauri versions are not supported by this alpha. No production/release bridge is enabled.

See the README for installation and the generic fixture demonstration. APIs may change before 1.0.
