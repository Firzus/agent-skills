# chrome-devtools-mcp — tools and CLI flags

Reference for the `chrome-devtools-mcp` server (v1.7.x). Source:
[`docs/tool-reference.md`](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md)
and the README's configuration section.

## Default tools

### Input automation (10)

| Tool | Purpose |
| --- | --- |
| `click(uid, dblClick?)` | Click an element from the snapshot. |
| `drag(from_uid, to_uid)` | Drag one element onto another. |
| `fill(uid, value)` | Type into an input/textarea or pick a `<select>` option; `"true"`/`"false"` for checkboxes. |
| `fill_form(elements[])` | Fill many fields in one call — prefer over repeated `fill`. |
| `handle_dialog(action, promptText?)` | Accept or dismiss an open browser dialog. |
| `hover(uid)` | Hover an element. |
| `press_key(key)` | Key or combo, e.g. `"Control+Shift+R"`. |
| `type_text(text, submitKey?)` | Keyboard typing into the focused input. |
| `upload_file(uid, filePaths[])` | Upload through a file input or chooser-opening element. |
| `click_at(x, y)` | Coordinate click; requires `--experimentalVision`. |

### Navigation (6)

| Tool | Purpose |
| --- | --- |
| `list_pages` | List open tabs. |
| `select_page(pageId)` | Switch the active tab. |
| `new_page(url, isolatedContext?)` | Open a tab; `isolatedContext` isolates cookies/storage per named context. |
| `close_page(pageId)` | Close a tab. |
| `navigate_page(type, url?, initScript?, ignoreCache?)` | `url`/`back`/`forward`/`reload`; `initScript` runs before page scripts on next navigation. |
| `wait_for(text[], timeout?)` | Wait until any of the given texts appears. |

### Emulation (2)

| Tool | Purpose |
| --- | --- |
| `emulate(...)` | colorScheme, cpuThrottlingRate, networkConditions (`Offline`…`Fast 4G`), geolocation, userAgent, extraHttpHeaders (JSON string, persists across navigations), viewport `WxHxDPR[,mobile][,touch][,landscape]`. |
| `resize_page(width, height)` | Resize the window so the page has the given size. |

### Performance (3)

| Tool | Purpose |
| --- | --- |
| `performance_start_trace(reload?, autoStop?, filePath?)` | Record a trace targeting Core Web Vitals. Navigate first when using `reload`/`autoStop`. |
| `performance_stop_trace(filePath?)` | Stop recording; optionally save the raw trace (`.json` / `.json.gz`). |
| `performance_analyze_insight(insightName, insightSetId)` | Drill into a named insight (e.g. `LCPBreakdown`, `DocumentLatency`) from the trace result. |

### Network (2)

| Tool | Purpose |
| --- | --- |
| `list_network_requests(resourceTypes?, pageSize?, pageIdx?, includePreservedRequests?)` | Requests since last navigation (preserved = last 3 navigations). |
| `get_network_request(reqid?, requestFilePath?, responseFilePath?)` | Full detail of one request; bodies can be saved to files. |

### Debugging (8)

| Tool | Purpose |
| --- | --- |
| `evaluate_script(function, args?, filePath?, waitForStableDom?)` | Run a JS function in the page; JSON-serializable return only. |
| `list_console_messages(types?, includeStackTraces?)` | Console inspection with source-mapped stack traces. |
| `get_console_message(msgid)` | One console message in full. |
| `take_snapshot(verbose?, filePath?)` | A11y-tree text snapshot with uids — the backbone of element interaction. |
| `take_screenshot(uid?, fullPage?, format?, quality?, filePath?)` | Page or element screenshot; JPEG/WebP are ~3-5x smaller than PNG. |
| `lighthouse_audit(device?, mode?)` | Lighthouse scores for accessibility/SEO/best-practices (not performance). |
| `screencast_start` / `screencast_stop` | Video recording; requires `--experimentalScreencast` + ffmpeg. |

### Opt-in categories

- **Memory** (12 tools, `--memoryDebugging`): `take_heapsnapshot` plus heap
  analysis — `compare_heapsnapshots`, retainers, retaining paths, dominators,
  duplicate strings — for leak hunting.
- **Extensions** (5, `--categoryExtensions`): install/list/reload/trigger/
  uninstall unpacked extensions; pipe connection only before Chrome 149.
- **PWA** (4, `--categoryPwa`): install/launch/uninstall PWAs by manifest ID;
  pipe connection only.
- **WebMCP** (2, `--categoryExperimentalWebmcp`, Chrome 150+ with
  `--enable-features=WebMCP`) and **third-party** (2): execute tools the
  inspected page itself exposes.

## CLI flags

| Flag | Effect |
| --- | --- |
| `--headless` | Run Chrome without UI (default false). |
| `--isolated` | Temporary user-data-dir, cleaned up on browser close. |
| `--channel` | `stable` (default), `beta`, `dev`, `canary`. |
| `--executablePath` / `-e` | Custom Chrome binary. |
| `--userDataDir` | Override the profile dir (default `~/.cache/chrome-devtools-mcp/chrome-profile`). |
| `--browserUrl` / `-u` | Connect to a running debuggable Chrome (e.g. `http://127.0.0.1:9222`) instead of launching. |
| `--wsEndpoint` / `--wsHeaders` | Connect via WebSocket endpoint, optionally with auth headers (JSON). |
| `--autoConnect` | Auto-connect to a local Chrome 144+ that enabled `chrome://inspect/#remote-debugging`. |
| `--viewport` | Initial viewport, e.g. `1280x720` (headless max 3840x2160). |
| `--proxyServer`, `--acceptInsecureCerts` | Network plumbing. |
| `--chromeArg`, `--ignoreDefaultChromeArg` | Extra/removed Chrome launch args (launch mode only). |
| `--blockedUrlPattern`, `--allowedUrlPattern` | Restrict browser network access with URLPattern lists (allow-list needs Chrome 149+). |
| `--slim` | Expose only `navigate`, `evaluate`, `screenshot`. |
| `--experimentalPageIdRouting` | Adds `pageId` to page-scoped tools so concurrent agent sessions can share one server. |
| `--experimentalVision` | Enables coordinate tools (`click_at`). |
| `--experimentalScreencast` / `--experimentalFfmpegPath` | Video recording tools. |
| `--memoryDebugging` | Enables the heap-snapshot tools. |
| `--categoryEmulation/Performance/Network` | Default-on categories; set false to exclude. |
| `--screenshotFormat/Quality/MaxWidth/MaxHeight` | Defaults for `take_screenshot`. |
| `--no-performance-crux` | Stop sending trace URLs to Google's CrUX API for field data. |
| `--no-usage-statistics` | Opt out of Google telemetry (also disabled by `CI` or `CHROME_DEVTOOLS_MCP_NO_USAGE_STATISTICS`). |
| `--logFile` + `DEBUG=*` env | Debug logging. |
| `--allowUnrestrictedPaths` | Lift the temp-dir restriction on file-writing tools when the client negotiates no MCP roots. |
