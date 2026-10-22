---
name: chrome-devtools
description: Debug and automate Google Chrome from the shell with the `chrome-devtools` CLI (npm package `chrome-devtools-mcp`), without configuring an MCP server. Use to inspect a web page's console errors, network requests, cookies and 401/403 failures, performance traces, LCP and Core Web Vitals, Lighthouse scores, accessibility, or memory leaks, and to script page navigation, clicks, form input, emulation, and screenshots. Not for native desktop applications or the host's built-in browser.
---

# Chrome DevTools CLI

Drive Chrome through `chrome-devtools`, a client of a background daemon that keeps
pages, cookies, and state between commands. Inputs: the target URL or page, the
goal (debugging or automation), and the browser mode. Output: findings backed by
evidence (console messages, requests, trace insights) and the paths of the files
produced. Side effects: a daemon and a browser start; files are written only at the
paths you pass.

## 1. Check the CLI

1. Run `chrome-devtools --version`.
2. If the command is missing, report it and propose
   `npm i -g chrome-devtools-mcp@latest`. Install only with the user's approval. An
   "Update available" notice is information, not authorization to update.
3. Run `chrome-devtools status`. A running daemon prints its `version=` and `args=`.
   If a daemon you did not start is running, reuse it when its arguments suit the
   task. Otherwise tell the user before restarting it, since a restart closes its
   pages.

**Done:** the CLI responds and the daemon state is known.
**Blocked:** CLI absent and installation declined; report the blocker and stop.

## 2. Choose the browser mode

The first tool command starts the daemon with default options. Options apply only
when the daemon starts, so run `chrome-devtools start <options>` before the first
tool command whenever you need a non-default mode or option. `start` always
restarts the daemon.

| Mode | Start command | Use when |
| --- | --- | --- |
| Isolated, headless (default) | none, or `chrome-devtools start` | Default for every task. The temporary profile is deleted on `stop`. |
| Visible window | `start --headless=false` | The user wants to watch, or behavior differs in headless mode. |
| Persistent profile | `start --userDataDir=<dir>` | Logins or storage must survive between sessions. |
| User's own Chrome | `start --autoConnect`, or `start --browserUrl=http://127.0.0.1:9222` / `--wsEndpoint=<ws-url>` | Only with the user's explicit approval for this task: it exposes their sessions, cookies, and tabs. |

For the user's own Chrome:

- `--autoConnect` needs Chrome 144+ already running with remote debugging enabled
  in `chrome://inspect/#remote-debugging`. The first command can time out while
  Chrome waits for the user to accept the connection; ask them to accept, then
  retry `list_pages`.
- Page IDs are the user's tabs. Act only on tabs the user designates, or open your
  own with `new_page <url> --background true` and close it when finished. Do not
  repeat other tabs' titles or URLs unless the task requires them.
- Extension tools are off unless you add `--categoryExtensions`; PWA tools
  (`--categoryPwa`) work only in launch modes.

## 3. Set start options

Combine every option the task needs in one `start` call:

| Situation | Option |
| --- | --- |
| Private, internal, or localhost URL | `--performanceCrux=false --usageStatistics=false` (both are on by default; CrUX receives URLs from traces) |
| Output files or uploads | `--workspace=<dir>`, repeatable. Without it, file access is unrestricted; with it, paths outside are rejected with `Access denied`. |
| Shared output where secrets appear in headers | `--redactNetworkHeaders`, unless the task inspects those headers |
| Coordinate clicks (`click_at`) | `--experimentalVision` |
| Self-signed development certificate | `--acceptInsecureCerts` |

```sh
chrome-devtools start --performanceCrux=false --usageStatistics=false --workspace=<abs-output-dir>
```

**Done:** mode and options chosen; after a `start`, `chrome-devtools status` shows
the intended `args=`.

## 4. Act on the page

Syntax: `chrome-devtools <tool> <required positionals> [--optional-flags]`. Most
tools take `<pageId>` first; `evaluate_script` takes the function first and
`--pageId <id>`. `chrome-devtools --help` lists the commands and the start flag each
one requires, and `chrome-devtools <tool> --help` gives its exact arguments. The
installed help wins over any reference.

1. Find the page: `list_pages`, then `navigate_page <pageId> --url <url>` or
   `new_page <url>`.
2. Read it: `take_snapshot <pageId>` returns the accessibility tree with element
   uids. Prefer it to a screenshot for automation.
3. Act on a uid: `click <pageId> <uid>`, `fill <pageId> <uid> <value>`,
   `press_key <pageId> <key>`, `type_text <pageId> <text>`, `hover`, `drag`,
   `upload_file`, `handle_dialog <pageId> accept|dismiss`.
4. Verify the effect: add `--includeSnapshot true` to the action or take a new
   snapshot, then check `list_console_messages <pageId> --types error`,
   `list_network_requests <pageId>`, or `take_screenshot <pageId> --filePath <abs>`.

- Uids belong to a page state. After a navigation or reload, an old uid fails with
  `Element with uid ... no longer exists`; take a new snapshot. Content added by an
  action receives new uids.
- The CLI has no `wait_for`. Repeat `take_snapshot` until the expected element
  appears.
- Console and network lists start at the last navigation. Add
  `--includePreservedMessages true` or `--includePreservedRequests true` to cover the
  last 3 navigations.
- `emulate <pageId>` replaces every previous emulation setting except
  `--extraHttpHeaders`. Pass all settings in one call; `emulate <pageId>` alone
  resets them.
- Use `--output-format=json` when a script or one-liner parses the result.

### Quoting

- Git Bash and POSIX shells: wrap JavaScript in single quotes; double quotes inside
  are preserved: `chrome-devtools evaluate_script '() => document.querySelector("h1").textContent' --pageId 1`.
- PowerShell: double quotes inside an argument are stripped when
  `(Get-Command chrome-devtools).Source` is a `.cmd` shim. In that case, write
  JavaScript with single quotes inside a double-quoted string, escape JSON quotes
  as `\"` (`--extraHttpHeaders '{\"X-Test\": \"1\"}'`), and move code containing
  `$` or backticks to a file.
- In any shell, long or quote-heavy code goes in a file passed with
  `evaluate_script --pageId <id> --sourcePath <abs-file>`.

## 5. Collect evidence

- Pass absolute paths to `--filePath`, `--outputDirPath`, `--responseFilePath`, and
  `take_heapsnapshot`. Write only where the user asked, or in a directory created
  for the task, and list the files produced.
- Send large results (verbose snapshots, traces, Lighthouse reports, heap
  snapshots) to files and extract the relevant part with `node` or `jq` instead of
  reading them whole.
- Cite evidence by its identifier: console `msgid`, request `reqid` with status and
  URL, insight set and insight name with values, file paths. Separate observations
  from inferences, and state the browser mode and options used.
- Do not quote cookie values, tokens, or authorization headers in reports; give
  names and attributes.

## 6. Specialized work

Read the matching reference before starting that work:

| When the task involves | Read | To obtain |
| --- | --- | --- |
| A command not covered above, or an inventory by category | [references/commands.md](references/commands.md) | Command signatures grouped by category, with the start flags they need |
| LCP, Core Web Vitals, slow loads, traces, throttling | [references/performance.md](references/performance.md) | The trace and insight workflow, LCP subparts, and fixes by bottleneck |
| 401/403, login redirects, cookies, headers, consent banners | [references/network-cookies.md](references/network-cookies.md) | Request inspection, HttpOnly handling, clean-context tests, cookie issues |
| Accessibility audit, labels, focus, contrast | [references/accessibility.md](references/accessibility.md) | Lighthouse parsing, snapshot checks, keyboard tests, measurement snippets |
| Memory growth, leaks, heap snapshots | [references/memory.md](references/memory.md) | Snapshot capture, comparison, retainer analysis, common leak causes |
| A failing `start`, `list_pages`, or `new_page`, a hang, or a refused connection | [references/troubleshooting.md](references/troubleshooting.md) | Diagnosis by error message, log capture, recovery steps |

## 7. Finish

1. Close the pages you opened in the user's Chrome and release loaded heap
   snapshots with `close_heapsnapshot <file>`.
2. Run `chrome-devtools stop` if you started or restarted the daemon. In connected
   modes it disconnects without closing the user's Chrome. Leave a daemon you only
   reused running.
3. Report the findings and evidence, the mode and options used, the files produced,
   and what was not verified.

**Done:** requested evidence delivered, files listed, and the daemon in the state
the task found it or stopped.
**Pending:** if a step failed, report the command, its error output, and the next
action instead of claiming the result.
