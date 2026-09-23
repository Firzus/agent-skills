# tauri-plugin-agent-kit

Independent, unofficial MCP diagnostic bridge for Tauri 2.11.5 on Windows x64. MIT licensed; alpha software.

```rust
.plugin(tauri_plugin_agent_kit::init(tauri_plugin_agent_kit::Config {
    enabled: std::env::var_os("TAURI_AGENT_KIT").is_some(),
    advanced: false,
}))
```

Add this call to the application's existing Tauri builder. Start with `TAURI_AGENT_KIT=1` using its normal development command. Release builds never start the bridge. The companion npm package `tauri-agent-kit` connects over authenticated current-user Windows named pipes. No TCP or public CDP listener is opened.

The optional `agent-kit:allow-record-ipc` permission allows explicit frontend instrumentation. The core bridge needs no guest JavaScript initialization. Tauri's unstable child-WebView API is required. Other operating systems are not supported by this release.

[Installation, tools and security](https://github.com/Firzus/agent-skills/tree/main/tools/tauri-agent-kit).
