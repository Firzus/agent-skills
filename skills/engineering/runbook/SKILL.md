---
name: runbook
description: Write an interactive bash runbook that guides a person through actions only they can take, such as copying credentials from a third-party dashboard, configuring CI secrets, or approving a migration or cutover. Use when a task is blocked on manual steps in someone's browser or accounts; not for steps the agent can run itself.
---

# Runbook

A runbook is a bash script the user runs to finish a procedure that needs their
hands: it opens the right page, numbers each action, collects the values they
copy, stores them (env file, GitHub secrets or variables), asks before
irreversible commands, and ends with a summary of what was saved and what is
left to do. It covers only what needs the user's hands or accounts: do
everything else yourself before or after it.

Start from [template.sh](template.sh). It has three sections:

| Section | Your part |
| --- | --- |
| `LIBRARY` | Leave unchanged, so every runbook behaves the same |
| `TEXT` | Translate the interface strings into the user's communication language |
| `STAGES` | Write this procedure |

The user's communication language is the one their instructions set for
conversation, otherwise the language they write to you in. Everything the
runbook displays uses it; code, comments, variable names, and commands stay in
the project's code language.

A runbook is disposable unless the user wants a repeatable path: write it to a
scratch location or the project's `scripts/` folder, as they prefer.

## 1. Plan the stages

1. Collect the facts from the project before asking anything:
   - setup work: env files and their examples, the README, container and
     framework configuration, and CI workflows, whose `secrets.*` and `vars.*`
     references name values the runbook must produce;
   - a migration or cutover: where the system stands, where it must end up,
     and every irreversible command on the way.
2. Order the stages by dependency, and settle for each the value it produces,
   its destination (env file, GitHub secret or variable, a command, or none),
   and whether it is secret. Ask the user only what the project cannot settle.

**Done:** every value has a source, a destination, and a secrecy decision.

## 2. Trace each stage

For each stage, write the route a person follows: the page to open, the
controls to use, where the value appears, and the variable it fills. Take the
route from the provider's current documentation or from the user. When neither
can confirm it, describe the goal instead of guessing controls, mark the stage
with `warn` saying the interface may differ, and list it in the handoff.

**Done:** every stage has a confirmed route or an explicit warning.

## 3. Write the runbook

1. Copy `template.sh` to the chosen path.
2. Unless the communication language is English, translate every `TXT_*`
   value. Strings containing `%s` are printf formats: keep each `%s` in the
   order its comment gives and each `\n`, write a literal `%` as `%%`, and
   phrase the string so it reads correctly whatever fills `%s`. Use the
   language's yes answer in `TXT_YES_NO` and the `TXT_YES` regex (French:
   `[o/N]`, `^[OoYy]`). Keep `TXT_SECRETS` and `TXT_VARS` short: the summary
   aligns on the longest label.
3. Replace the example stages, in dependency order, with text in the same
   language. Quote third-party interface labels exactly as displayed, even in
   another language. `TOTAL_STAGES` must equal the count of `stage` calls; give
   `banner` a title and a one-sentence purpose.

| Helper | Effect |
| --- | --- |
| `stage "Name"` | New screen with progress and the stage name |
| `say "..."` | Short explanation of why the stage matters |
| `step "..."` | One numbered action |
| `note "..."` / `warn "..."` | Secondary detail / something not to miss |
| `code "..."` | A URL, command, or value to copy, on its own unwrapped line |
| `open_url URL` | Opens the page the following steps use |
| `ask KEY "Label"` / `ask_secret KEY "Label"` | Reads a visible / hidden value into `$KEY`; on a re-run, Enter keeps the saved value |
| `write_env KEY "$KEY"` | Saves the value to the env file |
| `set_secret NAME "$VALUE"` / `set_var NAME "$VALUE"` | Sets a GitHub Actions secret / variable, or lists it for manual follow-up |
| `run CMD [ARG...]` | Shows and runs a command; a dry run only shows it |
| `confirm "Question"` | Yes/no gate that defaults to no |
| `pause ["Message"]` | Waits for Enter |

Rules:

- Call `open_url` before the steps that use the page.
- Put every URL, command, or value to copy in `open_url` or `code`, never
  inside wrapped text, so it stays whole.
- Read every secret with `ask_secret`; save with `write_env` only what the
  project uses locally.
- Use `set_secret` and `set_var` only for names CI reads.
- Execute every command with side effects through `run`, so `--dry-run`
  stays harmless.
- Precede each irreversible `run` with `confirm`, worded so that no is the
  safe answer.
- Give each stage one task and end it with `pause`; the next `stage` clears
  the screen.

**Done:** every planned value is collected and reaches its destination.

## 4. Check the script

Run these checks with the user's bash; on Windows, that is the Git Bash
executable (usually `C:\Program Files\Git\bin\bash.exe`).

1. `bash -n <script>`, plus `shellcheck <script>` when installed.
2. Rehearse: from an empty temporary folder, pipe one line per prompt into
   `bash <script> --dry-run`, including a blank line for each Enter (every
   `pause`, and the banner's). Input that ends early stops the runbook. A dry
   run opens no browser, saves nothing, skips GitHub, and runs no `run`
   command. Check that each answer reaches the intended prompt (piped answers
   are echoed in the transcript; secrets show only their length) and that the
   summary lists the expected names. Only the user runs the runbook without
   `--dry-run`.
3. Check that each `set_secret` name matches a `secrets.*` reference in CI,
   and each `set_var` name a `vars.*` reference.
4. `chmod +x <script>`.

**Done:** every check passes.
**Pending:** if bash is unavailable to you, report checks 1, 2, and 4 as not
run, then hand off with the bash path marked unverified and `chmod +x` added
for the user.

## 5. Hand off

Give the user, in their language, one complete command to paste unchanged: the
real run, since your rehearsal already previewed every screen. The command
first moves to the project root, since the env file path is relative to it,
then calls the script by absolute path. On Windows, call the Git Bash
executable you verified rather than `bash`, which PowerShell often resolves to
WSL, and stop if the folder change fails:

```powershell
Set-Location -LiteralPath "C:\path\to\project" -ErrorAction Stop; & "C:\Program Files\Git\bin\bash.exe" "C:\path\to\project\scripts\setup-runbook.sh"
```

Also list any stage marked with `warn` in step 2. For a disposable runbook,
tell the user to delete it after the real run, or offer to delete it once they
confirm it is done. For a repeatable one, offer to link it from the README.

**Done:** the user has the command and the list of unverified stages.
