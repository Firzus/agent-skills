---
name: chrome-devtools
description: >-
  Drive a real Chrome browser from your agent via the chrome-devtools-mcp server
  (Chrome DevTools + Puppeteer over MCP) to debug, test, and profile web apps.
  Covers setup for Cursor/Claude/Codex, the snapshot-first interaction loop, DOM
  automation (click, fill, fill_form, hover, drag, upload, press_key), navigation
  and multi-tab control, console and network inspection, JS evaluation, dialogs,
  device/network/CPU emulation, screenshots, Lighthouse audits, performance traces
  (Core Web Vitals: LCP, INP, CLS) and heap snapshots. Use when the user wants to
  open/navigate a site, reproduce or debug a frontend bug, read console errors or
  failed network requests, fill or submit a form, take a screenshot, run a
  Lighthouse audit, measure page-load performance, or verify a running dev server
  in a real browser.
---

# Chrome DevTools (MCP)

Use this skill to drive a live Chrome instance through the `chrome-devtools-mcp`
server for **debugging**, **end-to-end testing**, and **performance profiling** of
web apps. It wraps Puppeteer + the Chrome DevTools Protocol behind MCP tools.

The browser starts **lazily**: it launches on the first tool call that needs a
page (e.g. `navigate_page`), not when the server connects.

## Setup

Add the server to the MCP client config, then reload it. See [setup.md](./setup.md)
for per-client instructions (Cursor, Claude Code, Codex) and all CLI flags.

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

Requires Node.js LTS and a current stable Chrome. Add `"--headless"` for CI /
no-UI runs, `"--isolated"` for a throwaway profile, `"--channel=canary"` to pick a
Chrome channel, or `"--browser-url=http://127.0.0.1:9222"` to attach to a running
Chrome. Use `"--slim"` to expose a smaller tool set for basic tasks.

## The core loop: snapshot first

Interactions target elements by a `uid` taken from a **text snapshot** of the
accessibility tree — not by CSS selectors or screenshots.

1. `navigate_page` to the URL (or `new_page` for a fresh tab).
2. `take_snapshot` → returns elements with stable `uid`s. **Prefer this over
   `take_screenshot`** for acting on the page.
3. Act with a `uid` (`click`, `fill`, `hover`, …). Re-snapshot after the DOM
   changes — old `uid`s go stale. Pass `includeSnapshot: true` to fold the new
   snapshot into the action's response and save a round-trip.
4. `wait_for` text when content loads asynchronously.

Take a `take_screenshot` only when the user needs a **visual** check; use snapshots
for everything structural.

## What to reach for

| Goal | Tools | Reference |
| --- | --- | --- |
| Inspect / act on the DOM | `take_snapshot`, `click`, `fill`, `fill_form`, `hover`, `drag`, `upload_file`, `press_key`, `type_text` | [tools.md](./tools.md) |
| Navigate & manage tabs | `navigate_page`, `new_page`, `list_pages`, `select_page`, `close_page`, `wait_for` | [tools.md](./tools.md) |
| Debug a frontend bug | `list_console_messages`, `get_console_message`, `evaluate_script`, `take_screenshot`, `handle_dialog` | [debugging.md](./debugging.md) |
| Inspect network | `list_network_requests`, `get_network_request` | [debugging.md](./debugging.md) |
| Emulate device / conditions | `emulate`, `resize_page` | [debugging.md](./debugging.md) |
| Audit quality | `lighthouse_audit` (a11y, SEO, best practices) | [performance.md](./performance.md) |
| Measure load performance | `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight` | [performance.md](./performance.md) |
| Hunt memory leaks | `take_heapsnapshot` | [performance.md](./performance.md) |

## Rules of thumb

- **Reproduce before fixing.** Navigate, drive the page to the failing state, then
  read `list_console_messages` and `list_network_requests` to capture evidence.
- **Verify dev servers in a real browser.** Confirm SSR/CSR output, hydration, and
  console cleanliness rather than trusting `curl` alone.
- **Use `fill_form` for forms** — one call beats many `fill`/`click` calls.
- **Don't leak secrets.** The MCP exposes whatever is in the browser; avoid logging
  into real accounts or pasting credentials. Use `--isolated` for clean state.
- **Page-scoped tools act on the selected page.** Use `select_page` when juggling
  multiple tabs.

## References

- [setup.md](./setup.md) — install per MCP client, CLI flags, attaching to an existing Chrome, headless/CI.
- [tools.md](./tools.md) — full tool reference grouped by category, with arguments.
- [debugging.md](./debugging.md) — console, network, evaluate, dialogs, forms, emulation recipes.
- [performance.md](./performance.md) — Lighthouse, performance traces, Core Web Vitals, heap snapshots.
