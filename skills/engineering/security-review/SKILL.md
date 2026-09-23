---
name: security-review
description: Perform source-only security audits of codebases, APIs, services, and applications. Use for security questions, focused vulnerability reviews, or explicitly requested full audits.
---

# Audit security boundaries in source

Find vulnerabilities with a concrete trust-boundary failure and give owners evidence and a narrow fix. Delegate every audit to a subagent; the parent verifies findings and owns the report. This skill does not establish runtime behavior or authorize fixes, external probes, publication, or deployment.

## 1. Set the boundary

Read the request, instructions, repository state, architecture, and relevant controls. Identify the reviewed revision, paths, assets, lower-trust principals, and intended security boundaries. Include local changes only when requested. Keep a named concern focused; expand to a codebase-wide audit only when explicitly requested or report artifacts are required. Do not assume controls in unseen deployment infrastructure.

**Done:** scope and evidence limits are explicit; ask before a consequential expansion.

## 2. Delegate and investigate

1. Give a leaf subagent the revision, assigned surfaces and paths, boundaries, requirements, read-only limits, and expected evidence. For each surface, require paths read, control traced, source locations, and status `reviewed`, `candidate`, `blocked`, or `not reviewed`, with reasons for gaps. It returns candidates, rejected claims, and validation gaps; it cannot edit, publish, or delegate further. Split broad scope into bounded assignments. If delegation is unavailable, report the audit pending rather than replacing it with a parent-only review.
2. Trace each candidate from lower-trust input or authority through controls and callers to the affected principal or resource. Record preconditions, exact locations, and concrete result. Check upstream and framework controls before claiming absence; do not infer unseen deployment behavior. The parent rechecks consequential claims and returned coverage against the current source. An absent or unsupported assignment is not covered; scanner output or a missing best practice is not a finding by itself.
3. Read source and existing, revision-matched test or scan results only. Do not run the application, builds, tests, scripts, fixtures, target-controlled tools or configuration, or CI jobs; do not probe deployed systems, access other users' data, or install dependencies. Treat existing results as prior evidence, not checks run by this audit. When runtime proof is needed, give the owner the missing observation and a bounded validation plan.

**Done:** every assigned surface has supported status or an explicit gap; no target code was executed.

## 3. Decide and report

Classify examined candidates as confirmed, rejected with a reason, or `needs validation` with the decisive missing fact and safe next step. A candidate left unexamined because work stopped remains pending, not `needs validation` or a finding. Deduplicate root causes while retaining affected entry points.

Report the revision, source-only method, inspected surfaces, blocked and unreviewed work, out-of-scope areas, findings, and remaining validation. Pending candidates or consequential coverage gaps make the audit incomplete. Each confirmed finding needs an ID, file and line, attacker and preconditions, boundary path and result, impact-based severity, and the smallest fix with a regression-check suggestion. Give no severity to unconfirmed claims. Distinguish source evidence from pre-existing test results and unobserved runtime facts. "No findings" means none confirmed in the stated coverage, not that the system is secure.

**Done:** the parent verifies claims and coverage, then returns the report without editing source or publishing artifacts.
