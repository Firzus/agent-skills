# Automated Tauri Debugging

Climb the **evidence ladder** for repeatable desktop investigation: process and
dev-server logs first, then WebView DevTools, then Playwright CLI on a CDP
endpoint (Windows/WebView2), then fallback instrumentation. Tauri has no
portable CDP guarantee across platforms.

Read this file before launching a debug session.

## Debug Strategy

Start every Tauri desktop investigation on the lowest rung that already exposes
evidence, then climb only when the platform and launch command make the next
rung observable.

1. Capture the Tauri process stdout/stderr and frontend dev server output.
2. Open WebView DevTools when the debug build exposes them.
3. On Windows, when automated webview inspection is useful, relaunch with CDP
   and attach **Playwright CLI** to the Tauri WebView (not a separate Chrome tab).
4. If attach fails, continue with logs, debug-only commands, OS/DevTools
   screenshots, and event traces.

## Platform Matrix

| Platform | Webview | Best first evidence | Automation notes |
| --- | --- | --- | --- |
| Windows | WebView2 | stdout/stderr, WebView DevTools, plugin logs | CDP via `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, then attach with the `playwright-cli` skill. |
| macOS | WKWebView | stdout/stderr, Safari/WebKit inspection, plugin logs | CDP unreliable. Prefer DevTools and instrumentation. |
| Linux | WebKitGTK | stdout/stderr, WebKit inspector when enabled, plugin logs | CDP is not a portable path. Use logs and app instrumentation. |

## Baseline Capture

1. Read `src-tauri/tauri.conf.json`:
   - `build.beforeDevCommand`
   - `build.devUrl`
   - `app.windows[*].label`
   - `app.security.capabilities`
2. Read lockfiles, `package.json`, `src-tauri/tauri.conf.json`, and local docs
   to identify the launch command the project already uses.
3. Check whether `build.devUrl` is already occupied before launching:

```bash
python skills/tauri/scripts/check-dev-url.py http://localhost:3000
```

From another repository, run the script by absolute path and replace the URL with
the project's configured `build.devUrl`.

4. Start the app through that existing launch command.
5. Capture stdout/stderr from the Tauri process. In dev, this usually includes
   Rust `println!`, `log` output, plugin logs, frontend build output, and panic
   messages.
6. If `tauri-plugin-log` is installed, inspect its targets in `lib.rs`. Common
   targets are stdout, webview, and a folder under the app data directory.

## DevTools

In development builds, first try normal WebView DevTools:

- Windows/Linux: `Ctrl+Shift+I` or context menu when enabled.
- macOS: `Cmd+Option+I` when the webview allows inspection.
- Code path: check for `window.open_devtools()` or `WebviewWindow::open_devtools`
  in debug-only setup if the project already uses it.

If the app disables browser accelerator keys, check whether debug builds keep
DevTools allowed. For example, apps using `tauri-plugin-prevent-default` may
need to exclude `DEV_TOOLS` from blocked flags during `debug_assertions`.

## Playwright CLI On The Tauri Shell (Windows)

Install, sessions, and the command surface belong to the `playwright-cli`
skill — this file only covers the Tauri seam: exposing CDP and proving the
attach reached the real shell.

Relaunch the project's existing Tauri command with WebView2 remote debugging:

```bash
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222" <existing-launch-command>
```

Then attach to the CDP endpoint (`http://127.0.0.1:9222`) and drive the
session with the `playwright-cli` skill.

Claim shell automation only when attach succeeds and the page URL/title match
the desktop app (`build.devUrl` and the window title). A Chrome tab opened at
`build.devUrl` is frontend-only: it has no Tauri IPC bridge.

If attach fails, optionally run `scripts/probe-cdp.py` to separate "no CDP
endpoint" from "CLI cannot attach". Then fall back to instrumentation below.

### IPC Proof

A DOM change alone is not proof that Rust ran. Prefer, in order:

1. Trigger UI that calls IPC, then correlate stdout / `tauri-plugin-log`.
2. Evaluate a read-only invoke from the page via the public bridge when
   exposed, e.g.
   `window.__TAURI__.core.invoke('…')` (or the project's typed bindings if
   reachable from the page).
3. Only if the public bridge is unavailable, use
   `window.__TAURI_INTERNALS__.invoke('…')` for a safe read-only command from
   the project, and treat that as an agent probe — not app code to ship.
4. If invoke from the page is blocked, add a `#[cfg(debug_assertions)]` debug
   command.

Assert the returned value is a real Rust-side result (path, list, typed
payload), not only a changed DOM property. The same rule binds UI interaction
through the attached session: verify with visible UI, logs, or an invoke
result — not a DOM property alone.

## Frontend-Only Checks

For UI that does not need IPC, reproduce `build.devUrl` in a normal browser
(the `playwright-cli` skill or Chrome DevTools), then confirm the same path in
the Tauri shell with logs or a shell attach session.

## Fallback Instrumentation

When CDP / Playwright CLI attach is unavailable:

- Use `tauri-plugin-log` targets (stdout, webview, file). Keep ad hoc agent logs
  under `.cursor/`.
- Forward critical frontend events through a debug-only command or the logging
  plugin.
- Add debug-only commands behind `#[cfg(debug_assertions)]` for state, routes,
  feature flags, and paths; register them in the same gated handler context.
- Emit structured events for long-running work.
- Prefer OS or DevTools screenshots when visual state matters but shell CDP is
  down.

Example debug-only command:

```rust
#[cfg(debug_assertions)]
#[tauri::command]
fn debug_snapshot(state: tauri::State<'_, AppState>) -> Result<DebugSnapshot, AppError> {
    Ok(state.snapshot())
}
```

## Failure Playbooks

### White Screen

1. Confirm `build.beforeDevCommand` actually starts the frontend server.
2. Confirm `build.devUrl` matches the server port and protocol.
3. Open the same URL in a normal browser and inspect console/network errors.
4. Check Tauri stdout/stderr for CSP, asset, panic, or plugin permission errors.
5. For production builds, confirm `build.frontendDist` exists after the frontend
   build.

### Dev Server Already Running

1. Treat an occupied `build.devUrl` as a stale-process check, not an app defect.
2. Identify the owning process and command line before killing anything.
3. Stop only processes that clearly belong to the current app or a stale debug
   session.
4. Retry the normal launch command and confirm the frontend server and Tauri
   process both start.
5. Watch for partial launches: some failures in `beforeDevCommand` can still
   leave the desktop executable running and must be cleaned up.

### Command Not Found

1. Confirm the frontend invoke name matches the Rust command name.
2. Confirm the command is included in `tauri::generate_handler![...]`.
3. If the project uses `tauri-specta` or another wrapper, verify the wrapper
   generated and installed the invoke handler.

### Permission Denied

1. Confirm the Rust plugin is registered in `lib.rs`.
2. Confirm the capability contains the exact plugin permission.
3. Confirm the capability identifier is listed in `tauri.conf.json`.
4. Confirm the capability `windows` list includes the active window label.

### DevTools Or CDP Unavailable

1. Treat this as an evidence limitation, not a blocker.
2. Use stdout/stderr, `tauri-plugin-log`, debug-only commands, screenshots, and
   frontend reproduction at `build.devUrl`.
3. State that shell CDP was attempted only if a Playwright CLI attach was run
   (or `probe-cdp.py` / an HTTP `/json/list` result was observed).

## Cleanup

Before ending the task:

- Detach any attached Playwright CLI session — detach leaves the app running.
- Stop frontend dev servers, `tauri dev`, watchers, and any spawned app
  executable — including orphans after partial launch failures.
- Remove temporary `.cursor/` screenshots and Playwright CLI session artifacts
  when they are no longer useful.
- State which evidence source was used: Tauri stdout, frontend logs, plugin log
  files, DevTools, Playwright CLI on shell CDP, or fallback instrumentation.
