# Command index

Verified against `chrome-devtools-mcp` 1.12.0 (`chrome-devtools --help` and
`<tool> --help`, 2026-10-22). Adapted from the upstream `chrome-devtools-cli` skill;
see [NOTICE](../NOTICE). When the installed version differs, its `--help` output is
authoritative.

Signatures show required positionals in `<>`; flags are optional. `<pageId>` comes
from `list_pages` or from the `new_page` result. Every tool accepts
`--output-format=json`.

## Navigation and pages

| Command | Notes |
| --- | --- |
| `list_pages` | Pages and extension service workers; `[selected]` marks the current page |
| `new_page <url>` | `--background true`, `--isolatedContext <name>` (separate cookies and storage), `--timeout <ms>` |
| `navigate_page <pageId>` | `--url <url>`, or `--type back\|forward\|reload`; `--ignoreCache true`, `--initScript <js>`, `--handleBeforeUnload accept\|dismiss`, `--timeout <ms>` |
| `select_page <pageId>` | `--bringToFront true` |
| `close_page <pageId>` | The last open page cannot be closed |
| `resize_page <pageId> <width> <height>` | Resizes the window |

## Input (uids from `take_snapshot`)

| Command | Notes |
| --- | --- |
| `click <pageId> <uid>` | `--dblClick true`, `--includeSnapshot true` |
| `fill <pageId> <uid> <value>` | Inputs, text areas, `<select>`; `"true"`/`"false"` for checkboxes |
| `type_text <pageId> <text>` | Types into the focused element; `--submitKey Enter` |
| `press_key <pageId> <key>` | `Enter`, `Tab`, `Shift+Tab`, `Control+A`; `--includeSnapshot true` |
| `hover <pageId> <uid>` | `--includeSnapshot true` |
| `drag <pageId> <from_uid> <to_uid>` | `--includeSnapshot true` |
| `upload_file <pageId> <uid> <filePaths..>` | Paths must be inside `--workspace` when set |
| `handle_dialog <pageId> accept\|dismiss` | `--promptText <text>` |
| `click_at <pageId> <x> <y>` | Requires `start --experimentalVision` |

## Inspection

| Command | Notes |
| --- | --- |
| `take_snapshot <pageId>` | Accessibility tree with uids; `--verbose true`, `--filePath <abs>` |
| `take_screenshot <pageId>` | `--filePath <abs>`, `--fullPage true`, `--uid <uid>`, `--format png\|jpeg\|webp`, `--quality <0-100>` |
| `evaluate_script [function] --pageId <id>` | Returns JSON; `--args <uid>...` passes elements; `--sourcePath <file>` instead of inline code; `--format script` for classic scripts without args; `--filePath <abs>` saves the output |
| `get_css_styles <pageId> <uid>` | Matched rules in cascade order; `--pageSize`, `--pageIdx` |
| `list_console_messages <pageId>` | `--types error\|warn\|log\|info\|issue ...`, `--includePreservedMessages true`, `--includeStackTraces true`, `--pageSize`, `--pageIdx` |
| `get_console_message <pageId> <msgid>` | Full message |
| `screencast_start <pageId>` / `screencast_stop <pageId>` | `--filePath <abs>.mp4` on start |

## Network

| Command | Notes |
| --- | --- |
| `list_network_requests <pageId>` | `--resourceTypes document\|fetch\|xhr\|image\|font\|script\|stylesheet ...`, `--includePreservedRequests true`, `--pageSize`, `--pageIdx` |
| `get_network_request <pageId>` | `--reqid <n>`; headers including `Cookie` and `Set-Cookie`; `--requestFilePath <abs>` and `--responseFilePath <abs>` save bodies |

## Emulation

| Command | Notes |
| --- | --- |
| `emulate <pageId>` | Replaces all previous settings except `--extraHttpHeaders`. Flags: `--networkConditions "Offline"\|"Slow 3G"\|"Fast 3G"\|"Slow 4G"\|"Fast 4G"`, `--cpuThrottlingRate <n>`, `--viewport <w>x<h>x<dpr>[,mobile][,touch][,landscape]`, `--userAgent`, `--geolocation <lat>,<lon>`, `--colorScheme dark\|light\|auto`, `--forcedColors`, `--prefersContrast`, `--prefersReducedMotion`, `--extraHttpHeaders <json>` (empty string clears) |

## Performance and audits

| Command | Notes |
| --- | --- |
| `performance_start_trace <pageId>` | Navigate first. `--reload` and `--autoStop` default to true; `--ignoreCache true` for a cold load; `--filePath <abs>.json.gz` |
| `performance_stop_trace <pageId>` | Stops a trace started with `--autoStop false`; `--filePath <abs>` |
| `performance_analyze_insight <pageId> <insightSetId> <insightName>` | Ids and names come from the trace summary |
| `lighthouse_audit <pageId>` | Accessibility, SEO, best practices, agentic browsing (not performance). `--mode navigation\|snapshot`, `--device desktop\|mobile`, `--outputDirPath <abs>` |

## Memory

Enabled by default; `start --memoryDebugging=false` removes the analysis tools.

| Command | Notes |
| --- | --- |
| `take_heapsnapshot <pageId> <filePath>` | Writes a `.heapsnapshot` file |
| `get_heapsnapshot_summary <filePath>` | Totals and native contexts |
| `compare_heapsnapshots <baseFilePath> <currentFilePath>` | Summary diff; `--classIndex <n>` for one class |
| `get_heapsnapshot_details <filePath>` | Per-class aggregates with class ids; `--filterName objectsRetainedByDetachedDomNodes\|objectsRetainedByEventHandlers\|objectsRetainedByContexts\|objectsRetainedByConsole\|...` |
| `get_heapsnapshot_class_nodes <filePath> <id>` | Instances of a class; same `--filterName` |
| `query_heapsnapshot_objects <filePath>` | `--className`, `--isDetached true`, `--retainedSize 1MB-`, `--sortBy` |
| `analyze_heapsnapshot_contexts <filePath>` | Closure contexts holding dead captured values |
| `get_heapsnapshot_retainers`, `get_heapsnapshot_retaining_paths`, `get_heapsnapshot_dominators`, `get_heapsnapshot_edges`, `get_heapsnapshot_object_details` | `<filePath> <nodeId>` |
| `get_heapsnapshot_duplicate_strings <filePath>` | Repeated strings |
| `close_heapsnapshot <filePath>` | Releases a loaded snapshot |

## Extensions, PWA, experimental

| Command | Requirement |
| --- | --- |
| `list_extensions`, `install_extension <path>`, `uninstall_extension <id>`, `reload_extension <id>`, `trigger_extension_action <id>` | On by default when the CLI launches Chrome; `start --categoryExtensions` in connected modes |
| `evaluate_script <function> --serviceWorkerId <sw-id>` | Runs in an extension service worker listed by `list_pages`; no `--pageId` or `--args` |
| `install_pwa`, `launch_pwa`, `uninstall_pwa`, `get_os_app_state` | `start --categoryPwa`; launch modes only |
| `list_webmcp_tools`, `execute_webmcp_tool` | `start --categoryExperimentalWebmcp`; Chrome 150+ with `--enable-features=WebMCP` |
| `list_3p_developer_tools`, `execute_3p_developer_tool` | `start --categoryExperimentalThirdParty` |

## Daemon

| Command | Notes |
| --- | --- |
| `start [options]` | Starts or restarts; `chrome-devtools start --help` lists every option |
| `status` | Running state, `version=`, `args=`, and a warning when the daemon version differs from the CLI |
| `stop` | Closes a launched browser, or disconnects from a connected one |

Other `start` options: `--channel canary|dev|beta|stable`, `--executablePath`,
`--proxyServer`, `--chromeArg` (repeatable), `--blockedUrlPattern` and
`--allowedUrlPattern` (network restrictions), `--screenshotFormat`,
`--screenshotMaxWidth`, `--maxNavigationSaved <1-25>`, `--javascriptEvaluation=false`,
`--fileNavigations=false`, `--logFile <abs>`, `--config <file>`.
