# Validate Tauri Changes

Read after implementation or when asked to test an application. Select checks
by the changed boundary; use existing project scripts, target selection, and
Cargo features instead of imposing a new test setup.

## Select the layers

| Changed behavior | Focused validation |
| --- | --- |
| Frontend rendering or state | Existing frontend tests/build; actual WebView check for platform-sensitive behavior. |
| Rust logic or IPC contract | Cargo check, nearest logic tests, caller/error-shape checks, real IPC exercise when available. |
| Plugin, capability, or window behavior | Effective permission review and the affected action in the actual application. |
| Mobile or platform-gated code | Existing checks for the affected target; desktop success is not mobile evidence. |
| Assets, sidecars, updater, or packaging | Existing bundle/release checks and packaged behavior where available. |
| Documentation only | Links, examples, and consistency; no app launch required. |

For conventional layouts, a narrow Rust compile check is:

```sh
cargo check --manifest-path src-tauri/Cargo.toml
```

Adapt the manifest path to the workspace. Run the project's required lint and
test commands; preserve its lockfile and feature policy. Avoid enabling all
features by default when they represent incompatible configurations.

## Frontend and Rust

Use frontend tests for UI logic and error handling. Mocked invokes can verify
caller expectations, but cannot establish that registration or capabilities
work in Tauri.

Test pure Rust logic without a WebView where the existing structure permits.
For a changed command, cover the intended result and a meaningful failure,
and check serialization against the existing frontend contract. Keep the
command wrapper responsible for IPC and state access rather than moving
business logic into an untestable runtime boundary.

Done when relevant local checks pass, or failures are separated into
change-caused failures and pre-existing or environment blockers.

## Actual application

Use [Diagnosis](debugging.md) for session preparation, tool selection,
observation/action verification, and cleanup.

Exercise the affected path in the intended instance and WebView. Check its
expected application result, not just the presence of a screenshot or an IPC
record. For a changed permission boundary, also exercise a representative
denied operation or target without broadening access to make the test pass.

If agent-kit is missing, use the available runtime evidence and report the
remaining gap. Do not require MCP installation to complete frontend or Rust
checks, or count those checks as runtime verification.

Done when the changed runtime behavior is observed, or explicitly unverified
with the missing evidence identified.

## Bundles and release behavior

When packaging changes, verify the configured frontend build output matches
`build.frontendDist`, and that required assets and target-specific sidecars
are included. Use the project's existing bundle command and signing process.
[Sidecars](https://v2.tauri.app/develop/sidecar/)

For updater changes, check HTTPS production endpoints and signed artifacts
through the existing release workflow. Keep credentials outside the repository.
[Updater](https://v2.tauri.app/plugin/updater/)

A working development instance does not establish packaged behavior.
Agent-kit diagnostics are not a release-build test mechanism. Report a
packaged launch or update check as untested when it was not performed.

## Report

For each relevant layer, record the command or runtime observation, result,
and target. Mark skipped layers with a reason. Name any unsupported platform,
unavailable instance, missing instrumentation, or untested bundle behavior
that limits the conclusion.
