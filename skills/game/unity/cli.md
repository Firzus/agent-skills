# Unity CLI — driving the Editor from an agent

Use the **Unity CLI** to drive the Editor and development Player builds from a
terminal, rather than asking the user to click through the Editor.

It is **experimental / beta**. Read `unity --help` and the relevant subcommand
help before composing commands: they take precedence over examples here.

The CLI is free and independent of Unity AI — no subscription, and it drives a
local Editor offline. The paid in-Editor AI Assistant is a separate product.

## Install

Take the install line from the [CLI docs](https://docs.unity.com/en-us/hub/unity-cli);
on Windows use the native PowerShell installer rather than WSL. No Hub is needed.

Installation and update traps:

- The binary lands in `%LOCALAPPDATA%\Unity\bin`, appended to the user PATH, so
  `unity` resolves only in shells started afterwards. Already-open terminals
  report "command not found" until restarted — `unity doctor` flags this as
  `check.binary-on-path`.
- `unity editors list` mixes downloadable versions into the installed ones. Only
  rows carrying a path in the `Installed` column exist on disk.
- `unity doctor` comes first when anything fails to connect: it names the
  configuration problem directly, which beats inferring it from a failed call.
- On Windows, a running `unity.exe --internal-identity-serve` helper can lock the
  binary: `unity self-update` reports `success: true` without replacing it.
  Identify and stop that helper, not unrelated Editor processes, then retry and
  verify `unity --version`. This was observed in the beta.10 migration session.

## Build and test

`unity build` and `unity test` launch a batch-mode Editor resolved from
`ProjectVersion.txt`. Close the project's interactive Editor before running
tests. Discover build options with `unity build --help`:

```bash
unity build . --target StandaloneWindows64 --output-path ./Build/MyGame.exe
unity test . --mode EditMode
```

`--execute-method` is optional: without it, the CLI uses a build profile on
Unity 6+ or legacy desktop player flags. `--profile` supplies its own target.
`test` writes an NUnit XML report; keep generated reports out of version control.

The separate Pipeline command `unity command build` builds asynchronously in
the running Editor. Follow it with `build_status` until completion and inspect
the full BuildReport; submission alone is not success. Discover their schemas
with `unity list --json` before invoking them.

## Connect to a running Editor

Live Editor access requires `com.unity.pipeline`. Check the CLI version,
`ProjectSettings/ProjectVersion.txt`, and resolved package version before
`unity pipeline install` or `unity pipeline upgrade`.

### Compatibility gate

These are version-scoped observations from the 2026-09-21 migration report,
not project pins or a guarantee for later releases. Its working combination was
CLI `1.0.0-beta.10`, Pipeline `0.6.0-exp.1`, Editor `6000.7.0b1`.

| Combination | Consequence |
| --- | --- |
| CLI beta.9+ with Pipeline older than `0.6.0-exp.1` | Commands with arguments fail, while argument-free commands can succeed: connection alone is a false positive. |
| Pipeline 0.6 / 0.7 with Editor `6000.7.0a3` | Compilation fails with CS0246 (`DialogEventInfo` missing), leading to Safe Mode. Do not upgrade Pipeline blindly. |

After connecting, verify a harmless command **with an argument**, such as the
`eval` read below, rather than treating an argument-free command as proof.

A first installation can be picked up by a running Editor; after a package
version change, close and reopen it so the changed manifest is loaded. Start
with `-automated` to reduce modal interruptions:

```bash
unity open . --args -automated       # --args forwards raw flags to the Editor
unity status                         # connected Editors: port, state, PID
```

`unity status` takes no positional project argument (unlike `test` and `close`);
use its `--project-path` filter when needed. If a modal blocks shutdown, including
Safe Mode, `unity close . --force` can terminate the Editor. **Neither normal nor
forced close saves work**: save first, or obtain approval to lose unsaved changes.

Discover per-project schemas with `unity list --json` before invoking
`unity command <command-name>`; projects can register their own commands.

`unity status` reporting an empty table means no Editor is connected: the
package may be missing, still importing, or failing to compile. Listing filters
(`--query`, `--detail`, `--tag` on `unity command`) need a recent Pipeline; fall
back to `unity list --json` if unsupported, not to a package upgrade by reflex.

## Run C# against the live Editor

`eval` compiles with Roslyn and runs on the Unity main thread **without a project
recompile or domain reload**. Read live state rather than guessing from files:

```bash
unity command eval --code "return UnityEngine.Application.version;"
unity command eval --code "return UnityEditor.EditorApplication.isPlaying;"
unity command eval_file --file "path/to/script.cs"
```

Pipeline 0.6 uses named arguments (`--code`, `--file`), not positional values or
`name=value`. Supply a Roslyn script body: fully qualified names, no `using`
directives, and a final `return`, rather than a normal C# compilation unit.

Use fully qualified component types, such as `--type MyGame.Gameplay.Trigger`.
Arrays are JSON: `--instance_ids "[123]"`, `--scenes '["Assets/X.unity"]'`.
Ensure PowerShell passes the embedded JSON quotes intact; native argument
handling varies by PowerShell version. Inspect received parameters on failure.

Use `--runtime <player-name>` for a development Player rather than the Editor.

## Capture visual evidence

Default to `capture_editor_element` for Editor UI. Read the project's capture
policy first: full-screen restrictions belong in its `AGENTS.md`, not in the
CLI's capabilities. Discover the selector and output arguments from the schema.

An Inspector can report `No element matched selector` despite the correct
selection and selector because its UI Toolkit tree has not been built yet.
Via `eval_file`, call `UnityEditor.ActiveEditorTracker.sharedTracker.ForceRebuild()`
then `Repaint()` on the target Inspector window. Allow an Editor repaint before
retrying capture; if it still fails, inspect the tree and selector.

Use scene/game captures for scene evidence, not as proof that overlay UI is
visible: a camera-only capture can silently omit composited overlays. Where
project policy permits, `UnityEngine.ScreenCapture.CaptureScreenshot` captures
the rendered game buffer, not the desktop. It writes asynchronously; verify the
file exists before inspecting it.

Prefer absolute output paths outside `Assets`: `save_path` can resolve against
the authoring root (`Temp/shot.png` becomes `Assets/Temp/` and gets imported),
while `screenshot --output` resolves against the project root.

## Expose project commands

Register static C# methods so an agent gets a named, typed entry point instead of
a free-form `eval` string:

```csharp
[CliCommand("greet", "Log a greeting")]
public static string Greet(
    [CliArg("name", Required = true)] string name)
{
    return $"Hello, {name}!";
}
```

```bash
unity command greet --name World
```

Wrap the project's recurring operations this way — build a profile, run a
validation pass, rebake, reimport a folder. A registered command is discoverable
through `unity command`, carries its own argument validation, and survives
refactors that would break an `eval` snippet.

## Leave MCP out

Prefer `unity command` when the agent can run a shell. `unity mcp` wraps the
same command surface in a protocol layer rather than adding Editor capabilities.

For agents without shell access or unable to compose reliable command lines,
configure MCP from `unity mcp configure --help`.

The MCP server in `com.unity.ai.assistant` was deprecated on 24 August 2026,
with support through at least end-2026 and no published removal date. This
does not deprecate third-party MCP packages or the CLI.

A project keeping the AI Assistant package alongside the CLI needs it at
**2.13 or later** — earlier versions conflict with the CLI. Check the version in
`Packages/manifest.json` before diagnosing anything else about a broken
connection.

## Working against a project

1. Check the compatibility gate before installing or upgrading Pipeline.
2. `unity doctor` on connection failure; `unity status` to identify the Editor.
3. `unity list --json` to discover commands and their parameter schemas.
4. A read-only `eval --code` to verify argument handling and observe live state.
5. A registered `[CliCommand]` for recurring operations; verify actual completion.

Global flags cover JSON output and exit codes — see the
[CLI reference](https://docs.unity.com/en-us/unity-cli/unity-cli-reference) — so
parse JSON and branch on exit codes rather than scraping human-readable output.
