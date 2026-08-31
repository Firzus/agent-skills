# Deletion

Removal is never certainty. It is a documented evidence level proportional to
blast radius, plus a cheap path back. Meta's own automated dead-code system,
with a compiler-derived dependency graph, runtime augmentation, textual
fallback, and human review, still states that wrong deletions reach production.

## The verification ladder

Cheapest to strongest. Climb until the evidence matches the blast radius.

| # | Rung | Proves | Still open |
| --- | --- | --- | --- |
| 1 | Static reachability / unused-symbol analysis | No statically resolved reference in the analyzed configuration | Everything dynamic, unbuilt configurations, everything outside the repo |
| 2 | Whole-repo textual sweep, `git grep --untracked --no-exclude-standard`, including data, config, templates, serialized assets | The name appears nowhere in the corpus — subsumes rung 1 | Constructed names, generated names, external consumers |
| 3 | String-literal and reflection sweep near the candidate's domain | No known reflective entry point names it | Name concatenation, database-driven dispatch |
| 4 | Historical pickaxe: `git log -S'Sym'` and `-G'Sym'` | When the last call site disappeared, and whether the symbol was ever used at all | Usage that never existed in this repo, e.g. external consumers |
| 5 | **Public-surface classification** | Whether repo-internal evidence is admissible at all — this rung gates the rest | Nothing: if public, switch to the deprecation path |
| 6 | Full build matrix compile, all targets and all `cfg`/`#if` configurations | In compiled languages, no static reference in any built configuration | Unbuilt targets, all runtime resolution |
| 7 | Test suite green **plus branch-coverage delta** over the removed region | Exercised behaviour is unchanged | Every path the suite never entered |
| 8 | Production telemetry over a full business cycle | Real users did not reach it in the window | Longer-cycle paths, error and DR paths, pinned old clients |
| 9 | Reversible landing: isolated commit, evidence in the message | Nothing about deadness — it bounds the cost of being wrong, which is the objective | — |

Rungs 1–4 are free and offline: run all four, every time. Rung 5 is a judgement
that changes the whole procedure. Rungs 6–8 cost time and infrastructure. Rung 9
is mandatory regardless.

## Evidence strength

| Evidence | Strength | Still fails to rule out |
| --- | --- | --- |
| Age of last modification | None | Stable live code. Recency proves nothing either way |
| Unused-symbol linter or import graph | Weak | Reflection, string dispatch, templates, config, other languages, other repos |
| Whole-repo textual grep incl. ignored and untracked | **Strong — the best cheap signal** | Constructed and generated names, minified artifacts, external consumers |
| String-literal and reflection sweep | Strong | Name concatenation, remote config, handler names stored in a database |
| `git log -S` (occurrence count) | Moderate | Usage that never existed here; says *when*, not whether removal is safe now |
| `git log -G` (patch text) | Moderate | Same, noisier; catches moves that `-S` misses |
| `git blame` | Weak | Deleted or replaced lines — blame is documented as blind to them; that is why the pickaxe is the instrument |
| Compile of one configuration | Moderate compiled / none dynamic | Other `cfg`/`#if` targets, all runtime resolution |
| Full build matrix compile | Strong (compiled only) | Dynamic resolution, reflection, external consumers |
| Tests pass, coverage unknown | Weak | Any unexecuted branch — a partial branch shows as a covered line |
| Tests pass + branch coverage of the region | Strong | Behaviour the tests do not model, production-only configurations |
| Not exported / private / unstable | Strong for consumer risk | Internal dynamic use — and undocumented does not mean private |
| Telemetry: zero hits over a full business cycle | **Strongest available** | Longer-cycle paths, error and DR paths, pinned old clients |
| Deprecation period served (semver major) | Decisive for public API | Consumers who ignored the warnings — but the contract now covers you |
| Isolated revertible commit | Not evidence | Nothing: it caps the cost of error, not its probability |

## The public-surface fork

Rung 5 is a fork, not a check. If the candidate is exported from a published
package, documented, or reachable as an HTTP route, CLI command, database
column, or schema type, internal evidence cannot justify removal. The work
becomes a deprecation cycle — mark, announce, wait the mandated period, then
remove in a major release — and the audit **proposes** it rather than
performing it. Ecosystems mandate real waiting periods: Python's policy sets a
minimum of two years and forbids removal without notice between consecutive
releases; Node.js forbids an API reaching end-of-life without a runtime
deprecation cycle first.

## Landing the change

- **One logical deletion per commit.** A revert is one command only when the
  deletion is not entangled with unrelated edits.
- **Record the evidence in the commit body**: which searches ran, what they
  returned, which rungs were climbed. The message also makes the deletion
  findable by `git log -S` later.
- **Keep the deletion diff pure.** Mixed with a refactor, it is neither
  reviewable by inspection nor revertible without side effects, and an incident
  revert re-introduces the unrelated change.
- **Delete rather than comment out.** Git preserves the content permanently,
  while a commented block keeps the reading cost, loses compiler checking, and
  is invisible to tests.
- **A feature flag is a staging mechanism with an expiry, not a resting place.**
  Flagged-off code still ships and still runs when the flag flips.

Primary sources:
[`doc/dead-code-and-slop/safe-deletion.md`](../../../doc/dead-code-and-slop/safe-deletion.md).
