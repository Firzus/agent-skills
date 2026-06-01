# Automated Tauri Debugging

Use this workflow when a Tauri desktop app needs repeatable investigation. The
goal is to gather frontend, Rust, and webview evidence without pretending Tauri
has portable CDP guarantees across platforms.

## Debug Strategy

Start every Tauri desktop investigation by collecting evidence the app exposes
by default, then add automation only when the platform and launch command make
it observable.

1. Capture the Tauri process stdout/stderr and frontend dev server output.
2. Open WebView DevTools when the debug build exposes them.
3. If automated webview inspection is needed, enable a platform-specific inspect
   path and probe for a CDP endpoint.
4. If the probe does not find a page target, continue with logs, debug-only
   commands, screenshots, and event traces.

## Platform Matrix

| Platform | Webview | Best first evidence | Automation notes |
| --- | --- | --- | --- |
| Windows | WebView2 | stdout/stderr, WebView DevTools, plugin logs | CDP may work with `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`, but only after probing. |
| macOS | WKWebView | stdout/stderr, Safari/WebKit inspection, plugin logs | Do not assume CDP. Prefer DevTools and instrumentation. |
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

4. Start the app through that existing launch command. Do not introduce or prefer
   a package manager that the project does not already use.

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

## Automation Workflow

1. Start with the normal project command and capture logs. Do not change the
   launch path until the baseline failure is visible.
2. If `beforeDevCommand` fails because `build.devUrl` is already in use, stop the
   stale dev server or choose the project's supported alternate port before
   retrying.
3. If the issue is frontend-only, reproduce `build.devUrl` in a normal browser
   with Playwright or Chrome DevTools, then compare against the Tauri shell.
4. On Windows/WebView2, relaunch with CDP arguments only when automated webview
   inspection is useful.
5. Probe the endpoint with `scripts/probe-cdp.py`. A non-zero exit code means
   no page target was found; continue with instrumentation instead of retrying
   blindly.
6. When CDP works, use a CDP-capable tool to collect console errors, network
   failures, screenshots, and DOM state.
7. Save ad hoc debug logs under `.cursor/` and remove temporary artifacts when
   they are no longer useful.

## Optional CDP Probe

Use a CDP probe only when the app or platform has been configured for it. Do not
claim browser automation support unless these checks pass.

On Windows WebView2, set the additional browser arguments before launching the
Tauri process:

```bash
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS="--remote-debugging-port=9222" <existing-launch-command>
```

Replace `<existing-launch-command>` with the exact launch command already used by
the project.

Probe common ports without assuming success:

```bash
python skills/tauri/scripts/probe-cdp.py
```

From another repository, run the script by absolute path or copy the command
logic into a project-local debug helper.

If a page target appears, connect with a CDP-capable tool such as Chrome
DevTools MCP, Playwright's `connectOverCDP`, or another local browser
automation bridge. If no endpoint appears, use the fallback instrumentation
below.

A verified WebView2 response looks like a browser target plus a page target:

```text
/json/version -> Browser: Edg/...
/json/list -> title: <app window title>, url: http://localhost:<dev-port>/
```

## Fallback Instrumentation

When CDP is not available, make the app observable:

- Add or use existing `tauri-plugin-log` targets for stdout, webview, and file
  logs. Keep debug log artifacts under the project's `.cursor/` directory when
  creating ad hoc logs during agent work.
- Forward critical frontend events to Rust through a debug-only command or
  existing logging plugin.
- Add debug-only commands behind `#[cfg(debug_assertions)]` for deterministic
  inspection of state, routes, feature flags, and filesystem paths.
- Emit structured events for long-running tasks and capture them from frontend
  logs.
- Prefer screenshots from the OS or webview DevTools when visual state matters.
- For frontend-only issues, reproduce first at `build.devUrl` in a normal browser
  with Playwright or Chrome DevTools, then verify the same behavior in the
  Tauri shell with logs.

Example debug-only command:

```rust
#[cfg(debug_assertions)]
#[tauri::command]
fn debug_snapshot(state: tauri::State<'_, AppState>) -> Result<DebugSnapshot, AppError> {
    Ok(state.snapshot())
}
```

Remember to register debug-only commands in the same gated context as the
command definition, or through the project's invoke-handler abstraction.

## Windows WebView2 Notes

On Windows, Tauri uses WebView2. Useful evidence usually comes from:

- Tauri process stdout/stderr.
- `tauri-plugin-log` folder targets under the app local data directory.
- Manual WebView DevTools in debug builds.
- The frontend dev server opened separately in Chrome or Edge.

Remote debugging may require WebView2-specific runtime options or app code. Do
not assume Chromium flags are applied unless the CDP probe verifies a target.

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
3. State that CDP was attempted only if a probe command or HTTP endpoint result
   was actually observed.

## Cleanup

Before ending the task:

- Stop frontend dev servers, `tauri dev`, watchers, and any spawned app process.
- If launch failed partway through, check for orphaned desktop executables and
  dev servers before retrying.
- Preserve useful logs only when they help the investigation.
- State which evidence source was used: Tauri stdout, frontend logs, plugin log
  files, DevTools, CDP endpoint, or fallback instrumentation.
