---
name: improve-codebase
description: >-
  Use when asked to remove dead code, AI slop, or tests that protect nothing
  (such as a suite grown through test-driven development); to find and apply
  refactors that make changes cheaper; or to replace a system that misses a
  measurable target such as speed or memory. Not for reviewing one change
  (code-review), a bug or a recent performance regression (debug), a security
  audit (security-review), or a standalone experiment or research question
  (prototype, research).
disable-model-invocation: true
---

# Improve codebase

Orchestrate agents that improve a codebase on evidence. The main thread scopes
the work, delegates investigation, prototypes, and changes to sub-agents,
checks what they return, and lets the user choose at each decision. Three
tracks share the run:

| Track | Improves | Ends in |
| --- | --- | --- |
| **Cleanup** | Code that should not exist: **dead code** that no longer runs, **slop** that runs and earns nothing, and **redundant tests** that protect nothing the rest of the suite does not | Removals and consolidations |
| **Refactor** | **Friction**: a structure that makes ordinary changes touch too many places | Behaviour-preserving refactors |
| **System** | A whole system that misses a measurable target | A design chosen on prototype measurements, then staged `Refactor` steps |

## Principles

- **Each track has its own evidence.** Auditing them with one yardstick is the
  error that produces confident wrong deletions and taste-driven redesigns.

  | | Dead code | Slop | Redundant test | Friction | System |
  | --- | --- | --- | --- | --- | --- |
  | Question | Is this **reachable**? | Should this **exist in this form**? | What does this test **alone** protect? | Which structure makes changes cost the most? | Does it meet the **target**, and which design does? |
  | Decided by | Reference graphs, call graphs, runtime evidence | Reading the code | Mutation and coverage evidence, else the user | Git history, then reading | Measurements on representative scenarios |

- **No tool decides deadness.** Each one decides a *decidable approximation* of
  it, and the identity of that approximation, never the tool's confidence
  score, determines whether removal is safe. Perfect detection reduces to the
  halting problem, so every tool is either unsound for deletion or incomplete.
- **A test is worth what it alone protects.** In test-driven development, a test
  first drives a step of the design, then guards against regressions. Only the
  guarding lasts, and many step tests lose it once later tests cover the same
  behaviour. A test also keeps its place as the only readable statement of a
  requirement.
- **A candidate costs something today.** Unfamiliar names, file counts, style,
  and authorship are not defects. No detector of LLM-written source exists, and
  every pattern here is abundant in human-written code: report the defect and
  the rule it violates, and leave authorship out. Keep a candidate only with a
  reason to prefer the change over leaving the code alone; if none survives,
  say so.

## Vocabulary

- A **suspect** is a raw tool hit, a measurement, or a read observation. It is
  not yet a finding.
- To **exonerate** a suspect is to find the legitimate mechanism that keeps it
  alive or earns its shape. Every signal has an exoneration list, and clearing
  that list is the whole work of the audit.
- A **candidate** is a suspect whose exonerations were checked and none applied.
  Only candidates reach the proposal.
- The **root set** is the declared entry points reachability is measured from.
  "Unreachable" is a function of the root set, so it is a configuration
  artifact, not a property of the code.
- **Blast radius** is what breaks if the candidate was alive after all, and
  whether that break is **loud** (a failing build) or **silent** (a runtime
  failure on a rare path, months later). For a test, it is the fault that would
  no longer be caught.

## 1. Scope

Start from the user's pain point, the system or subsystem they name, and the
tracks they ask for. Without one, look at recent changes and their callers.
Read the project's design decisions and context documents first, and expand
only where the evidence leads. For the system track, agree the target as
[`systems.md`](systems.md#1-target) describes.

For dead-code signals, make three decisions before any tool runs, because each
one changes what the output means.

**Closed world or open world.** In a closed world (application, service, game)
every entry point lives in the repo or its deploy config, and an unreferenced
symbol is a candidate. In an open world (library, SDK, plugin, published
package) the exported surface *is* the product: zero in-repo callers is the
expected state of the entire public API, and a reachability tool measures
nothing but the density of its own examples. A monorepo is open-world per
published package boundary. An `internal` symbol shared through
`InternalsVisibleTo` or a friend-assembly mechanism is closed-world across every
assembly granted access: search all of them. Establish this first; it changes
the answer more than any tool setting.

**The root set, written down.** Enumerate every entry point before scanning:
`package.json` `bin` and `scripts`, `[project.scripts]`, `[[bin]]`,
Dockerfile `CMD`/`ENTRYPOINT`, CI workflows, Terraform and Kubernetes manifests,
serverless handlers, crontabs, route and task decorators, test discovery roots;
types discovered by reflection (`TypeCache`, assembly scans for derived types or
attributes); in Unity, the scenes in `EditorBuildSettings.asset`, `Resources/`
folders, Addressables groups, `StreamingAssets/`, and the editor entry points
listed in [`false-positives.md`](false-positives.md#unity-and-c).
A missing entry does not produce one false positive: it cascades, and every
file it reaches, every export in those files, and every dependency only they
used all report as dead.

**Exclusions and reach.** Generated output and its input schemas, vendored and
third-party trees, and test trees leave the reachability query; test trees stay
in scope for the test signals. Then choose the reach: a diff-scoped audit has an
owner for every finding, while a repo-wide audit produces hundreds of ownerless
ones. Prefer the diff, and weight the rest toward code that keeps changing
(the churn command of [signal 29](signals.md#friction-signals)). The diff only
aims the audit; judging whether a change is correct is code review.

**Done when** a scope note names the focus, the tracks, the target if any; for
dead code, the world, the root set, and the excluded trees; and for tests, the
test assemblies and the runner configuration.

## 2. Investigate

Delegate each track, or each independent area of a large one, to a sub-agent,
in parallel. Give it the scope note, the files to read, and the evidence fields
to return; it starts no sub-agent of its own and changes no tracked file in the
user's checkout.

Runs that write (builds, tests, coverage, mutations, a benchmark) happen in a
scratch worktree, checked with `git status` before and after, with their notes
in a folder of their own outside the repository. Prepare the worktree with the
project's own setup script when it has one; in Unity, copying `Library/` from
the main checkout avoids a full reimport. When the build or test runner admits
one instance at a time, as a Unity project folder does, the main thread owns
those runs for the whole session: sub-agents design them (commands, filters,
mutations) or return unbuilt patches, and the main thread runs them one at a
time and passes the results back.

| Track | The sub-agent reads | It returns per suspect |
| --- | --- | --- |
| Cleanup: code | [`signals.md`](signals.md) in full, and [`false-positives.md`](false-positives.md) | Files, signal, detection command, what it proves, exonerations checked, grade, blast radius |
| Cleanup: tests | [`signals.md`](signals.md), its opening sections and [test signals](signals.md#test-signals), and [`deletion.md`](deletion.md#removing-tests) for the manual-mutation fallback | Test groups, the faults each protects, the mutations to run and their results, exonerations checked, grade |
| Refactor | [`signals.md`](signals.md), its opening sections and [friction signals](signals.md#friction-signals) | Files, the changes it made costly, the history command, the proposed interface |
| System | [`systems.md`](systems.md), step 2, and step 3 once a target is confirmed | The benchmark patch and the runs to make; where the cost goes and why, once step 3 runs |

Meanwhile the main thread researches the system alternatives as
[`systems.md`](systems.md#4-research-the-alternatives) step 4 describes.

Grade what survives. **A** and **B** signals may carry a removal proposal.
**C** signals produce a question for the user. **D** signals, anything resting
on tone or style, are mentioned at most, never acted on.

**Done when** every suspect returned is either dismissed with the exoneration
that cleared it, or promoted to a candidate with its evidence fields complete,
and the main thread has re-run the command behind each candidate it presents,
or a cheaper check proving the same claim, listing any it did not re-run; for
the system track, one run of the stacked fixes re-checks them together. A
candidate that does not name the exonerations it cleared is not a finding.
Behaviour defects noticed along the way are not candidates: keep them for the
proposal's last section.

## 3. Present

Present the candidates directly in the conversation as a numbered list, in the
user's language and the project's domain vocabulary. List cleanup first,
ordered by evidence grade, then by blast radius ascending (for tests, by how
many other tests still catch each fault); then refactors, ordered by the change
cost they remove; then the system diagnosis: the systems and scenarios
measured, the baseline with its spread and configuration, the target or the
proposed one, and any `Prototype` candidates or alternatives set aside. Mark a
candidate that reaches beyond the requested scope: the user's acceptance is its
scope. A system track without a confirmed target stops at its diagnosis and
asks for the target instead of a choice of candidates. Present redundant tests as groups that protect the same faults, naming
the test each group keeps. Give each candidate a short title and:

- **Files**: the exact locations.
- **Evidence**: what fired or was measured, with the command that produced it,
  and the bounded claim it supports.
- **Cleared**: the exonerations checked and why none applied; for a system
  candidate, the other explanations ruled out (noise, drift, another cause).
- **Blast radius**: what breaks if this was alive, loud or silent.
- **Verdict**: `Remove`, `Consolidate`, `Finish migration`, `Refactor`,
  `Prototype`, or `Ask`. An `Ask` names the verdict a yes would give it, as in
  `Ask (Consolidate into one table-driven test)`.

Duplication is a `Consolidate` verdict, never a `Remove`: extract the shared
behaviour, redirect every call site, and the originals then become ordinary
unreferenced symbols with established provenance. Tests encoding one rule
consolidate into one table-driven test. A superseded implementation still
serving traffic is `Finish migration`: an incomplete migration, not a
deletion. A `Refactor` names the proposed interface, the behaviour it must
preserve, what it excludes, the checks that prove behaviour is unchanged, and
its dependencies on other candidates. A refactor whose migration would change
saved or serialized data is listed as dismissed, with that reason, unless the
user asked for such a change. A `Prototype` is a system alternative worth
measuring, with its expected gain and migration cost. Add a before/after
diagram only where the relationships need one.

End with a **Top recommendation**, then the behaviour defects noticed along the
way, each with its location and evidence, as work for `debug` or a separate
change rather than for this run. Then ask the user which numbered candidates to
pursue.

**Waiting:** until the user chooses, nothing is applied or prototyped.

## 4. Prototype

For accepted `Prototype` candidates, run [`systems.md`](systems.md#5-prototypes)
step 5: one sub-agent per alternative, each in its own worktree, all on the
same benchmark. Present the measurements beside the baseline and the target,
and let the user choose a design or none. The chosen design becomes `Refactor`
steps as [`systems.md`](systems.md#6-migration) step 6 plans them, presented
for acceptance like any other candidate.

## 5. Apply

Before the first change, record the starting commit and any existing local
changes; they stay out of every commit. Work on a branch, never the default
branch.

| Accepted verdict | Path |
| --- | --- |
| `Remove` | A sub-agent climbs the [`deletion.md`](deletion.md) ladder until the evidence matches the blast radius, or meets its test-removal checks. All the test candidates of one module go to one sub-agent. Public surface switches the work to a deprecation cycle, which the run proposes rather than performs |
| `Consolidate` | A sub-agent first establishes passing characterization tests where the shared behaviour is not covered, then extracts it and redirects every copy; the originals then leave through ladder rungs 1 to 4. Further copies of the same code found while applying may join, reported as such. Merged tests meet the test-removal checks |
| `Refactor` | A sub-agent first establishes passing characterization tests where the behaviour is not covered yet, then changes the structure without changing the expectations of tests at a caller's boundary. It prefers the IDE's or the language server's refactoring operations over hand edits where they exist. A system migration step also re-runs the benchmark |
| `Finish migration` | Not applied here: it leaves as a request that stands on its own, with the target, the behaviour to preserve, and the checks |
| `Ask` | A yes to the proposed change makes it `Remove` or `Consolidate`, and it follows that row. An answer that brings new evidence sends the candidate back to Investigate with it |

Give each sub-agent the candidate's evidence, the absolute paths of the
references it needs, its file list (including the tests and `.meta` files that
leave with the candidate), and the checks. It edits nothing outside that list
and starts no sub-agent. It returns its diff as a patch, each check with its
command and output, and the ladder rungs climbed; when the main thread owns
builds and test runs, it returns the patch unbuilt and the main thread runs its
checks and passes failures back. A test-first patch that cannot compile on
its own may carry stubs with no behaviour, which the fix replaces. It stops, reverts its own
edits, and reports when it finds evidence that the candidate is alive, needs an
edit outside its list, or would break a test pinning internals; the candidate
then returns to Investigate, or a test candidate that unblocks it is applied
first.

Run in parallel only candidates with disjoint files, each in its own worktree;
candidates sharing files run in sequence, each on top of the previous patch.
In Unity, reuse one worktree per role rather than one per candidate, run
batchmode on the user's checkout only after the user closes the editor, and run
the baseline and every later suite in the same graphics mode: `-nographics`
fails tests that open windows. Compare compiler warnings between full builds,
since an incremental build hides unchanged files' warnings. Without sub-agent
support, apply the candidates one at a time in the main thread, revert only
your own edits, and say so.

The main thread applies the returned patches to the working branch in
dependency order and verifies there: it re-reads the diff, re-runs the build
and tests, and confirms the scope held. Failed checks or scope drift leave the
candidate open with its reason; re-dispatch it within scope or surface the
decision. A test that fails on both the baseline and the change, or passes
when re-run alone with nothing touching its code, is reported as unstable
rather than fixed or ignored. `Consolidate` and `Refactor` changes, which can alter behaviour
despite a green suite, then get an independent review, batched per group of
related candidates and sized to the change. For a `Refactor` or a large
consolidation, follow [`../../stack/code-review/SKILL.md`](../../stack/code-review/SKILL.md)
when available, giving the candidates as the requirement (behaviour to
preserve, exclusions) and the exact range. For small mechanical
consolidations, or without that skill, give one fresh sub-agent the diff, the
behaviour to preserve, and the checks, without your conclusions. Confirmed
findings go to a fresh sub-agent with the patch and the findings, since a
finished one cannot be resumed, then to review; a fix limited to
comments or documentation is checked by the main thread instead.

When commits are authorized, the main thread lands each logical change as its
**own commit**, with a message recording which searches and measurements ran
and what they returned. Without commit authorization, preserve the local
changes and verification evidence, and report Git delivery as pending.
Preserve a recoverable copy of any uncommitted content before removal.

**Done when** every accepted candidate meets its verification and agreed
delivery conditions, and the closing message gives a one-line outcome per
numbered candidate, with remaining migration steps listed as pending.
Otherwise, report the candidates still open with their reasons. If no candidate
survived the evidence, the run ends at the proposal with that result.

## Standing guardrails

- **Trust boundaries are protected.** Validation, authorization, error handling
  that prevents data loss, and accessibility affordances stay, however
  redundant they look. The same null check is noise in a private helper and
  mandatory at a process, network, file, plugin, or FFI edge.
- **Baseline against the repository.** Churn, comment density, duplication, and
  function length are interpretable only as percentiles of the surrounding
  code.
