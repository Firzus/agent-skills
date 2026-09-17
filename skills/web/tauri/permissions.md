# Tauri Permissions

Read before integrating a plugin or diagnosing a denied operation.

## Trace the effective grant

1. Identify the failing operation and whether it is a plugin command or an
   application command. Inspect the existing invoke path and exact error.
2. Check the plugin's Rust dependency and builder registration. Check a
   frontend package only when the integration uses one; Rust-only plugins
   do not inherently require JavaScript packages.
3. Read the active configuration, including platform overrides, and capability
   files. JSON and TOML capabilities are supported. Files in the capabilities
   directory are enabled by default; an explicit configuration list selects
   which capabilities participate.
4. Match the actual window or WebView and platform. Permissions from multiple
   matching capabilities combine.
5. Resolve the exact operation permission and scope from the installed plugin's
   schema and documentation. A plugin's default permission set is not proof
   that a particular operation is allowed.

Application commands registered through the invoke handler are allowed by
default unless the app configures command restrictions through its manifest.
Do not apply plugin permission assumptions to every custom command.
[Capabilities](https://v2.tauri.app/security/capabilities/)

## Make the smallest grant

Grant only the operation required to the intended targets. Scope filesystem
access to the necessary paths, network access to required hosts, and sidecar
execution to the intended executable and arguments, where supported.

Inspect the plugin's actual permission definitions instead of expanding to a
wildcard or assuming `plugin:default` includes the operation. Keep remote
content access explicit; a trusted local frontend and a remote page are
different trust boundaries.
[Using Plugin Permissions](https://v2.tauri.app/learn/security/using-plugin-permissions/)

For agent-kit IPC reporting, use the separate optional instrumentation path in
[Agent kit integration](agent-kit.md#optional-ipc-reporting). It is not a
prerequisite for ordinary MCP inspection.

Done when registration, capability activation, target matching, and operation
scope are confirmed. Verify the authorized operation in the affected target
and, for a changed security boundary, check an intended denied case.
If runtime verification is unavailable, report the configuration findings
separately from the untested permission behavior.
