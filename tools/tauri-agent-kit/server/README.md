# tauri-agent-kit

Independent, unofficial MCP diagnostics and automation for Tauri 2 development builds on Windows x64. Requires Node 22+, WebView2, and the companion `tauri-plugin-agent-kit` Rust plugin in the target application. Validated against Tauri 2.11.5 only.

```powershell
npx --yes tauri-agent-kit@0.1.0-alpha.1 --help
```

Without arguments, starts an MCP stdio server. It does not launch or install the target application. Use `--advanced` only for explicitly authorized JavaScript evaluation and IPC; the application must independently enable it.

Snapshots, real WebView pixels, interactions, exact instance targeting and bounded diagnostic metadata. No remote-debugging port, telemetry or automatic elevation. Windows input requires the correct foreground window. Observe the UI after each action.

[Installation and security](https://github.com/Firzus/agent-skills/blob/main/tools/tauri-agent-kit/README.md#integrate-an-application). MIT licensed. Alpha software; not an official Tauri project.
