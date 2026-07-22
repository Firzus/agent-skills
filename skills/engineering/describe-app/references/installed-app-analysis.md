# Installed application analysis

Use this branch to observe a specific build without altering the user's data or
system. Record commands and UI actions as evidence.

## Identify the build

Prefer signed package metadata, executable metadata, and the application's About
surface. Cross-check name, publisher, version, architecture, install source, and
executable path before attributing observations to a repository.

Read-only platform probes include:

### Windows

```powershell
Get-StartApps | Where-Object Name -Match '<app>'
Get-AppxPackage | Where-Object Name -Match '<app>'
(Get-Item '<path-to-executable>').VersionInfo
Get-AuthenticodeSignature '<path-to-executable>'
```

Installed desktop applications may also appear under the per-user or machine
`Uninstall` registry keys. Read both 32-bit and 64-bit views when relevant.

### macOS

```bash
mdfind "kMDItemKind == Application" | grep -i '<app>'
mdls '/Applications/<App>.app'
defaults read '/Applications/<App>.app/Contents/Info' CFBundleShortVersionString
codesign -dv --verbose=4 '/Applications/<App>.app'
```

### Linux

```bash
grep -Ril '<app>' ~/.local/share/applications /usr/share/applications
flatpak list
snap list
dpkg-query -l '*<app>*'
rpm -qa | grep -i '<app>'
```

Run only commands available on the current platform. Package-manager listings can
identify provenance; they do not prove which executable is currently running.

## Observe behavior

1. Launch the identified application with a safe application-control tool.
2. Record startup state, version/About information, and top-level navigation.
3. Inspect Settings, Help, permissions, update surfaces, and visible integrations.
4. Exercise representative core workflows with disposable, non-sensitive input.
5. Record each action and outcome, including disabled or authority-gated states.
6. Close documents or revert temporary state created during observation.

Capture screenshots only when they materially support layout or workflow claims.
Redact or exclude account names, file paths, notifications, recent items, and any
other personal content.

## Inspect local artifacts

Use read-only inspection for installation files, public configuration, schemas,
logs, extensions, protocol registrations, and declared permissions. Distinguish
bundled code from cached content and user-created data. Treat binary strings and
filenames as leads that require corroboration, not verified capabilities.

Network capture, authentication, account creation, purchases, updates, plugin
installation, destructive workflows, and access to private user documents require
separate user authority. Mark those branches `unknown` when authority is absent.

## Completion check

The installed branch is complete when the ledger records the application identity,
publisher, version, platform, provenance, inspected surfaces, action log, observed
results, local artifacts used as evidence, redactions, and inaccessible flows.
