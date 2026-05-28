# Modernization Templates

Use these compact templates for consistent artifacts. Add stack-specific
sections only when they materially help the migration.

## `ASSESSMENT.md`

```markdown
# <System> Modernization Assessment

## Executive Summary
<What the system does, how risky it is, and the headline recommendation.>

## System Inventory
| Area | Evidence |
|---|---|
| Languages | <language + source evidence> |
| Build/runtime | <manifests, scripts, runtime versions> |
| Data stores | <schemas, copybooks, tables, files> |
| Integrations | <APIs, queues, jobs, screens, reports> |
| Tests | <test files or absence signal> |

## Architecture At A Glance
<Domain table and link to ARCHITECTURE.mmd.>

## Runtime Profile
<Telemetry if available, otherwise state the gap.>

## Technical Debt
| Rank | Finding | Evidence | Modernization impact |
|---|---|---|---|

## Security Findings
| Severity | CWE | Finding | Evidence |
|---|---|---|---|

## Documentation Gaps
<Top undocumented behavior or subsystem gaps.>

## Scope And Risk Signals
<LOC, complexity hotspots, coupling, test coverage, dependency freshness.>

## Recommended Modernization Pattern
<Rehost, replatform, refactor, rearchitect, rebuild, or replace, with rationale.>
```

## Rule Card

```markdown
### RULE-NNN: <plain-English name>
**Category:** Calculation | Validation | Lifecycle | Policy
**Priority:** P0 | P1 | P2
**Source:** `path/to/file.ext:line-line`
**Plain English:** <One sentence a business analyst would recognize.>
**Specification:**
  Given <precondition with concrete values>
  When <trigger>
  Then <outcome>
  And <additional outcome, if needed>
**Parameters:** <constants, rates, thresholds, formats, limits>
**Edge cases handled:** <edge cases>
**Suspected defect:** <optional legacy behavior that may need a preserve-vs-fix decision>
**Confidence:** High | Medium | Low — <reason; SME question if not High>
```

Priority guide:

- `P0`: moves money, enforces compliance, authorization, or data integrity.
- `P1`: important business behavior but not a launch blocker by itself.
- `P2`: display, formatting, convenience, or low-risk policy behavior.

## `BUSINESS_RULES.md`

```markdown
# <System> Business Rules

## Summary
| ID | Name | Category | Priority | Source | Confidence |
|---|---|---|---|---|---|

## Rules
<Rule Cards grouped by category.>

## Rules Requiring SME Confirmation
| Rule | Question | Why it matters |
|---|---|---|
```

## `DATA_OBJECTS.md`

```markdown
# <System> Data Objects

| Object | Fields | Source | Consumed by rules | Produced by rules |
|---|---|---|---|---|
```

## `MODERNIZATION_BRIEF.md`

```markdown
# <System> Modernization Brief

## Objective
<From what, to what, and why.>

## Target Architecture
<Mermaid C4/container-style diagram or equivalent text diagram.>

| Legacy component | Target component | Notes |
|---|---|---|

## Phased Sequence
| Phase | Scope | Entry criteria | Exit criteria | Risks | Mitigation |
|---|---|---|---|---|---|

## Behavior Contract
<P0 Rule Cards that must be proven equivalent before release.>

## Validation Strategy
<Characterization, contract, dual-run diff, property-based tests, UAT.>

## Open Questions
- [ ] <Decision needed before transformation.>

## Approval Block
Approved by: ________________
Approval covers: Phase 1 only | Full plan
```

## `TRANSFORMATION_NOTES.md`

```markdown
# <Module> Transformation Notes

## Scope
<Legacy files and target files.>

## Behavior Mapping
| Legacy behavior | Legacy source | Target implementation | Test coverage |
|---|---|---|---|

## Deliberate Deviations
| Legacy behavior | New behavior | Rationale | Approved by |
|---|---|---|---|

## Not Migrated
| Item | Reason | Evidence |
|---|---|---|

## Follow-Ups
- <Dependencies or next modules.>
```

## `SECURITY_FINDINGS.md`

```markdown
# <System> Security Findings

## Summary
| Severity | Count |
|---|---|

## Findings
| ID | CWE | Severity | Location | Exploit scenario | Fix |
|---|---|---|---|---|---|

## Dependency CVEs
| Package | Installed | CVE | Fixed version | Source |
|---|---|---|---|---|

## Remediation Log
| Finding | Patch hunk | Summary |
|---|---|---|

## Patch Review
| Patch hunk | Verdict | Reason |
|---|---|---|
```
