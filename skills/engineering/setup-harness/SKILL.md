---
name: setup-harness
description: Set up personal instructions for Codex (app and CLI), Cursor, or Claude Code, with reviewed content, native instruction loading, and no backups or system-prompt replacement.
disable-model-invocation: true
---

# Set up personal harness instructions

Create or update personal instructions through each selected harness's native
mechanism. Keep its built-in system prompt intact. This skill changes only the
selected instruction destinations, leaving configuration and legacy files
unchanged. It requires file-editing access for file targets; no installer or
PowerShell dependency.

## 1. Select harnesses and languages

Ask which harness or harnesses to configure. Offer Codex, Cursor, and Claude Code;
reuse selections already explicit in this request rather than asking again.
Codex is one choice covering the app and CLI, which share user instructions under
the same `CODEX_HOME`. The current host is not an implicit selection. Confirm the
machine/profile when it affects the destination. Default to personal,
cross-project scope.

Ask for the languages used for conversation/reports and code/comments/Git text.
One answer may cover both; reuse explicit choices
made for this setup. Do not infer permanent preferences from the chat's language.

For each selected harness, read its section in
[native destinations](references/harnesses.md) to resolve supported loading and
existing instruction conflicts. For an unlisted harness, verify its official
documentation before proposing a destination.
If its instruction mechanism is unknown, leave that harness pending while working
on the others; do not invent a global `AGENTS.md` path.

**Done:** selected harnesses, languages, scope, and exact destinations are known.

## 2. Inspect and prepare the proposal

1. Read each existing destination and relevant instruction sources. Preserve
   unrelated content and identify conflicts instead of replacing whole files with
   a template. Record a content hash, or absence, for each target; for UI rules,
   retain the current text in the conversation for comparison.
2. Resolve symbolic links or junctions before proposing a write. Show the real
   destination and obtain approval for that target rather than writing through a
   link silently. A directory where a file is expected blocks that target.
3. Read the [policy template](references/operating-policy.md) to draft the shared
   policy. Substitute the two language placeholders and adapt only approved
   preferences. Reconcile existing policy sections rather than appending duplicates.
   Keep harness-specific loading details out of the installed policy.
4. Present the complete proposed text or diff and each exact destination. Explain
   material removals within the instruction text, unresolved conflicts, and the
   supported loading mechanism. State that setup creates **no backups**.
5. Wait for explicit approval of the content and actions for each destination.
   General setup authorization is not approval of unseen text. If declined, revise
   the proposal or leave that target unchanged. No preview files are written into
   harness profiles or repositories before approval.

**Done:** the user approves the exact content and destinations.
**Waiting:** retain proposals in the conversation; independent approved targets may
proceed without treating silence as approval for the others.

## 3. Apply without backups

Re-read every target immediately before editing. If its content, existence, or
resolved path changed since review, reconcile and obtain renewed approval. Create
missing parent directories only for approved file targets. Write only the approved
content using available editing tools, without `.bak` files, backup directories,
or copies of previous versions. An identical destination is a no-op.

For Cursor User Rules, use an available authorized UI integration. If it is not
available, provide the exact approved text and destination for the user to apply;
report this as pending, not installed. Do not edit undocumented application storage
or substitute a project-scoped file for global instructions.

Apply each distinct instruction destination once. Codex's app and CLI do not
require separate writes when they share `CODEX_HOME`. Leave configuration, old
policy files, rules outside the selected destination, and backup archives untouched.

If any operation fails, inspect its actual result before retrying. Report which
destinations changed and which remain pending; do not automatically roll back
other successful targets. With no backups, reversal needs a new reviewed edit,
not a promised restore command.

**Done:** approved targets match the proposal, or partial results are explicitly
identified with the failed operation and next safe action.

## 4. Verify and hand over

- Compare each written file or saved rule with the approved content. Check language
  substitutions, preserved instructions, duplicate policy sections, and the absence
  of new backup artifacts. Check that no unrelated configuration was changed.
- If an existing override or conflicting rule affects loading, report the limitation
  without changing that source or claiming the new instructions are active.
- Report per harness: exact destination, created/updated/unchanged/pending status,
  unresolved conflicts, and file-level versus runtime verification.
- With separate authorization, verify loading in a fresh session using the selected
  client's available instruction/context diagnostics. Otherwise ask the user to
  start one and mark loading unverified. A file write or an agent's self-report is
  not proof of loading or behavioral compliance.

**Done:** requested changes are verified at the available level and remaining
manual actions or runtime checks are explicit. Maintaining this skill does not
authorize configuring the maintainer's active profile; use temporary profiles for
any write tests.
