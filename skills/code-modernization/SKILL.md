---
name: code-modernization
description: >-
  Guides modernization of legacy codebases while preserving behavior. Use when
  the user asks to modernize legacy code, migrate COBOL, legacy Java, C++,
  .NET, procedural PHP, classic ASP, or monolith systems; extract business
  rules; replatform, refactor, rewrite, or rebuild a legacy module; apply a
  strangler fig migration; or harden legacy code before migration.
---

# Code Modernization

Use this skill for structured legacy modernization. Do discovery before
rewrites, preserve behavior by default, and keep every recommendation tied to
source evidence.

## When To Use

Use this skill when the work involves:

- Understanding a legacy system before changing it.
- Mapping dependencies, call graphs, data lineage, or entry points.
- Extracting calculations, validations, policies, or lifecycle rules from code.
- Creating a modernization brief or migration sequence.
- Transforming one legacy module into a target stack.
- Reimagining a system from extracted intent rather than line-by-line porting.
- Security hardening legacy code that will keep running during migration.

Do not use it for ordinary small refactors in actively maintained code unless
the user explicitly frames the task as modernization or behavior-preserving
migration.

## Workspace Layout

Default to this layout unless the user gives another one:

```text
legacy/<system>/       # existing system; read-only by default
analysis/<system>/     # discovery artifacts, diagrams, specs, findings
modernized/<system>/   # transformed modules or new implementation
```

If the legacy code lives elsewhere, ask whether to adapt paths or have the user
provide a symlink/copy. Never edit `legacy/` directly unless the user explicitly
approves that exact change. Prefer writing remediation patches under
`analysis/<system>/`.

## Core Workflow

Follow this sequence:

```text
assess -> map -> extract-rules -> brief -> reimagine | transform -> harden
```

- **Assess**: inventory size, stack, architecture, dependencies, debt, security
  posture, and operational risk signals.
- **Map**: build topology, call graph, data lineage, entry points, and one
  critical business path.
- **Extract rules**: turn embedded business logic into testable Rule Cards.
- **Brief**: synthesize an approved modernization plan with behavior contract
  and human decision points.
- **Reimagine**: design and scaffold a greenfield target system from extracted
  intent.
- **Transform**: rewrite one module with characterization tests that prove
  behavior equivalence.
- **Harden**: audit legacy security and draft reviewable remediation patches.

Read [workflow.md](workflow.md) for phase details and expected artifacts.

## Operating Rules

- Read before judging. Legacy code may be strange because it encodes real
  production constraints.
- Cite claims with repo-relative `file:line` evidence whenever possible.
- Separate facts from inference. Mark uncertain conclusions and ask SME
  questions for unresolved behavior.
- Preserve behavior first. Bug fixes and policy changes require explicit human
  decisions.
- Use subagents for specialist passes when available. If not, run the same
  lenses as separate manual passes.
- Do not invent schedules. Use LOC, complexity, dependency freshness,
  coupling, test coverage, and security findings as scope/risk signals.
- Pause for approval before writing transformed code or applying security
  remediations.

## Specialist Lenses

Use the roles in [agents.md](agents.md):

- `legacy-analyst` for structure, dependencies, and system behavior.
- `business-rules-extractor` for domain rules and Given/When/Then specs.
- `architecture-critic` for target architecture and transformed code review.
- `security-auditor` for OWASP/CWE/CVE, secrets, injection, auth, and data
  exposure.
- `test-engineer` for characterization, contract, and equivalence tests.

## Output Formats

Use [templates.md](templates.md) for:

- `analysis/<system>/ASSESSMENT.md`
- `analysis/<system>/TOPOLOGY.html` and `.mmd` diagrams
- `analysis/<system>/BUSINESS_RULES.md`
- `analysis/<system>/DATA_OBJECTS.md`
- `analysis/<system>/MODERNIZATION_BRIEF.md`
- `modernized/<system>/<module>/TRANSFORMATION_NOTES.md`
- `analysis/<system>/SECURITY_FINDINGS.md`

Keep the chat summary concise: what was produced, where it lives, key blockers,
and the next approval decision.
