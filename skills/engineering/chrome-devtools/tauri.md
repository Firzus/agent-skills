# Debugging a Tauri app (Windows)

On Windows a Tauri app renders its frontend in WebView2, a Chromium engine
that speaks the same Chrome DevTools Protocol as Chrome — so this server
debugs the app's webview directly.

1. Expose the CDP port before the app starts. Quickest, no code change:

   ```powershell
   $env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222"
   pnpm tauri dev
   ```

   For daily use, set it in Rust instead, gated to debug builds, at the top
   of `run()` in `src-tauri/src/lib.rs`:

   ```rust
   #[cfg(all(debug_assertions, target_os = "windows"))]
   std::env::set_var(
       "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
       "--remote-debugging-port=9222",
   );
   ```

   Avoid `additionalBrowserArgs` in `tauri.conf.json`: it replaces Tauri's
   default WebView2 arguments instead of appending to them.

2. Verify while the app runs: `curl http://127.0.0.1:9222/json/version`
   answers, and `/json/list` lists the app window as a `page` target.

3. Attach by adding `--browserUrl=http://127.0.0.1:9222` to the server args
   in the client config from `SKILL.md`. `--autoConnect` is not available —
   WebView2 lacks the Chrome 144+ permission handshake it relies on.

Once attached, the core loop works unchanged: `list_pages` selects the app
webview, then snapshot → act → re-snapshot. `evaluate_script` sees the
Tauri context (`window.__TAURI_INTERNALS__`).

Scope and limits:

- **Webview only.** Console, DOM, network, screenshots — the frontend side.
  The Rust backend (`invoke` command handlers) is out of reach; debug it
  with logs or a native debugger.
- **Windows only.** macOS (WKWebView) and Linux (webkit2gtk) expose no CDP
  endpoint; use the platform inspector or WebDriver there.
- **Skip browser-shaped tools.** `new_page`, `emulate`, and performance
  tracing assume a real browser and may misbehave against a single-window
  webview. Stick to `list_pages` + `select_page`, snapshots, input,
  console, and network.
- **Parallel instances** share the WebView2 profile and collide; point each
  at its own `WEBVIEW2_USER_DATA_FOLDER`.
