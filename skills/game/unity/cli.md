# Unity CLI — driving the Editor from an agent

The **Unity CLI** (announced 15 July 2026) is a terminal-native interface to the
Unity Editor and to development Player builds, built for AI agents, CI, and
custom tooling. It works with Claude, Codex, Copilot, and local models. This is
the channel an agent uses to act on a Unity project, in place of asking the user
to click through the Editor.

It is **experimental / beta**, and its command surface moves between builds.
`unity --help` is authoritative for the installed version — read it before
building a command line from this file, and prefer what it reports over what is
written here.

The CLI is free and independent of Unity AI — no subscription, and it drives a
local Editor offline. The paid in-Editor AI Assistant is a separate product.

## Install

Take the install line from the [CLI docs](https://docs.unity.com/en-us/hub/unity-cli),
and on Windows the native PowerShell installer rather than WSL. It manages
Editors without Unity Hub, so `unity install`, `unity editors`, `unity auth` and
`unity doctor` replace the Hub for an agent.

Three things the install leaves behind that no `--help` confesses:

- The binary lands in `%LOCALAPPDATA%\Unity\bin`, appended to the user PATH, so
  `unity` resolves only in shells started afterwards. Already-open terminals
  report "command not found" until restarted — `unity doctor` flags this as
  `check.binary-on-path`.
- `unity editors list` mixes downloadable versions into the installed ones. Only
  rows carrying a path in the `Installed` column exist on disk.
- `unity doctor` comes first when anything fails to connect: it names the
  configuration problem directly, which beats inferring it from a failed call.

## Build and test

`build` and `test` spawn the Editor in batch mode and forward the conventional
CI flags, so `-batchmode`, `-nographics`, `-quit` and `-logFile` are handled for
you. Both resolve the Editor from `ProjectVersion.txt`, which keeps a version
bump out of the command line:

```bash
unity build . --target StandaloneWindows64 --execute-method Builder.PerformBuild
unity test . --mode EditMode
```

`--target` and `--execute-method` are both required — Unity has no built-in
command-line build, so the project must supply that static method. `test` writes
an NUnit XML report (`test-results.xml` by default); add it to `.gitignore`.

## Connect to a running Editor

Live Editor access comes from the experimental `com.unity.pipeline` package,
supported on Unity 6.0 LTS and newer:

```bash
unity pipeline install               # add the package to the project
unity pipeline list                  # projects using it
```

An Editor already running picks the package up without a restart. Start it with
`-automated`, or the Pipeline server warns that a modal popup can stall a
command mid-flight:

```bash
unity open . --args -automated       # --args forwards raw flags to the Editor
unity status                         # connected Editors: port, state, PID
```

`unity open` stays attached to the Editor process instead of returning, and does
not start it when detached from a terminal. Script it in the background against
the Editor binary directly.

With the package installed, discover before invoking — the command set is
per-project, since projects register their own:

```bash
unity list                           # tools the connected Editor exposes
unity command <command-name>
```

`unity status` reporting an empty table means no Editor is connected: the
package is missing, or the Editor is still importing.

## Run C# against the live Editor

`eval` compiles with Roslyn and runs on the Unity main thread **without a project
recompile or domain reload**, which makes it the cheap way to read live Editor state
rather than reasoning about it from files:

```bash
unity command eval "return UnityEngine.Application.version;"
unity command eval "return UnityEditor.EditorApplication.isPlaying;"
unity command eval_file "path/to/script.cs"
```

Depending on the installed beta, `eval` may sit at the top level instead
(`unity eval "..."`). Confirm with `unity command --help` or `unity eval --help`.

Add `--runtime` to target a development Player build rather than the Editor.

Use it to answer questions about the real project — which scene is open, whether
Play Mode is running, what a serialized field actually holds — so an edit lands
against observed state.

## Capture the screen

| What the shot must show | Reach for |
| --- | --- |
| The 3D scene | `screenshot`, `capture_game_view`, `capture_scene_view` |
| The screen, overlay UI included | `eval` + `ScreenCapture.CaptureScreenshot` |
| An `EditorWindow` element | `capture_editor_element` |

```bash
unity command eval 'UnityEngine.ScreenCapture.CaptureScreenshot("C:/abs/shot.png"); return "queued";'
```

The first row renders **a camera**, and a UI Toolkit or UGUI overlay belongs to
none — it is composited over the finished image, so only the buffer capture
proves it reached the screen. World-space UI and the Panel Renderer live in the
scene, and every command sees them. Trust a camera shot as a verdict on overlay
UI and you chase a bug that is not there: it reports `success` and omits the UI
in silence.

Two edges make a result unreadable. `CaptureScreenshot` writes a frame or two
after it returns, so poll the path. `save_path` resolves against the authoring
root — `Temp/shot.png` lands in `Assets/Temp/` and gets imported — where
`screenshot --output` resolves against the project root.

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

Reach the Editor through `unity command` and `unity command eval`. An agent that
runs shell commands has no use for MCP here: `unity mcp` wraps the same command
surface as `unity list` behind a protocol layer, so it costs a configuration
step, permanently loaded tool definitions, and a silent failure mode, and buys
back nothing the direct call does not already do in 200–600 ms.

Two setups still reach for it, and both are somebody else's harness: an agent
that cannot spawn a shell, and a model that composes command lines unreliably.
Build the command line from `unity mcp configure --help` when you meet one,
rather than from a recipe cached here that the next beta moves.

Unity deprecated a second MCP server on 24 August 2026 — the one inside
`com.unity.ai.assistant` (the in-Editor AI Assistant package), superseded by the
CLI. Support runs at least to the end of 2026, with no removal date published.
That deprecation is narrow, so read a project's setup before calling it
affected: a third-party MCP package installed from GitHub is untouched, and so
is the CLI itself.

A project keeping the AI Assistant package alongside the CLI needs it at
**2.13 or later** — earlier versions conflict with the CLI. Check the version in
`Packages/manifest.json` before diagnosing anything else about a broken
connection.

## Working against a project

1. `unity doctor` when anything fails to connect.
2. `unity status` to confirm an Editor is connected before reaching for its commands.
3. `unity list` to see what this project exposes, before assuming a command name.
4. `unity command eval` to read live state rather than inferring it from files.
5. A registered `[CliCommand]` for anything done more than once.

Global flags cover JSON output and exit codes — see the
[CLI reference](https://docs.unity.com/en-us/unity-cli/unity-cli-reference) — so
parse JSON and branch on exit codes rather than scraping human-readable output.
