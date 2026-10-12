---
name: setup-cursor
description: Legacy Cursor setup entry point. Use setup-harness for reviewed personal instructions without backups or system-prompt replacement.
disable-model-invocation: true
---

# Continue with setup-harness

The setup workflow and policy now belong to
[setup-harness](../setup-harness/SKILL.md). This entry point remains discoverable
for users of the former `setup-cursor` skill; it no longer installs a separate
policy or runs a harness-specific installer.

When invoked, read `setup-harness` and use Cursor as the requested harness unless
the user names additional tools. Follow its language, preview, approval, and
verification steps. If that skill is unavailable in the installed collection,
ask the user to install or provide it and stop without changing the profile.
Do not install it automatically or revive the former workflow.

The old `scripts/setup-cursor.ps1` entry point now fails without writing and
names the replacement skill. Neither this entry point nor `setup-harness` removes
old settings or policy files.

## Policy template

The shared [personal policy template](../setup-harness/references/operating-policy.md)
is reviewed during `setup-harness`, not installed by this legacy entry point.
