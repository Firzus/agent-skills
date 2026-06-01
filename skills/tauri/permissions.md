# Tauri v2 Permissions And Capabilities

Tauri v2 uses deny-by-default permissions. A plugin can be present in
`Cargo.toml`, registered in `lib.rs`, and imported in the frontend, yet still
fail at runtime if the matching permission is missing from a capability assigned
to the window.

## Capability Shape

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default desktop permissions",
  "windows": ["main"],
  "permissions": ["core:default"]
}
```

The capability `identifier` must be listed in `tauri.conf.json`:

```json
{
  "app": {
    "security": {
      "capabilities": ["default"]
    }
  }
}
```

## Common Plugin Permissions

Use exact permission names from the plugin docs and generated schemas. Common
defaults include:

- `core:default`
- `fs:default`
- `dialog:default`
- `opener:default`
- `shell:default`
- `http:default`
- `store:default`
- `log:default`
- `process:default`
- `os:default`
- `updater:default`

## Narrow Scopes

Prefer scoped permissions when available:

- Restrict filesystem access to app-owned directories or explicit user-selected
  paths.
- Restrict HTTP access to known hosts when the plugin supports URL scopes.
- Restrict shell/process execution to specific commands and arguments.
- Split sensitive permissions into dedicated capabilities assigned only to the
  windows that need them.

## Diagnosis Checklist

When a frontend plugin call fails:

1. Confirm the JS package is installed and imported from the v2 package path.
2. Confirm the Rust plugin is registered in `lib.rs`.
3. Confirm the capability file contains the plugin permission.
4. Confirm the capability identifier appears in `tauri.conf.json`.
5. Confirm the window label matches the capability `windows` list.
6. Inspect Tauri stdout/stderr and webview console for the permission denial.

## Common Permission Fixes

- File reads or writes fail: add the fs permission and the narrowest supported
  scope for the app-owned directory or user-selected path.
- Opening URLs fails: register the opener plugin and grant `opener:default`.
- Shell commands fail: register the shell plugin, grant shell permissions, and
  allowlist the exact command and arguments instead of broad execution.
- HTTP requests fail: grant the HTTP permission and any supported URL scope.
- Logs do not appear: verify `tauri-plugin-log` registration, `log:default`, and
  the configured targets.

Keep sensitive permissions in separate capabilities when only specific windows
need them.
