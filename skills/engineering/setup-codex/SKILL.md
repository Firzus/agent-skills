---
name: setup-codex
description: Legacy Codex setup entry point. Use setup-harness for reviewed user instructions shared by the app and CLI, without backups or system-prompt replacement.
disable-model-invocation: true
---

# Continue with setup-harness

The setup workflow and policy now belong to
[setup-harness](../setup-harness/SKILL.md). This entry point remains discoverable
for users of the former `setup-codex` skill; it no longer installs a separate
policy or runs a harness-specific installer.

When invoked, read `setup-harness` and use Codex as the requested harness unless
the user names additional tools. Codex covers the app and CLI as one setup target
per `CODEX_HOME`. Follow its language, preview, approval, and verification steps.
If that skill is unavailable in the installed collection, ask the user to install
or provide it and stop without changing the profile. Do not install it
automatically or revive the former workflow.

The old `scripts/setup-codex.ps1` entry point now fails without writing and
names the replacement skill. Neither this entry point nor `setup-harness` removes
old settings or policy files.

## Policy template

The shared [personal policy template](../setup-harness/references/operating-policy.md)
is reviewed during `setup-harness`, not installed by this legacy entry point.
