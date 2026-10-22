# Troubleshooting

Adapted from the upstream `troubleshooting` skill and `docs/troubleshooting.md`
for the CLI; see [NOTICE](../NOTICE). Use it when `start`, `list_pages`,
`new_page`, or `navigate_page` fails, a command hangs, or a connection is refused.

## Gather the state

1. `chrome-devtools --version` and `chrome-devtools status`: compare the daemon
   `version=` with the CLI and read the effective `args=`. A typo such as
   `--autoBronnect` does not connect to the user's Chrome and starts a new profile
   instead.
2. Settings can also come from a configuration file: `--config <file>`, or the
   global file `%LOCALAPPDATA%\Google\cd4a\config.json` on Windows and
   `$XDG_CONFIG_HOME/cd4a/config.json` or `~/.config/cd4a/config.json` elsewhere.
   Read it when behavior does not match `args=`; change it only with the user's
   approval.
3. Capture daemon logs, since the daemon does not write to the terminal: restart
   with a log file, reproduce, then read the end of the log.

   ```sh
   NODE_DEBUG=* chrome-devtools start --logFile=<abs>/cdt.log
   ```

   In PowerShell, set `$env:NODE_DEBUG = '*'` first.

## Errors and fixes

| Symptom | Cause and action |
| --- | --- |
| `chrome-devtools` not found | Global npm `bin` directory missing from `PATH`, or the package is not installed. Check `npm prefix -g`; install only with approval. |
| `Daemon server version (...) does not match CLI version` | The daemon predates an update: `chrome-devtools start`. |
| `Timeout waiting for daemon response` in a connected mode | Chrome is waiting for the user to accept the remote debugging prompt. Ask them to accept, then retry `list_pages`. |
| Hang or timeout in launch modes, `Target closed`, `Network.enable timed out`, `socket connection was closed` | `chrome-devtools stop`, then retry. If it persists, capture logs. `Target closed` at launch means Chrome could not start: check that the stable channel is installed or pass `--executablePath`. |
| `Could not find DevToolsActivePort` (`--autoConnect`) | Follow the sequence below. |
| `Unknown argument` or `Not enough non-option arguments` | Required values are positional, optional ones are flags; check `<tool> --help`. In PowerShell, inner quotes were probably stripped: see the quoting rules in SKILL.md. |
| `Element with uid ... no longer exists` | The page changed: take a new snapshot. |
| Command missing or reported as requiring a flag | Restart with that flag (`chrome-devtools --help` names it). Extension tools need `--categoryExtensions` in connected modes. |
| `Access denied: path ... is not within any of the configured workspace roots` | Write inside a `--workspace` directory, or restart with an additional `--workspace`. |
| `ERR_MODULE_NOT_FOUND` | Unsupported Node.js version or a corrupted install: check `node --version`, then propose a reinstall with approval. |

## `Could not find DevToolsActivePort`

The daemon cannot find the file that a debuggable Chrome writes in its profile.

1. Ask the user to confirm that the expected channel is running (stable by default;
   `--channel` selects another).
2. Ask them to open `chrome://inspect/#remote-debugging` and enable remote
   debugging.
3. Run only `chrome-devtools list_pages` to test the connection, and ask them to
   accept the prompt if it appears.
4. If it still fails, use `--browserUrl` instead: the user starts Chrome with a
   remote debugging port and a non-default profile, which Chrome requires
   (Windows Command Prompt syntax):

   ```bat
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-profile-stable"
   chrome-devtools start --browserUrl=http://127.0.0.1:9222
   ```

   That profile does not hold the user's usual sessions.

On macOS, `EPERM` reading `DevToolsActivePort` means the terminal lacks access to
Google Chrome in System Settings > Privacy & Security > Files & Folders.

## Environment limits

- Sandboxed hosts (macOS Seatbelt, Linux containers) can prevent Chrome from
  starting: connect with `--browserUrl` to a Chrome started outside the sandbox.
- Chrome does not run as root: use an unprivileged user in containers.
- In WSL, launching Windows Chrome fails: install Chrome inside WSL, use mirrored
  networking with `--browserUrl`, or run the CLI from PowerShell or Git Bash.

## Known issues

When none of the above matches, search the upstream known issues and reports:
https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/troubleshooting.md,
then `gh issue list --repo ChromeDevTools/chrome-devtools-mcp --search "<error snippet>" --state all`
when `gh` is available. Report the exact error, version, mode, and log excerpt.
