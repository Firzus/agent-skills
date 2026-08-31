---
name: slop-audit
description: >-
  Audit a codebase for dead code and AI slop, clear each suspect against the
  legitimate reason it exists, and remove only what the evidence carries.
disable-model-invocation: true
---

# Slop Audit

Find code that should not exist — **dead code** that no longer runs, and
**slop** that runs and earns nothing — then prove each candidate before
touching it. The product of a run is a ranked report with the evidence
attached; removal follows the user's approval, one deletion per commit.

## Two problems, two epistemics

Keep them apart at every stage. Auditing them in one pass is the error that
produces confident wrong deletions.

| | Dead code | Slop |
| --- | --- | --- |
| Question | Is this **reachable**? | Should this **exist in this form**? |
| Decided by | Reference graphs, call graphs, runtime evidence | Reading the code |
| Core | Decidable, with documented blind spots | No decidable core |
| Terminates in | A removal backed by evidence | A ranked report for a human |

**No tool decides deadness.** Each one decides a *decidable approximation* of
it, and the identity of that approximation — never the tool's confidence score
— determines whether removal is safe. Perfect detection reduces to the halting
problem, so every tool is either unsound for deletion or incomplete.

**Authorship is not the defect.** No detector of LLM-written source exists, and
every pattern in this skill is abundantly present in human-written code. Report
the defect and the rule it violates; leave authorship out of the finding.

## Vocabulary

- A **suspect** is a raw tool hit or a read observation. It is not yet a
  finding.
- To **exonerate** a suspect is to find the legitimate mechanism that keeps it
  alive or earns its shape. Every signal has an exoneration list, and clearing
  that list is the whole work of the audit.
- A **candidate** is a suspect whose exonerations were checked and none applied.
  Only candidates reach the report.
- The **root set** is the declared entry points reachability is measured from.
  "Unreachable" is a function of the root set, so it is a configuration
  artifact, not a property of the code.
- **Blast radius** is what breaks if the candidate was alive after all, and
  whether that break is **loud** (a failing build) or **silent** (a runtime
  failure on a rare path, months later).

## 1. Scope

Three decisions, made before any tool runs, because each one changes what the
output means.

**Closed world or open world.** In a closed world (application, service, game)
every entry point lives in the repo or its deploy config, and an unreferenced
symbol is a candidate. In an open world (library, SDK, plugin, published
package) the exported surface *is* the product: zero in-repo callers is the
expected state of the entire public API, and a reachability tool measures
nothing but the density of its own examples. A monorepo is open-world per
published package boundary. Establish this first; it changes the answer more
than any tool setting.

**The root set, written down.** Enumerate every entry point before scanning:
`package.json` `bin` and `scripts`, `[project.scripts]`, `[[bin]]`,
Dockerfile `CMD`/`ENTRYPOINT`, CI workflows, Terraform and Kubernetes manifests,
serverless handlers, crontabs, route and task decorators, test discovery roots.
A missing entry does not produce one false positive: it cascades, and every
file it reaches, every export in those files, and every dependency only they
used all report as dead.

**Exclusions and reach.** Generated output and its input schemas, vendored and
third-party trees, and test trees leave the reachability query. Then choose the
reach: a diff-scoped audit has an owner for every finding, while a repo-wide
audit produces hundreds of ownerless ones. Prefer the diff, and weight the rest
toward code that keeps changing.

**Done when** a scope note names the world, lists the root set, and lists the
excluded trees.

## 2. Detect

Read [`signals.md`](signals.md) and collect suspects against it. It carries
the signal table — detection procedure, what a hit proves, the exoneration
list, and the evidence grade — plus what each detector is structurally unable
to see.

Run whatever the repository already has before installing anything: its linter,
its compiler warnings, its analyzers, its coverage. Record the exact command
and configuration next to every hit, because a finding is only ever "unused
within the set I analyzed."

Alongside the tools, read for the shapes no tool encodes: a wrapper that only
forwards, a second implementation of an existing repository utility, a path
left wired after a mid-task change of approach, a test whose assertions touch
only mocks. These are where slop concentrates, and compilers report none of
them.

**Done when** every suspect carries its signal, its detection command, and its
evidence grade.

## 3. Exonerate

The heart of the audit. Read [`false-positives.md`](false-positives.md) and
work each suspect against it: twelve mechanisms that keep statically
unreferenced code alive, each with the grep recipe that finds it and the check
that clears it. Unity and C# have their own section there, because engine
wiring defeats .NET static reachability in ways no analyzer reports.

Two moves carry most of the weight, and both are free:

- Search the symbol as a **bare string literal** across the whole repository,
  including untracked and ignored files, data, config, templates, and
  serialized assets: `git grep --untracked --no-exclude-standard 'Symbol'`.
- Search the **mechanism**, not the symbol: `getattr(`, `importlib`,
  `Class.forName`, `Type.GetType`, `Activator.CreateInstance`, `obj[name]`,
  `.send(`, DI registrations, assembly scans. A name assembled at runtime from a
  prefix and a variable is unresolvable statically, and that ends the enquiry.

Grade what survives. **A** and **B** signals may carry a removal proposal.
**C** signals produce a question for the author. **D** signals — anything
resting on tone or style — are reported at most, never acted on.

**Done when** every suspect is either dismissed with the exoneration that
cleared it, or promoted to a candidate carrying: files, signal, what the signal
proves, the exonerations checked, evidence grade, and blast radius with its
loud/silent classification. A candidate that does not name the exonerations it
cleared is not a finding.

## 4. Present

Invoke the `canvas` skill and render the audit as a **living artifact** — one
file, kept for the whole run, updated in place at every stage below. Where the
repository keeps a domain glossary (`CONTEXT.md`), name things with its
vocabulary.

One card per candidate:

- **Files**: the exact locations.
- **Signal**: what fired, with the command that produced it.
- **Proves**: the bounded claim the signal supports.
- **Cleared**: the exonerations checked and why none applied.
- **Blast radius**: what breaks if this was alive, loud or silent.
- **Verdict**: `Remove`, `Consolidate`, `Migrate`, or `Ask`.
- **Status badge**: every candidate starts at `Proposed`.

Duplication is a `Consolidate` verdict, never a `Remove`: extract the shared
behaviour, redirect every call site, and the originals then become ordinary
unreferenced symbols with established provenance. A superseded implementation
still serving traffic is `Migrate` — an incomplete migration, not a deletion.

Order the cards by evidence grade, then by blast radius ascending, so the
cheapest and safest work reads first. End with a **Top recommendation**, then
ask the user which candidates to run. Work starts on a pick.

## 5. Remove

For each approved candidate, read [`deletion.md`](deletion.md) and climb its
verification ladder until the evidence matches the blast radius. Rungs 1–4 are
free and offline; run all four every time. Public surface switches the work to
a deprecation cycle, which the audit proposes rather than performs.

Land each logical deletion as its **own commit**, with a message recording
which searches ran and what they returned, so a revert is one command and the
evidence survives in history. Delete outright rather than commenting out: git
already keeps the content, while a commented block keeps the reading cost and
loses compiler checking.

Independent candidates with disjoint files may run as parallel sub-agents, each
given the candidate card, the ladder rungs required, and the instruction that
everything outside its files is out of bounds. Overlapping scopes run in
sequence.

Verify from the main thread before marking anything done: re-read the diff,
re-run the build and tests, and confirm the scope held. A sub-agent's claim is
not the evidence. Passed: flip the badge to `Verified` and record the outcome.
Failed or scope drifted: flip to `Blocked` with the reason, then re-dispatch or
surface the decision.

**Done when** every approved candidate reads `Verified` or `Blocked` on the
canvas, and the closing message links the canvas with a one-line summary per
candidate.

## Standing guardrails

- **Trust boundaries are protected.** Validation, authorization, error handling
  that prevents data loss, and accessibility affordances stay, however
  redundant they look. The same null check is noise in a private helper and
  mandatory at a process, network, file, plugin, or FFI edge.
- **Deprecation, compatibility, migration, rollback, and disaster-recovery
  paths stay** until a dated statement says the window closed. They are the
  highest-cost false positives: silent at build time, silent in tests, and
  catastrophic on the one day they were written for.
- **Generated output and vendored trees stay.** Reduce them at the schema or
  the dependency, or leave them alone.
- **Baseline against the repository.** Churn, comment density, duplication, and
  function length are interpretable only as percentiles of the surrounding
  code.
