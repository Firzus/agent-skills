# Tauri Permissions

Read before integrating a plugin, changing an exposed application operation,
its permissions, a remote origin, or the CSP, or diagnosing a denial.

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

Application commands registered in `invoke_handler` are allowed by default
for the application's windows and WebViews. To restrict access, declare the
affected commands in `AppManifest::commands` and configure the corresponding
permissions. Enforce the scopes defined for those commands in their
implementation.
[Capabilities](https://v2.tauri.app/security/capabilities/)
[Command Scopes](https://v2.tauri.app/security/scope/)

## Make the smallest grant

Grant only the operations needed by the intended windows and WebViews.
Check the union of applicable capabilities and limit accessible paths,
network destinations, and other resources.

Inspect the actual permissions and scopes of the plugins in use.
plugin-http and plugin-fs are appropriate when their grants match the need;
a custom command must enforce its own controls.

Separate privileges for local and remote content. Explicitly allow only
remote origins that need IPC access, with the minimum operations required.
`remote.urls` defines the origins granted a capability; it does not replace
the CSP.
[Using Plugin Permissions](https://v2.tauri.app/learn/security/using-plugin-permissions/)

For agent-kit IPC reporting, use the separate optional instrumentation path in
[Agent kit integration](agent-kit.md#optional-ipc-reporting). It is not a
prerequisite for ordinary MCP inspection.

Done when registration, capability activation, target matching, and operation
scope are confirmed. Verify the authorized operation in the affected target
and, for a changed security boundary, check an intended denied case.
If runtime verification is unavailable, report the configuration findings
separately from the untested permission behavior.

## Content Security Policy

Configure a production CSP limited to the required resources and origins.
Check the effective policy in the release configuration, including
platform-specific overrides.

Treat the WebView CSP, IPC permissions, and network operation scopes
separately. When making a change, verify the allowed path and a
representative denial without broadening the policy to make the test pass.
[CSP](https://v2.tauri.app/security/csp/)
