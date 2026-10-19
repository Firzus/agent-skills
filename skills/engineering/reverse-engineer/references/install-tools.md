# Install the optional third-party tools

Read this when `decompile` or `managed` reports a missing tool, or when the shell route needs Ghidra, jadx or ilspycmd. You install it yourself with this skill's scripts; the user does not need to visit any site.

| Tool | Needed by | Source | Download |
|---|---|---|---|
| JDK 21 (Temurin) | Ghidra, jadx | https://github.com/adoptium/temurin21-binaries | about 200 MB |
| Ghidra | `decompile` | https://github.com/NationalSecurityAgency/ghidra | about 550 MB |
| jadx (CLI) | `managed` on APK, DEX, JAR | https://github.com/skylot/jadx | about 70 MB |
| .NET 10 SDK, then ilspycmd | `managed` on .NET | https://github.com/dotnet/sdk, https://github.com/icsharpcode/ILSpy | about 250 MB if the SDK is missing |

## Per-user install (default)

1. Pick only what the task needs: `jdk` and `ghidra` for `decompile`; `jdk` and `jadx` for APK, DEX or JAR; `ilspycmd` for .NET. Skip `jdk` when `java -version` already reports 21 or newer.
2. Tell the user in one line what you install, from where and how big, unless they already asked for it.
3. Run the script from this skill's `scripts/` folder, by its full path (`<skill>` below):
   - Windows (PowerShell, or Git Bash calling PowerShell): `powershell -NoProfile -ExecutionPolicy Bypass -File <skill>/scripts/install-tools.ps1 jdk jadx`
   - macOS and Linux (needs `curl`, `tar`, `unzip`): `sh <skill>/scripts/install-tools.sh jdk jadx`
4. Call the tool again. It looks in the tools root first, so there is no restart and no `PATH` change. On the shell route, call the installed tool by its full path in the tools root.

The scripts take the latest official release from each source, need no admin rights, and overwrite in place, so rerunning one is safe. They install into the tools root:

| OS | Tools root (override with `REVERSE_ENGINEER_TOOLS`) |
|---|---|
| Windows | `%LOCALAPPDATA%\reverse-engineer\tools` |
| macOS | `~/Library/Application Support/reverse-engineer/tools` |
| Linux | `${XDG_DATA_HOME:-~/.local/share}/reverse-engineer/tools` |

If a script fails with `cannot read the latest release` (an HTTP 403 from the anonymous GitHub API limit), rerun it with `GH_TOKEN` set, for example from `gh auth token`.

If the tool still reports it missing, list the tools root and compare with the expected layout: `jdk-21*/bin/java` (macOS: `jdk-21*/Contents/Home/bin/java`), `ghidra_*/support/analyzeHeadless`, `jadx/bin/jadx`, `dotnet-tools/ilspycmd`.

## System-wide install (admin rights)

Only when the user asks for it:

- Windows: run the installer elevated, which shows the UAC prompt to the user:
  `Start-Process winget -Verb RunAs -Wait -ArgumentList 'install --id EclipseAdoptium.Temurin.21.JDK -e --accept-package-agreements --accept-source-agreements'`
  (also `Microsoft.DotNet.SDK.10`). Ghidra and the jadx CLI have no suitable winget package: use the per-user route.
- macOS: `brew install ghidra jadx` and `brew install --cask temurin@21 dotnet-sdk`. A cask can ask for the user's password.
- Linux: `sudo apt install openjdk-21-jdk` or the distribution's equivalent. You cannot type the `sudo` password: ask the user to run the command (in Claude Code, `! sudo ...`).

A system-wide install reaches the MCP server only after a restart (in Claude Code, restart the session). Ghidra outside the usual folders needs `GHIDRA_INSTALL_DIR`.
