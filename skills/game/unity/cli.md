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

Both the CLI and Unity MCP are **free**: no subscription, no MCP concurrency
limit. The paid product is the in-Editor AI Assistant, which is separate.

## Install

```bash
curl -fsSL https://public-cdn.cloud.unity3d.com/hub/prod/cli/install.sh \
  | UNITY_CLI_CHANNEL=beta bash

unity --version
```

On Windows, use the native PowerShell installer rather than WSL:

```powershell
irm https://public-cdn.cloud.unity3d.com/hub/prod/cli/install.ps1 | iex
```

It installs to `%LOCALAPPDATA%\Unity\bin` and appends that directory to the user
PATH, so `unity` resolves only in shells started afterwards. Already-open
terminals report "command not found" until restarted — `unity doctor` flags this
as `check.binary-on-path`.

It manages Editors without Unity Hub:

```bash
unity install lts                    # or a pinned version: 6000.2.10f1
unity install lts -m android ios webgl
unity editors list                   # Editors, installed and available
unity open /path/to/project
unity auth login
unity doctor                         # diagnose configuration issues
```

`unity editors list` reports downloadable versions alongside installed ones.
Only rows carrying a path in the `Installed` column exist on disk.

Reach for `unity doctor` first when a command fails to connect — it reports the
configuration problem directly, which is faster than inferring it from a failed
call.

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

`pipeline install` rewrites `Packages/manifest.json` rather than merging into it,
so re-check the dependency list afterwards for entries it dropped.

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

## MCP mode

The CLI ships its own MCP server, so an MCP-capable agent connects without the
separate Unity MCP setup:

```bash
unity mcp                            # start the server
unity mcp configure --list           # supported clients
unity mcp configure claude-code
unity mcp configure cursor --local
unity mcp configure codex --local    # writes .codex/config.toml in the project
unity mcp --project-path /path/to/MyProject
```

Verify what `configure` wrote before restarting the client — the generated
schema does not always match what the client parses. Codex reads a named table,
and ignores the array-of-tables form without reporting an error:

```toml
[mcp_servers.unity]
command = "unity"
args = ["mcp", "--project-path", "."]
startup_timeout_sec = 120
```

`configure` writes an absolute, machine-specific binary path when `unity` is not
yet on the PATH. Replace it with the bare command to keep a committed config
portable.

The server exposes the same command surface as `unity list`, over a persistent
connection instead of a process per call — worth the setup for editor work done
in bulk. It serves no tools without a live Editor, so start the Editor and wait
for `unity status` to report `ready` **before** starting the MCP client.
`codex mcp list` confirms the server is loaded when its tools appear missing.

Unity MCP remains supported. Unity recommends the CLI for new terminal-native
integrations, which is why new work starts here.

## Working against a project

1. `unity doctor` when anything fails to connect.
2. `unity status` to confirm an Editor is connected before reaching for its commands.
3. `unity list` to see what this project exposes, before assuming a command name.
4. `unity command eval` to read live state rather than inferring it from files.
5. A registered `[CliCommand]` for anything done more than once.

Global flags cover JSON output and exit codes — see the
[CLI reference](https://docs.unity.com/en-us/unity-cli/unity-cli-reference) — so
parse JSON and branch on exit codes rather than scraping human-readable output.
