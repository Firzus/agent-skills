# Security model

## Trust boundary

This is development tooling, not a sandbox. The plugin starts only in debug builds with explicit application enablement. A protected registry under `%LOCALAPPDATA%/tauri-agent-kit/instances` and per-instance named pipes are restricted to the current user SID; remote pipe clients are rejected. Registry directories reject symlinks. The application and MCP server must run as the same Windows user, even when their integrity levels differ.

Each instance gets a random UUID and a separate 256-bit secret container (two UUID v4 values, with 244 random bits). A client challenge is answered with HMAC-SHA256 before the client sends a tool request; the client then proves possession under a distinct role label. Secrets are never sent over the pipe. This authenticates possession of the protected per-instance secret, not arbitrary processes with access to the same user's files. Same-user malicious processes are outside the isolation boundary.

There is no TCP listener and no public CDP endpoint. The plugin calls WebView2 APIs directly. The server is not elevated; no helper or UAC automation is installed. The authenticated manifest identifies the process, but the Node client does not independently query `GetNamedPipeServerProcessId`; cryptographic endpoint authentication is the implemented check.

## Authority

Reads and ordinary UI actions share the authenticated development session. Advanced evaluation and IPC require enablement in both processes. The Rust dispatcher enforces its own advanced gate, regardless of which MCP client is used. Arbitrary JavaScript can access the selected page's allowed IPC and other page privileges. An evaluation tool is not read-only.

`invoke_command` uses the actual frontend IPC path; application command permissions are still enforced by Tauri. IPC reporting is a separate Tauri plugin command requiring `agent-kit:allow-record-ipc`.

Windows input checks the exact owning top-level window, foreground state and hit test. It refuses to type into a different foreground window or click through to another application's window. This cannot eliminate the race with a human or another process changing foreground after the check; reserve the desktop during native tests. WebView mode does not validate Windows click-through behavior.

## Data and resource limits

- Wire frames: 8 MiB maximum, one request per connection, 15-second connection deadline.
- Server deadline: 12 seconds; WebView operation deadline: 5 seconds.
- Native inventory probe: 750 ms; document readiness probe: 500 ms per WebView.
- Records: 1,000 per instance; entries over 8 KiB are replaced with an omission marker; at most 200 per page. Continue with `nextCursor`, not `latestCursor`. Text snapshots: 12,000 characters and 300 controls.
- Screenshot encoded source: at most 5 MiB before base64.
- Password values are redacted in snapshots and password fields cannot be targeted for text entry. Screenshots can contain other sensitive visible data: inspect only approved applications.
- Console arguments, Rust tracing fields, IPC arguments and results are omitted. Explicit Rust log publishers must redact their own data.

Mutating operations are serialized within one instance. A disconnected request waiting for the operation lock is discarded. UI closures check whether their reply receiver has closed before dispatch. Cancellation does not undo native or JavaScript work already dispatched. Observe the state before deciding whether to retry.

No telemetry, shell tool, arbitrary filesystem tool, cookie API or credential store is provided. MCP annotations are informational, not authorization.
