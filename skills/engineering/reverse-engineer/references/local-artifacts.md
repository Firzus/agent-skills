# Local artifact inspection

Use this channel to read what an installed build leaves on disk, without launching
it, altering data, or changing the system. For a mechanism like downloading, the
manifests, config, and cache layout on disk often expose formats and parameters
more directly than any documentation.

## Identify the build

Prefer signed package metadata, executable metadata, and the application's About
surface. Cross-check name, publisher, version, architecture, install source, and
executable path before attributing artifacts to a repository or build.

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

## Inspect the artifacts

Use read-only inspection for installation files, public configuration, schemas,
logs, cache and download directories, extensions, protocol registrations, and
declared permissions. For the mechanism in focus, look for:

- **Manifests and formats** — the files describing what is fetched or produced:
  version manifests, chunk indexes, package descriptors, their fields and layout.
- **Cache and working layout** — how partial and completed artifacts are named and
  arranged on disk; what a resume or pause leaves behind.
- **Config and parameters** — settings for sizes, concurrency, endpoints, timeouts.
- **Logs** — recorded sequences that reveal ordering, retries, and error handling.

Distinguish bundled code from cached content and user-created data. Treat binary
strings and filenames as leads that require corroboration, not verified behavior;
tag each finding **verified** or **assumed**.

Network capture, launching the application, authentication, updates, and access to
private user documents require separate user authority. Mark those branches as
unknown when authority is absent.

## Completion check

The local-artifact channel is complete when the notes record the build identity,
publisher, version, platform, and provenance; the manifests and formats found; the
cache and working-directory layout; the parameters read from config; the log
evidence used; and any artifact left unread for lack of authority.
