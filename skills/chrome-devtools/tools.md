# Tool reference

All tools act on the **currently selected page**. Element-targeting tools need a
`uid` from the most recent `take_snapshot`. Most input/navigation tools accept
`includeSnapshot: true` to return a fresh snapshot in the same response.

## Navigation & pages

| Tool | Key args | Notes |
| --- | --- | --- |
| `navigate_page` | `type` (`url`/`back`/`forward`/`reload`), `url`, `ignoreCache`, `timeout` | Go to a URL or move through history. |
| `new_page` | `url`, `background`, `isolatedContext`, `timeout` | Open a new tab and load a URL. |
| `list_pages` | — | List open tabs with their ids. |
| `select_page` | `pageId`, `bringToFront` | Choose the page for subsequent calls. |
| `close_page` | `pageId` | Close a tab (the last open page can't be closed). |
| `wait_for` | `text`, `timeout` | Block until text appears — use for async content. |

## Snapshots & screenshots

| Tool | Key args | Notes |
| --- | --- | --- |
| `take_snapshot` | `verbose`, `filePath` | Text a11y-tree snapshot with `uid`s. **Prefer over screenshots** for acting. |
| `take_screenshot` | `format`, `quality`, `uid`, `fullPage`, `filePath` | Pixels — for visual checks. `uid` for one element, `fullPage` for the whole page. |

## Input automation

| Tool | Key args | Notes |
| --- | --- | --- |
| `click` | `uid`, `dblClick`, `includeSnapshot` | Click (or double-click) an element. |
| `fill` | `uid`, `value`, `includeSnapshot` | Type into an input/textarea or pick a `<select>` option. |
| `fill_form` | `elements[]`, `includeSnapshot` | Fill many fields (inputs, selects, checkboxes, radios) in one call. **Prefer for forms.** |
| `hover` | `uid`, `includeSnapshot` | Hover to trigger menus/tooltips. |
| `drag` | `from_uid`, `to_uid`, `includeSnapshot` | Drag one element onto another. |
| `upload_file` | `uid`, `filePath`, `includeSnapshot` | Upload through a file input. |
| `press_key` | `key`, `includeSnapshot` | Press a key / combo (shortcuts, navigation keys). |
| `type_text` | `text`, `submitKey` | Type into a previously focused input; optional submit key. |
| `handle_dialog` | `action` (`accept`/`dismiss`), `promptText` | Handle a browser dialog (alert/confirm/prompt). |

## Inspection & scripting

| Tool | Key args | Notes |
| --- | --- | --- |
| `list_console_messages` | `types`, `pageSize`, `pageIdx`, `includePreservedMessages` | All console output since last navigation. |
| `get_console_message` | `msgid` | One message by id (e.g. for a full stack trace). |
| `evaluate_script` | `function`, `args`, `filePath`, `dialogAction` | Run a JS function in the page; returns JSON. |
| `list_network_requests` | `resourceTypes`, `pageSize`, `pageIdx` | All requests since last navigation. |
| `get_network_request` | `reqid`, `requestFilePath`, `responseFilePath` | One request's headers/body (defaults to selected request). |

## Emulation

| Tool | Key args | Notes |
| --- | --- | --- |
| `emulate` | `networkConditions`, `cpuThrottlingRate`, `geolocation`, `userAgent`, `colorScheme`, `viewport`, `extraHttpHeaders` | Throttle network/CPU, fake geo, set dark/light, change UA/viewport. |
| `resize_page` | `width`, `height` | Resize the page window to exact dimensions. |

## Performance & memory

| Tool | Key args | Notes |
| --- | --- | --- |
| `performance_start_trace` | `reload`, `autoStop`, `filePath` | Start a trace; `reload: true` measures cold load. |
| `performance_stop_trace` | `filePath` | Stop and return the trace + insights. |
| `performance_analyze_insight` | `insightSetId`, `insightName` | Drill into a specific insight (e.g. an LCP breakdown). |
| `lighthouse_audit` | `mode`, `device`, `outputDirPath` | Lighthouse for a11y, SEO, best practices (perf via traces). |
| `take_heapsnapshot` | `filePath` | Capture a JS heap snapshot to investigate memory leaks. |

> The MCP also ships optional categories (extensions, third-party dev tools, WebMCP,
> extended memory tools) depending on flags/version. The ones above are the common
> debugging/testing/profiling surface. Check the live tool descriptors if a tool is
> missing.
