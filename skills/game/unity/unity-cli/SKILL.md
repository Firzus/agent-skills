---
name: unity-cli
description: >-
  Use when an agent drives the Unity Editor or a development Player from a
  terminal: building, running tests, running C# in the live Editor, capturing
  screenshots, generating scenes or assets headless, exposing project
  commands, or iterating on a change the user tests in an open Editor. Also
  when the user mentions the Unity CLI, a `unity` command, or Unity MCP.
---

# Unity CLI: driving the Editor from an agent

Load the [`unity-core`](../unity-core/SKILL.md) skill with this one: its default
stack and review pass apply here.

Use the **Unity CLI** to drive the Editor and development Player builds from a
terminal, rather than asking the user to click through the Editor.

It is **experimental / beta**. Read `unity --help` and the relevant subcommand
help before composing commands: they take precedence over examples here.

The CLI is free and independent of Unity AI — no subscription, and it drives a
local Editor offline. The paid in-Editor AI Assistant is a separate product.

## Choose who the Editor is for

Every "Save changes?" or "Scene(s) Have Been Modified" dialog the user sees
must come from their own work, never from the agent's. So split Unity work by
who needs it:

| Who needs Unity | How the agent runs it |
| --- | --- |
| The agent: compiling, EditMode and PlayMode tests, builds, generating scenes or assets, capturing evidence | Headless, as described in [Run Unity headless](#run-unity-headless): a batch-mode Editor that shows no window and no dialog |
| The user: they will try something in the Editor, or ask for it to be opened | An interactive Editor tied to the harness session, as described in [iteration.md](./iteration.md), where the agent runs nothing on its own behalf without the user's agreement |

A batch run needs the project's interactive Editor closed. When the user's
Editor is open, the agent never closes it to make room: it asks, or waits until
the user is done, as [iteration.md](./iteration.md#agent-work-while-the-editor-is-open)
describes.

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
  verify `unity --version`.

## Run Unity headless

`unity test`, `unity build`, and `unity run` each launch a batch-mode Editor
resolved from `ProjectVersion.txt`, which exits when its work ends. They need
the project's interactive Editor closed; `unity test` refuses to start with
`already open in a running Editor (PID …)`. Discover options with each
command's `--help`:

```bash
unity test . --mode EditMode --output ../results/edit.xml
unity test . --mode PlayMode --output ../results/play.xml
unity build . --target StandaloneWindows64 --output-path ./Build/MyGame.exe
unity run . --no-tail -l ../logs/gen.log -- -executeMethod MyGame.EditorTools.Generate
```

- **Tests.** `test` writes an NUnit XML report; read results from it and keep
  reports out of version control. EditMode and PlayMode tests both run
  headless, including physics and frame advance.
- **Compile errors.** `unity test` reports only `TEST_RUN_ERROR` ("Unity exited
  with code 1 before reporting results"); read the `error CS` lines from the
  project's `Logs/Editor.log`. `unity run` prints them and exits non-zero.
- **Generation.** `unity run -- -executeMethod <Class.Method>` runs a static
  Editor method, for example one that builds a scene and saves it with
  `EditorSceneManager.SaveScene`. The CLI adds `-batchmode -quit` itself and
  rejects them after `--`. Confirm the result from a log line the method
  writes and from the saved file, not from the exit code alone.
- **Rendering.** Without `-nographics`, the batch Editor keeps a real graphics
  device and renders cameras, so a camera rendered into a `RenderTexture`
  gives usable pixels. With `-nographics` (`unity test . -- -nographics`, or
  after `--` for `unity run`) the device is `Null`: logic tests pass, but
  rendering silently returns meaningless pixels, so keep it off any run whose
  result depends on an image.
- **Builds.** `--execute-method` is optional: without it, the CLI uses a build
  profile. `--profile` supplies its own target.
- **Registered commands.** `unity run --command <name>` executes one Pipeline
  command in a fresh batch Editor, with no scene open and no Game view, so
  `game_view` fails there. Capture through an `-executeMethod` method that opens
  the scene and renders its camera instead.

Create a project with `unity projects create <name> --path <parent>
--editor-version <version> --template <template-id>`. The parent directory must
exist, and non-interactive creation needs an explicit template, for example
`com.unity.template.urp-blank`.

`unity open` stops with `PROJECT_UPGRADE_REQUIRED` on a project saved by an
older Editor. Report it and stop: moving a project to a newer Editor is the
user's decision.

The separate Pipeline command `unity command build` builds asynchronously in
the running Editor. Follow it with `build_status` until completion and inspect
the full BuildReport; submission alone is not success. Discover their schemas
with `unity list --json` before invoking them.

## Connect to a running Editor

Live Editor access requires `com.unity.pipeline`. Check the CLI version,
`ProjectSettings/ProjectVersion.txt`, and resolved package version before
`unity pipeline install` or `unity pipeline upgrade`.

### Compatibility gate

The CLI and Pipeline are experimental and change together. Verify the
installed pair on the project rather than assuming a release behaves like an
earlier one.

- Change the CLI or Pipeline version deliberately, not by reflex, and pass an explicit `--package-version` to `unity pipeline install`. A mismatched pair can fail only on commands with arguments, or fail to compile and drop the Editor into Safe Mode.
- After connecting, verify a harmless command **with an argument**, such as the readiness `eval` below. An argument-free command succeeding proves only the connection.
- Pipeline releases can rename commands. After any Pipeline upgrade, rediscover names with `unity list --json` before using a command name from this file.

A first installation can be picked up by a running Editor; after a package
version change, close and reopen it so the changed manifest is loaded. Open
the Editor as [iteration.md](./iteration.md#open-the-editor-for-the-session)
describes, then wait until it accepts commands:

```bash
unity status --until-ready           # waits for the Editor to report ready
unity command eval --code "return UnityEngine.Application.unityVersion;" --result-only --timeout 300
```

`ready` from `unity status` does not prove that the Editor accepts main-thread
commands. A cold start that reimports assets can report `ready` a minute or
more before commands are accepted. Meanwhile, main-thread commands fail with
`503 Service Unavailable: Server Busy`, saying the Editor is still `settling`,
while `unity status` keeps showing `ready`.

The first successful `eval` with an argument is the readiness proof. While the
Editor is busy, the CLI keeps retrying a command until its `--timeout`, so size
that timeout to the import: several minutes for a cold `Library`. If it still expires with `Server Busy` or `settling`, rerun it
within a total time limit, then report the timeout rather than proceeding.
`EDITOR_NOT_READY` quoting a dialog means the Editor waits for someone to
answer it. Treat any other error as a real failure.

`unity status` takes no positional project argument (unlike `test` and `close`);
use its `--project-path` filter when needed. A modal dialog can show there as
`STATUS_BLOCKED_BY_DIALOG`, naming the dialog in `blockedBy`. A dialog raised
during a test run can leave it at `ready` instead, while main-thread commands
fail with `EDITOR_NOT_READY` quoting the dialog.

`unity open . --args -automated` (`--args` forwards raw flags to the Editor)
opens an Editor that shows no dialog and answers each one with cancel:
`EditorUtility.DisplayDialog` returns `false`, `DisplayDialogComplex` returns
`1`. Tools that confirm before acting then abort silently, and quitting with
unsaved changes stops at the hidden "Save changes?" prompt. The CLI works with
or without the flag. A running Editor auto-answers dialogs when this returns
`false`:

```bash
unity command eval --code "return UnityEditorInternal.InternalEditorUtility.isHumanControllingUs;" --result-only --timeout 60
```

`unity close .` sent to an Editor still settling can time out with
`closed: false`, `method: none`, and `PROJECTS_CLOSE_TIMEOUT` advising
`--force`. Wait for the readiness `eval` to succeed, then retry the normal
close. Use `unity close . --force` only when a modal blocks shutdown, including
Safe Mode, when a ready Editor still fails to close, or when an `-automated`
Editor cannot quit because of unsaved changes; it terminates the process, as
does stopping the PID that `unity status` reports. **Neither normal nor forced
close saves work**: save first, or obtain approval to lose unsaved changes.

Discover per-project schemas with `unity list --json` before invoking
`unity command <command-name>`; projects can register their own commands.
`unity command` without a name lists command tags, and `--tag` lists one tag's
commands.

`unity status` reporting an empty table means no Editor is connected: the
package may be missing, still importing, or failing to compile. Read the
project's `Logs/Editor.log` for the compile errors.

Check compilation in a running Editor with `unity recompile` before invoking
commands that depend on new code; it exits 0 when compilation succeeds.

## Run C# against the live Editor

`eval` compiles with Roslyn and runs on the Unity main thread **without a project
recompile or code reload**. Read live state rather than guessing from files:

```bash
unity command eval --code "return UnityEngine.Application.version;"
unity command eval --code "return UnityEditor.EditorApplication.isPlaying;"
unity command eval_file --file "path/to/script.cs"
```

Pass named arguments (`--code`, `--file`). Supply a Roslyn script body: fully
qualified names, no `using` directives, and a final `return`, rather than a
normal C# compilation unit.

Use fully qualified component types, such as `--type MyGame.Gameplay.Trigger`.
Arrays are JSON: `--instance_ids "[123]"`, `--scenes '["Assets/X.unity"]'`.
Ensure PowerShell passes the embedded JSON quotes intact; native argument
handling varies by PowerShell version. Inspect received parameters on failure.

Use `--runtime <player-name>` for a development Player rather than the Editor.

## Capture visual evidence

Capture for the agent's own evidence headless, as
[Run Unity headless](#run-unity-headless) describes; the commands below need a
running interactive Editor. Default to `capture_editor_element` for Editor UI. Read the project's capture
policy first: full-screen restrictions belong in its `AGENTS.md`, not in the
CLI's capabilities. Discover the selector and output arguments from the schema.
An Editor capture follows the screen's scaling (a 22px row measures 27px at
125%), so compare it with a mockup rendered at the same scale.

An Inspector can report `No element matched selector` despite the correct
selection and selector because its UI Toolkit tree has not been built yet.
Via `eval_file`, call `UnityEditor.ActiveEditorTracker.sharedTracker.ForceRebuild()`
then `Repaint()` on the target Inspector window. Allow an Editor repaint before
retrying capture; if it still fails, inspect the tree and selector.

Use scene/game captures for scene evidence, not as proof that overlay UI is
visible: `game_view` with `source=camera` renders the camera only and
silently omits composited overlays, while its default `source=screen` keeps
them. Where project policy permits,
`UnityEngine.ScreenCapture.CaptureScreenshot` captures the rendered game
buffer, not the desktop. It writes asynchronously; verify the file exists
before inspecting it.

`game_view --save_path` refuses paths outside the project, and resolves every
other path, relative or absolute, under `Assets/` (`Temp/shot.png` becomes
`Assets/Temp/shot.png`), where the file and its `.meta` get imported. Omit
`save_path`, take the inline base64 PNG from the JSON result, and decode it to
a file outside the project. `screenshot --output` resolves against the project
root.

## Expose project commands

Register static C# methods so an agent gets a named, typed entry point instead of
a free-form `eval` string. The attributes live in the `Unity.Pipeline.Attributes`
assembly, namespace `Unity.Pipeline.Commands`: reference that assembly from an
Editor-only asmdef.

```csharp
using Unity.Pipeline.Commands;

[CliCommand("greet", "Log a greeting")]
public static string Greet(
    [CliArg("name", "Name to greet", Required = true)] string name)
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

Connect agents through the CLI, including `unity mcp`, rather than the MCP
server inside `com.unity.ai.assistant`: Unity's AI Assistant documentation
points MCP users to the CLI.

A project keeping the AI Assistant package alongside the CLI needs
it at **2.20.0-pre.2 or later**: earlier versions conflict with the CLI or crash
the CoreCLR Editor. Check the version in `Packages/manifest.json` before
diagnosing anything else about a broken connection.

## Working against a project

1. Decide who needs Unity ([Choose who the Editor is for](#choose-who-the-editor-is-for)); for the agent's own work, stay headless.
2. Check the compatibility gate before installing or upgrading Pipeline.
3. `unity doctor` on connection failure; `unity status --until-ready` to identify the Editor, then the readiness `eval` to confirm it accepts commands with arguments.
4. `unity list --json` to discover commands and their parameter schemas.
5. Read-only `eval --code` calls to observe live state.
6. A registered `[CliCommand]` for recurring operations; verify actual completion.

Global flags cover JSON output and exit codes — see the
[CLI reference](https://docs.unity.com/en-us/unity-cli/unity-cli-reference) — so
parse JSON and branch on exit codes rather than scraping human-readable output.
