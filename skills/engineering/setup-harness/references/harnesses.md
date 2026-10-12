# Native destinations

Read only the sections for the selected harnesses. These are personal setup routes;
project instructions require explicit project scope and their own reviewed diff.
Recheck official documentation when the selected client/version differs or its
observed behavior contradicts these routes.

## Codex

Codex is one harness choice covering the app (named ChatGPT) and Codex CLI. Both
use the same user-scope `AGENTS.md` when they share `CODEX_HOME`. This route configures
local agent instructions, not ChatGPT account personalization.

- Resolve the selected profile's `CODEX_HOME`, defaulting to `~/.codex`. The target
  is `<codex-home>/AGENTS.md`, loaded as additional user instructions without
  replacing the built-in system prompt.
- Resolve the home in the intended environment, including WSL or a remote machine
  when applicable. Review and write each shared destination once, explaining that
  the change affects both the app and CLI using it. Different `CODEX_HOME` values
  are separate profile targets, not separate harness choices.
- Inspect `AGENTS.override.md`: a nonempty override takes precedence over
  `AGENTS.md`. Report any shadowing and leave the override unchanged.
- Inspect relevant `config.toml` settings, including `model_instructions_file` and
  `developer_instructions`, and active profile/launch overrides when discoverable.
  Read referenced instruction files only as needed to understand conflicts; leave
  all configuration and legacy policy files unchanged. Report conflicts as loading
  limitations rather than offering to remove or transfer their contents.
- For CLI verification, ask the user to start a fresh `codex` session in the
  intended terminal/profile, or do so only with separate authorization. Do not
  launch a nested CLI run merely to validate this skill's documentation.

Sources: [Instruction discovery](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[CLI configuration layers](https://developers.openai.com/codex/config-basic/),
[configuration reference](https://developers.openai.com/codex/config-reference/).

## Cursor

- For personal instructions across projects, use **User Rules** in Cursor's
  **Customize > Rules** interface. Inspect the existing text through available UI
  access, or ask the user to supply it before proposing a merged replacement.
- Official documentation describes `AGENTS.md` in project roots and subdirectories,
  not `~/.cursor/AGENTS.md` as a global instruction file. Do not create that path
  or promise global loading from `~/.cursor/rules/*.mdc`.
- Report conflicts with existing rules without transferring or deleting them.
- When UI editing is unavailable, deliver paste-ready approved text for User Rules
  and request confirmation after the user saves it. Do not claim installation on
  the basis of a prepared text block.
- If the user explicitly wants project scope instead, use the selected project's
  `AGENTS.md` and preserve its existing instructions. Explain that other agents
  reading that file may also be affected. This is not a global Cursor setup.
- Check loading in a fresh Agent chat. For CLI users, verify the CLI's own supported
  instruction route instead of assuming the IDE's User Rules apply. If no verified
  global CLI route is available, leave that client pending or ask for project scope.

Source: [Cursor rules and their scope](https://cursor.com/docs/rules).

## Claude Code

- Use the selected user's `~/.claude/CLAUDE.md` for personal instructions across
  projects, with that exact filename casing. Confirm the effective configuration
  directory if the user has customized it; do not assume a different profile shares
  the current process's home directory.
- Read the existing file and relevant user rules/imports, preserving unrelated
  instructions. Do not replace `settings.json`, change instruction-loading modes,
  or use system-prompt replacement flags to install the policy.
- Newer versions can load project `AGENTS.md` under documented conditions, but this
  setup deliberately uses the documented personal `CLAUDE.md` route. Do not create
  `~/.claude/AGENTS.md`, an import shim, or a symlink for this setup.
- Verify the file under **Memory files** in `/context` in a fresh authorized
  session. Report any managed settings that prevent user-instruction loading.

Source: [Claude Code instruction locations and loading](https://code.claude.com/docs/en/memory).
