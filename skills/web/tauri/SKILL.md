---
name: tauri
description: >-
  Tauri 2 development and validation. Use for src-tauri, Rust/frontend IPC,
  capabilities and plugins, windows, mobile entry points, packaging,
  or inspecting a running Tauri app with tauri-agent-kit.
---

# Tauri

Work at the boundary between the web frontend, Rust, and the native application.
Use the project's architecture and commands; load only the references needed
for the task.

## 1. Identify the project

Inspect the Tauri configuration, Cargo manifest and lockfile, builder entry
point, and frontend scripts. Account for workspace paths and platform-specific
configuration instead of assuming every app has the default layout.

Identify the Tauri version, target platforms, existing invoke wrapper, and
commands for the relevant development and validation work. Distinguish the
host OS from the platforms the application ships on.

Done when the affected boundary, target platform, and existing commands are
known, or their absence is explicit.

## 2. Choose the work

| Task | Read before acting | Completion criterion |
| --- | --- | --- |
| Commands, state, events, windows, or mobile structure | [Development](best-practices.md) | Changed IPC contracts agree on both sides; platform-specific code remains scoped. |
| Plugin integration or permission failures | [Permissions](permissions.md) | Registration, effective capability, target, and operation scope are accounted for. |
| Inspecting or reproducing behavior in the application | [Diagnosis](debugging.md) | The intended instance is identified and evidence distinguishes observations from hypotheses. |
| Installing, configuring, or troubleshooting the MCP connection | [Agent kit integration](agent-kit.md) | Compatibility and connection are verified, or the missing prerequisite is reported. |
| Validating a change, including bundles | [Testing](testing.md) | Relevant layers have results; skipped layers have reasons. |

Tasks may cross boundaries: a plugin fix needs both permissions and validation.
For an authorized v1 migration, consult the
[official migration guide](https://v2.tauri.app/start/migrate/from-tauri-1/)
and the development and permissions references. Account for changed imports,
window APIs, and plugin permissions within the requested migration scope.

Prefer tauri-agent-kit for supported Windows development sessions. Its
availability is separate from Tauri's desktop/mobile support. If unavailable,
offer integration and continue with existing evidence; do not install packages
or migrate the application just to obtain diagnostics.

## 3. Verify and report

For implementation work, apply [Testing](testing.md) to the changed boundary.
For runtime sessions, complete [Diagnosis cleanup](debugging.md#cleanup).

Report the change or finding, checks performed, evidence source and target,
and remaining uncertainty. A browser-only result, successful compilation, or
dispatched UI action alone is not proof that the native application works.
