---
name: setup-codex
description: Install the Codex operating policy and settings into a Codex home directory.
disable-model-invocation: true
---

# Set up Codex

Install this skill's operating policy and the configuration keys that activate it. Leave model selection, authentication, permissions, MCP servers, and project instructions untouched.

## 1. Inspect

Resolve the target Codex home from `CODEX_HOME`, falling back to `~/.codex`. Read its `config.toml` and `instructions/codex-operating-policy.md` when present.

Report whether the installer will create, update, or preserve each file. Call out existing values for `model_instructions_file` and `model_verbosity` because the installer will replace those two root keys.

**Done when:** the target paths and both current values are known or explicitly absent.

## 2. Install

Run the bundled PowerShell installer:

```powershell
pwsh -File "<skill-directory>/scripts/setup-codex.ps1"
```

Pass `-CodexHome <path>` to target a different profile. The installer is idempotent and backs up changed files under `<codex-home>/backups/` before writing them.

It installs these settings:

```toml
model_verbosity = "low"
model_instructions_file = "<codex-home>/instructions/codex-operating-policy.md"
```

It does not set `model`, `model_reasoning_effort`, or `personality`; Codex or the user retains those choices.

**Done when:** the installer reports that both files were installed or were already current, with no error.

## 3. Verify

Read the resulting files and check that:

- each managed key occurs once at the TOML root;
- `model_instructions_file` resolves to the installed prompt;
- the installed prompt matches this skill's `codex-operating-policy.md`;
- every unrelated configuration entry remains present.

Start a new Codex task because an existing task keeps the instructions loaded when it started.

**Done when:** every check passes and the user has the backup path, or knows that no backup was needed.

## Restore

Copy the latest timestamped backup over the corresponding file, or remove the two managed root keys and the installed prompt when the installation created them from scratch. Start a new Codex task after restoring.
