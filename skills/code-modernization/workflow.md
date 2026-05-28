# Code Modernization Workflow

Run the phases in order unless the user asks for a narrower slice. Each phase
produces artifacts that the next phase can audit.

## 1. Assess

Goal: understand the system before proposing a migration.

Capture:

- Languages, frameworks, runtimes, dependency manifests, build system.
- Source size by language, file count, and complexity hotspots.
- Data stores, copybooks, schemas, ORM mappings, flat files, queues, APIs, jobs,
  screens, and scheduler entry points.
- Existing tests, docs, comments, runbooks, and coverage signals.
- Technical debt: dead code, duplication, god modules, deprecated APIs,
  hardcoded config, missing error handling.
- Security posture: auth, input validation, secrets, dependency CVEs, sensitive
  data exposure.
- Optional runtime signals: key job or route latency, failure rate, high-variance
  paths, and operational pain points if telemetry is available.

Write `analysis/<system>/ASSESSMENT.md` and
`analysis/<system>/ARCHITECTURE.mmd`.

## 2. Map

Goal: build a topology that prevents accidental breakage.

Extract:

- Module call graph, including dispatcher, router, framework, reflection, and
  dependency-injection edges where possible.
- Data lineage from modules to data stores, joined through deployment or runtime
  configuration when source code does not contain physical store names.
- Entry points from deployment descriptors, route files, job definitions,
  scheduler config, transactions, queues, or `main()` functions.
- Dead-end candidates only after entry points and dynamic call targets have been
  considered.
- One critical business flow in execution order.

For fixed-column languages such as COBOL or RPG, parse the code area and ignore
sequence numbers and comments before pattern matching.

Write a re-runnable extractor under `analysis/<system>/`, a machine-readable
`topology.json`, standalone `.mmd` diagrams, and a rendered
`analysis/<system>/TOPOLOGY.html`.

## 3. Extract Rules

Goal: separate business intent from legacy implementation mechanics.

Prioritize:

- Calculations: rates, fees, taxes, scores, balances, aggregates, rounding.
- Validations and eligibility: required fields, limits, cross-field checks,
  authorization, pass/fail outcomes.
- Lifecycle and state: status fields, transitions, triggers, side effects.
- Policies: cutoffs, retries, retention, compliance, data-integrity rules.

Skip infrastructure, logging, pooling, UI layout, and technical retries unless
they encode a real business policy.

Write `analysis/<system>/BUSINESS_RULES.md` and
`analysis/<system>/DATA_OBJECTS.md`.

## 4. Brief

Goal: create the human-approved modernization plan before building.

Read the assessment, topology, and business rules first. If any are missing,
stop and ask to run discovery before planning transformation.

Write `analysis/<system>/MODERNIZATION_BRIEF.md` with:

- Objective and target stack or architecture recommendation.
- End-state architecture and legacy-to-target component mapping.
- Phased strangler-fig sequence with entry and exit criteria.
- Behavior contract built from high-priority business rules.
- Validation strategy per phase.
- Open SME questions and approval block.

Pause after presenting the brief. Do not transform code until the user approves.

## 5. Reimagine

Goal: rebuild from extracted intent, not from legacy structure.

Use when the target is a greenfield architecture. Produce:

- `analysis/<system>/AI_NATIVE_SPEC.md` with capabilities, domain model,
  interface contracts, non-functional requirements, and behavior contract.
- `analysis/<system>/REIMAGINED_ARCHITECTURE.md` after adversarial architecture
  review.
- `modernized/<system>-reimagined/` scaffolds for approved services, capped to a
  tractable set unless the user asks to expand.
- Acceptance tests for behavior-contract rules, marking unimplemented rules as
  pending instead of deleting them.
- `modernized/<system>-reimagined/CLAUDE.md` or equivalent handoff notes if the
  target agent ecosystem uses persistent repo context.

Use human checkpoints after specification mining and architecture review.

## 6. Transform

Goal: rewrite one module with proof of behavior equivalence.

Before writing target code:

- Read the source module and applicable Rule Cards.
- Present scope, target module structure, behaviors covered, test strategy, and
  ambiguities.
- Wait for approval.

Then:

1. Write characterization tests first under `modernized/<system>/<module>/`.
2. Implement idiomatic target code from the specification, not by mirroring
   legacy paragraph or variable structure.
3. Run the relevant tests if the target project provides a runnable command.
4. Write `TRANSFORMATION_NOTES.md` mapping legacy behavior to target behavior,
   documenting deliberate deviations and unmigrated dead code.
5. Review the result through the `architecture-critic` lens and apply high-risk
   feedback.

## 7. Harden

Goal: reduce risk in legacy code that remains live during migration.

Scan for injection, auth weakness, access control gaps, sensitive data exposure,
insecure deserialization, dependency CVEs, secrets, unsafe file paths, and
security misconfiguration.

Write `analysis/<system>/SECURITY_FINDINGS.md` and draft Critical/High fixes as
`analysis/<system>/security_remediation.patch`. Do not edit `legacy/` directly.
Review the patch against the original code before asking the user to apply it.
