# Troubleshooting

| Symptom                            | Check                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| No instances                       | Start the target in debug mode with the plugin enabled. Both processes must use the same Windows account and `LOCALAPPDATA`.           |
| MCP process cannot start           | Verify Node 22+, package version and Windows command shim handling. Run `--help` outside the MCP client.                               |
| IPC reporting denied               | Grant `agent-kit:allow-record-ipc` to the reporting WebView. Reporting is optional and does not intercept every invoke.                |
| Stale reference                    | Take a new snapshot. Do not reuse references after a snapshot, navigation or relevant element changes.                                 |
| Native action rejected             | Reserve the desktop; focus the intended window. Check occlusion and process integrity levels. The server never elevates automatically. |
| Rust responds, JavaScript does not | Inspect partial `diagnose` readiness. The page may be blocked; do not automatically retry a write.                                     |
| Screenshot differs from desktop    | CapturePreview returns WebView pixels, not native decorations or the final desktop composition.                                        |
| Tauri dependency conflict          | This alpha pins Rust Tauri 2.11.5. Align the application's Tauri stack or defer integration; other versions are not promised.          |

Default diagnostics omit console arguments and IPC payloads. This is intentional. Advanced tools require explicit enablement in both processes and are privileged operations.
