# Workflow V2

This guide describes the source package, not the instructions currently loaded by an agent. Installing skills, activating a policy, and validating agent behavior are separate operations.

## Instruction ownership

| Layer | Owns | Entry point |
| --- | --- | --- |
| Global policy | Authorization, safety, scope, evidence obligations, communication, Git conventions, and procedure selection | [Operating policy](codex-operating-policy.md) |
| Personal instructions | Language and presentation preferences | [README example](../../../README.md#global-instructions) |
| Project AGENTS.md | Project boundaries, exceptions, documentation home, validation, ownership, tracking tool and work-state agreements | Defined through project evidence and accepted agreements |
| Method skills | Detailed procedures selected for the current need | Entries below |
| Runtime environment | Available tools, schemas, models, permissions, and session paths | Supplied by the host |

A project chooses its tracking arrangement. Team size alone selects neither a service nor a mandatory hierarchy. A small task can use its current record. Git conventions belong to the global policy, not personal preferences.

## Five method skills

| Need | Skill | Conditional detail |
| --- | --- | --- |
| Investigate beyond a direct lookup | [deep-research](../deep-research/SKILL.md) | Evidence dossier and research evaluation |
| Observe an unresolved conception choice | [prototype](../prototype/SKILL.md) | Interface, logic, or feasibility reference |
| Deliver an authorized change | [implement](../implement/SKILL.md) | System documentation |
| Organize or update ongoing work | [work-tracking](../work-tracking/SKILL.md) | Project-owned tracking agreement |
| Plan project outcomes or define agreements | [plan-project](../plan-project/SKILL.md) | Project agreements |

These skills are not mandatory sequential phases. A defined change can go directly to implement. A narrow fact check needs no research dossier. Documentation-only work uses implement's documentary branch.

TDD is embedded in implement. Current system documentation is its conditional reference, not a sixth skill. Plan-project handles project discovery and agreements; setup-project is not part of this package. The prototype procedure is authored here and does not require loading a third-party prototype skill.

## Availability and activation

The [setup-codex entry](SKILL.md) is the installation entry point for the five methods and the global policy. It installs and verifies the methods from an approved complete checkout before activating the policy. A standalone copy needs that source checkout supplied explicitly; it neither embeds duplicate procedure sources nor downloads an unreviewed revision.

Existing identical skills remain intact; replacing different content requires explicit approval and a backup. Resolve duplicate names and linked paths before activation. Personal and project agreements remain outside this installer. The [installer template](codex-operating-policy.md) is the global policy's source; review copies are not additional runtime instructions.

Project agreements are prepared from the actual project and user decisions, not a universal filled-in template. Tool access and external writes need their own authorization.

## Review

Use the [evaluation cases](evaluation.md) to check routing, boundaries, and evidence. A document audit establishes coverage and consistency, not reliable behavior across agents or applications. Record actual trials separately from prepared cases and static checks.
