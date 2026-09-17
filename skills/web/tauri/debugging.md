# Diagnose a Tauri Application

Read before launching or interacting with a runtime session. Prefer
tauri-agent-kit for supported Windows development builds; distinguish
frontend behavior, Rust behavior, and native window behavior.

## Prepare the session

1. Identify the normal launch command, active configuration, expected app
   process, and the symptom to reproduce. Record existing app and dev-server
   processes before starting anything.
2. If a frontend dev URL is configured, check whether it is occupied. The
   [dev URL helper](scripts/check-dev-url.py) accepts that URL as its argument;
   run it by absolute path from another repository. An occupied port alone
   does not establish process ownership or a stale server.
3. Reuse a suitable existing session. If launch or restart is needed, preserve
   the project's launch and elevation rules, capture stdout/stderr, and track
   only the processes started for this task.
4. Discover available MCP tools. For missing tools, compatibility questions,
   or connection failures, read [Agent kit integration](agent-kit.md). If
   unavailable, continue with the fallback below.

Done when the intended process and reproduction are identified and new
processes can be distinguished from pre-existing ones.

## Observe, act, verify

Read the available tool schemas for exact arguments and modes. The
[upstream workflow](https://github.com/Firzus/tauri-agent-kit#workflow) is the
baseline, not a substitute for the installed version's contract.

1. Use `list_instances` to select the process and instance UUID. If several
   candidates remain plausible, resolve their identity before acting.
2. Use `list_targets` to select the required `webviewId` or `windowId`.
   Bind actions to returned identifiers, not titles. Rediscover targets after
   closing or opening windows; a restarted process needs a new instance.
3. Use `diagnose` to distinguish native visibility and Rust responsiveness
   from JavaScript readiness. Partial readiness is evidence, not permission
   to blindly dispatch actions.
4. Take a `snapshot` and choose a current element reference. Define the expected
   result before performing one relevant action.
5. Take a fresh observation and compare it with that expected result. Use a
   `screenshot` when pixels matter and the existing application state or
   logs when the expected result is not visual.

Done when the reproduction has a recorded before/after result on the intended
target, or a specific inspection limitation is recorded.

### Reference and action failures

- A new snapshot invalidates older references. Reobserve after navigation or
  relevant element changes; a stale reference is a request for new evidence,
  not a reason to guess coordinates.
- After timeout or cancellation, an action may already have executed. Observe
  the resulting state before deciding the next step; never automatically
  repeat an uncertain write.
- Text entry and submission are separate actions. Read the tool's text and key
  semantics rather than assuming typing submits a form.
- Use the tool's WebView mode for document interactions. When testing Windows
  input behavior, explicitly select native mode where supported, reserve the
  desktop, and confirm the intended foreground window. On occlusion, focus,
  or integrity rejection, inspect the cause; do not bypass checks or elevate
  automatically. A WebView-mode success does not validate click-through.
  [Native input boundaries](https://github.com/Firzus/tauri-agent-kit/blob/main/docs/security.md)

## Choose evidence that proves the claim

| Evidence | What it establishes | Limit |
| --- | --- | --- |
| Snapshot | Exposed document controls and text | Top-level document coverage; not a complete view of frames or shadow trees. |
| Screenshot | WebView viewport pixels | Not native decorations or final desktop composition. |
| Diagnose | Native and bounded document readiness | Not completion of an application operation. |
| Logs and IPC history | Reported activity and outcomes | Bounded, instrumented metadata; not a full payload trace or command registry. |
| Application result | The requested state transition | Check the actual result, not only that an action was dispatched. |

Use `get_logs` and `get_ipc_calls` to correlate the target and reproduction.
Follow `nextCursor` for further pages, not `latestCursor`. Missing console
values or IPC payloads are intentional; inspect existing redacted app logs
when details are necessary. Read [integration](agent-kit.md) before adding
instrumentation or considering advanced tools.
[Diagnostic limits](https://github.com/Firzus/tauri-agent-kit/blob/main/docs/security.md)

## Without agent-kit

Offer integration once, then use the evidence already available. On macOS,
Linux, mobile, or release builds, use the project's supported platform tools
rather than claiming MCP support.

- Capture Rust process and frontend server output, plus configured plugin logs.
- Use the platform WebView inspector or existing app instrumentation.
- Reproduce frontend-only behavior in a normal browser if useful. That browser
  lacks the real Tauri IPC environment; keep its conclusions frontend-only.
- For native composition or input behavior, use approved OS inspection or
  request a manual check when the available tools cannot observe it.

Add debug-only instrumentation only when necessary and authorized. Keep it
scoped to the question, redact sensitive values, and do not expose production
diagnostic commands just to work around missing tools.

## Symptom routing

| Symptom | Next evidence |
| --- | --- |
| Blank screen | Frontend server output, configured dev URL or built assets, CSP errors, then document readiness. |
| Command not found | Frontend name and casing, generated bindings, existing invoke handler registration. |
| Permission denied | [Effective capability and operation scope](permissions.md). |
| Rust responds but JavaScript does not | Partial readiness, frontend errors, blocked work; no repeated writes. |
| No MCP instance | [Connection prerequisites](agent-kit.md#establish-a-connection). |
| Launch fails on an occupied port | Owning process and command line; do not stop a process based only on the port. |

## Cleanup

Stop only app processes, dev servers, and watchers created for this session,
including identified children left by partial launches. Preserve pre-existing
sessions and restore any temporary environment changes made for this task.

Preview removal of temporary artifacts; remove only task-owned files that are
no longer needed. Retain useful evidence without secrets. Leave stale
manifests belonging to other sessions alone.

Done when task-owned resources are accounted for and the report names the
target, observed result, evidence source, and any remaining uncertainty.
