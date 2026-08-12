---
name: chrome-devtools
description: >-
  Drive a live Chrome browser through the chrome-devtools-mcp server. Use
  to debug or automate a web page in a real browser, measure Core Web
  Vitals, attach to a running Chrome, or debug a Tauri app's WebView2 on
  Windows.
---

# chrome-devtools

Official MCP server from the Chrome DevTools team
([ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)):
Puppeteer-driven automation plus DevTools superpowers — performance traces
with insights, network and console inspection, device emulation. Requires
Node LTS (≥20.19) and current stable Chrome. Chrome launches lazily on the
first tool call, never on server connect.

Client config:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

On Windows, wrap in `cmd /c` and raise the startup timeout (Codex `config.toml`):

```toml
[mcp_servers.chrome-devtools]
command = "cmd"
args = ["/c", "npx", "-y", "chrome-devtools-mcp@latest"]
env = { SystemRoot = "C:\\Windows", PROGRAMFILES = "C:\\Program Files" }
startup_timeout_ms = 20_000
```

Full tool list and CLI flags: [`tool-reference.md`](tool-reference.md).

Debugging a Tauri app's WebView2 on Windows: [`tauri.md`](tauri.md).

## The core loop

Element interaction is snapshot-driven: `take_snapshot` returns the
accessibility tree as text where every element carries a `uid`, and input
tools take those uids.

1. `navigate_page` (or `new_page`) to the URL.
2. `take_snapshot` — read the tree, find your uids.
3. Act: `click`, `fill_form`, `hover`, `press_key`, `upload_file`,
   `handle_dialog`. Prefer one `fill_form` call over repeated `fill`/`click`
   on forms.
4. `wait_for(text)` for the expected result, then re-snapshot — uids go
   stale on any page change. Pass `includeSnapshot: true` on an action to get
   the fresh snapshot in the same response.

## Performance tracing

1. Navigate to the page.
2. `performance_start_trace(reload: true, autoStop: true)` — records a trace
   targeting Core Web Vitals (LCP, INP, CLS) and returns summarized insights.
3. `performance_analyze_insight(insightName, insightSetId)` — drill into one
   named insight from the result's "Available insight sets" (e.g.
   `LCPBreakdown`, `DocumentLatency`).

`lighthouse_audit` covers accessibility/SEO/best-practices scores — not
performance; use tracing for that.

## Debugging a page

Reproduce the issue, then triangulate:

- `list_console_messages` / `get_console_message` — errors with
  source-mapped stack traces.
- `list_network_requests` / `get_network_request` — requests since last
  navigation; save large bodies to files via `responseFilePath`.
- `take_screenshot` — page, element (by uid), or `fullPage`.
- `evaluate_script(function)` — arbitrary page state; return value must be
  JSON-serializable.

## Emulation

One `emulate` call bundles colorScheme, CPU throttling, network conditions
(`Offline`…`Fast 4G`), geolocation, userAgent, extra HTTP headers, and a
viewport string `WxHxDPR[,mobile][,touch][,landscape]`. `resize_page` sets an
exact page size.

## Gotchas

- **Privacy**: the server exposes all browser content to the MCP client — use
  a clean profile, never one with sensitive data. Telemetry is on by default
  (`--no-usage-statistics`, `--no-performance-crux` to opt out).
- **Profile lock**: the default user data dir
  (`~/.cache/chrome-devtools-mcp/chrome-profile`) persists across runs and
  admits one browser at a time — pass `--isolated` for parallel or clean
  sessions.
- **Sandboxed clients** (macOS Seatbelt, Linux containers) cannot launch
  Chrome, which needs to create its own sandboxes: start Chrome outside and
  attach with `--browserUrl http://127.0.0.1:9222`. That debug port must use a
  non-default user data dir, and while open it lets any local app control the
  browser. `--autoConnect` (Chrome 144+) is the permission-gated alternative
  that reaches the default profile.
- **`Target closed`** on the first call means Chrome failed to start — stale
  instances holding the profile, or no Chrome installed.
- **File writes** from tools are confined to the OS temp dir unless the
  client negotiates MCP roots or the server runs with
  `--allowUnrestrictedPaths`.
