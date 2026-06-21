# Setup

`chrome-devtools-mcp` is published on npm and run via `npx`. It needs **Node.js
LTS** and a current **stable Chrome** (or newer). The browser is downloaded/located
automatically; use `--channel` or `--executable-path` to override.

## MCP client configuration

The config is the same shape everywhere — a `chrome-devtools` server running the
npm package. Pinning `@latest` keeps the client on the newest server.

### Cursor

`Cursor Settings → MCP → New MCP Server`, or edit `.cursor/mcp.json` in the project
(or `~/.cursor/mcp.json` for all projects):

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

If the project already has an `mcp.json`, add `chrome-devtools` alongside existing
servers under `mcpServers` rather than overwriting the file. Reload MCP servers
after editing.

### Claude Code

```bash
claude mcp add chrome-devtools --scope user npx chrome-devtools-mcp@latest
```

### Codex / generic MCP clients

Use the same `command`/`args` JSON in the client's MCP server list.

## First-run check

Ask the agent to "check the performance of https://developers.chrome.com". The
client should launch Chrome and record a trace. The browser only starts once a tool
needs a page; merely connecting to the server does not start Chrome.

## Basic vs full tool set

```json
"args": ["-y", "chrome-devtools-mcp@latest", "--slim", "--headless"]
```

`--slim` exposes a reduced tool set for simple browsing/automation. Drop it for the
full surface (performance, memory, extensions, etc.).

## CLI flags

| Flag | Purpose |
| --- | --- |
| `--headless` | Run Chrome with no UI (CI, servers). Default visible. |
| `--isolated` | Temporary user-data-dir, auto-cleaned on close — clean state per run. |
| `--user-data-dir <path>` | Persistent profile dir (default under `~/.cache/chrome-devtools-mcp`). |
| `--channel <stable\|beta\|dev\|canary>` | Pick a Chrome channel. |
| `--executable-path <path>` | Use a custom Chrome binary. |
| `--browser-url <http://127.0.0.1:9222>` (`-u`) | Attach to a running, debuggable Chrome. |
| `--ws-endpoint <ws://…>` (`-w`) | Attach via WebSocket; `--ws-headers '{"Authorization":"Bearer …"}'` for auth. |
| `--auto-connect` | Auto-connect to a local Chrome 144+ started with remote debugging. |
| `--viewport <1280x720>` | Initial viewport (headless max 3840x2160). |
| `--proxy-server <url>` | Route Chrome through a proxy. |
| `--accept-insecure-certs` | Ignore self-signed/expired TLS errors (use with caution). |
| `--log-file <path>` | Write debug logs (set `DEBUG=*` for verbose) — useful for bug reports. |
| `--no-usage-statistics` | Opt out of Google usage telemetry. |
| `--no-performance-crux` | Don't send trace URLs to the CrUX field-data API. |

## Attaching to an existing Chrome

Start Chrome with remote debugging, then point the server at it:

```bash
chrome --remote-debugging-port=9222
```

```json
"args": ["-y", "chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"]
```

This reuses the running browser (and its logged-in session) instead of launching a
fresh instance — handy for debugging an already-open page or an editor's built-in
browser. With `--browser-url`/`--ws-endpoint` the server will **not** launch or
close Chrome for you.

## Privacy & telemetry

The MCP exposes whatever the browser can see to the client. Avoid sensitive
sessions. Telemetry is on by default; disable with `--no-usage-statistics` (also off
when `CI` or `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS` is set). Disable update
checks with `CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS`.
