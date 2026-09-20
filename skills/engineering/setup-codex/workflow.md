# Workflow V2

This guide describes the source package, not the instructions currently loaded by an agent. Installing skills, activating a policy, and validating agent behavior are separate operations.

## Instruction ownership

| Layer | Owns | Entry point |
| --- | --- | --- |
| Global policy | Authorization, safety, scope, evidence obligations, communication, Git conventions, and procedure selection | [Operating policy](codex-operating-policy.md) |
| Personal instructions | Language and presentation preferences | [README example](../../../README.md#global-instructions) |
| Project AGENTS.md | Project boundaries, exceptions, validation, ownership, Linear context, work-state agreements, and documentary entry points | Defined through project evidence and accepted agreements |
| Project CONTEXT.md | Domain definitions and useful distinctions | Root glossary, maintained with manage-project |
| Project docs/systems | Current system responsibilities, interactions, constraints, sources, and verification | System pages, maintained with implement |
| Method skills | Detailed procedures selected for the current need | Entries below |
| Runtime environment | Available tools, schemas, models, permissions, and session paths | Supplied by the host |

Linear owns project work for solo and group projects; GitHub owns code, PRs, reviews, and CI. Link them without maintaining a second backlog. Keep organization lightweight: no compulsory initiative, cycle, or new issue for a simple question. Project agreements identify destinations, native states, and authorized actions. Git conventions belong to the global policy, not personal preferences.

## Four method skills

| Need | Skill | Conditional detail |
| --- | --- | --- |
| Investigate beyond a direct lookup | [deep-research](../deep-research/SKILL.md) | Evidence dossier and research evaluation |
| Observe an unresolved conception choice | [prototype](../prototype/SKILL.md) | Interface, logic, or feasibility reference |
| Deliver an authorized change | [implement](../implement/SKILL.md) | System documentation and its template |
| Plan, track, or establish project agreements | [manage-project](../manage-project/SKILL.md) | Planning, tracking, agreements, and vocabulary |

These skills are not mandatory sequential phases. A defined change can go directly to implement. A narrow fact check needs no research dossier. Documentation-only work uses implement's documentary branch.

TDD is embedded in implement. System documentation is its conditional reference, not another skill. Manage-project selects the required procedure: a status update does not rerun planning, and an agreements-only change does not create a backlog. The Linear plugin supplies operations and current schemas, not a duplicate method manual. The prototype procedure is authored here and does not require a third-party prototype skill.

## Documentary contracts

Every project has a root CONTEXT.md, even if its vocabulary is minimal. Use manage-project's [vocabulary procedure](../manage-project/references/vocabulary.md) and [template](../manage-project/templates/CONTEXT.md). Keep definitions and useful distinctions there; link detailed rules to their owning system page.

System pages live in `<project>/docs/systems`. Use implement's [documentation procedure](../implement/references/system-documentation.md) and [template](../implement/templates/system.md); add sections only when risks justify them. Read and maintain relevant terms and pages for the current work rather than load the whole corpus. An unrelated narrow task reports missing documents without silently becoming project setup.

## Availability and activation

The [setup-codex entry](SKILL.md) is the installation entry point for the four methods and the global policy. It installs and verifies the methods, references, and templates from an approved complete checkout before activating the policy. A standalone copy needs that source checkout supplied explicitly; it neither embeds duplicate procedure sources nor downloads an unreviewed revision.

Existing identical skills remain intact; replacing different content requires explicit approval and a backup. Resolve duplicate names, conflicting discovered procedures, and linked paths before activation. The script leaves all other skill directories untouched. Personal and project agreements remain outside this installer. The [operating policy](codex-operating-policy.md) is the authoritative prompt source; review copies are not additional runtime instructions.

Project agreements are prepared from the actual project and user decisions, not a universal filled-in template. Tool access and external writes need their own authorization.

## Review

Use the [evaluation cases](evaluation.md) to check routing, boundaries, and evidence. A document audit establishes coverage and consistency, not reliable behavior across agents or applications. Record actual trials separately from prepared cases and static checks.
