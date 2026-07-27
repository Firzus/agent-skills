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

It manages Editors without Unity Hub:

```bash
unity install lts                    # or a pinned version: 6000.2.10f1
unity install lts -m android ios webgl
unity editors                        # list installed Editors
unity open /path/to/project
unity auth login
unity doctor                         # diagnose configuration issues
```

Reach for `unity doctor` first when a command fails to connect — it reports the
configuration problem directly, which is faster than inferring it from a failed
call.

## Connect to a running Editor

Live Editor access comes from the experimental `com.unity.pipeline` package,
supported on Unity 6.0 LTS and newer:

```bash
unity pipeline install               # add the package to the project
unity pipeline list                  # projects using it
```

With it installed, discover before invoking — the command set is per-project,
since projects register their own:

```bash
unity command                        # list commands the Editor exposes
unity command <command-name>
```

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
unity mcp --project-path /path/to/MyProject
```

Unity MCP remains supported. Unity recommends the CLI for new terminal-native
integrations, which is why new work starts here.

## Working against a project

1. `unity doctor` when anything fails to connect.
2. `unity command` to see what this project exposes, before assuming a command name.
3. `unity command eval` to read live state rather than inferring it from files.
4. A registered `[CliCommand]` for anything done more than once.

Global flags cover JSON output and exit codes — see the
[CLI reference](https://docs.unity.com/en-us/unity-cli/unity-cli-reference) — so
parse JSON and branch on exit codes rather than scraping human-readable output.
