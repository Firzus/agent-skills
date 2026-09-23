# Signals

What can be detected, what a hit actually proves, and the legitimate reason
that must be ruled out before it becomes a finding.

Evidence grade: **A** quantified study · **B** codified in a linter, compiler,
or analyzer rule · **C** catalogued but judged qualitatively · **D** aesthetic
only. **A**/**B** may carry a removal proposal; **C** produces a question for
the author; **D** is reported at most.

## Dead-code signals

| # | Signal | Detect | Proves | Exonerated by | Ev |
| --- | --- | --- | --- | --- | --- |
| 1 | Unreachable statement | Compiler and linter CFG checks: `javac` (an error), C# `CS0162`, rustc `unreachable_code`, ESLint `no-unreachable` | No path reaches it under that tool's stated rules — the strongest cheap signal there is | A macro or generator emits the form deliberately: fix at the generator. An exhaustiveness `default:` arm that exists to fail loudly on a future enum value is load-bearing | B |
| 2 | Dead store | Live-variable analysis: ruff `F841`, IDE "value never read" | The binding is never read before overwrite or scope exit | The right-hand side has side effects. Drop the binding, keep the call | B |
| 3 | Zero static references to a symbol | Unused-symbol scan (`knip`, `vulture`, `IDE0051`) plus a repo-wide reference search | No reference **inside the analyzed set** — nothing more | Every mechanism in [`false-positives.md`](false-positives.md). This is the most dangerous class to act on | B |
| 4 | Unreachable from every entry point | Call-graph reachability: Go `deadcode`, tree shaking, .NET trimming | Unreachable from the **declared** root set, under a closed world | An incomplete root set, or runtime loading that breaks the closed world. Failures here are silent and land in production | B |
| 5 | Exported, imported by no other module | `knip`, `ts-prune` | No *other module* imports it | Open-world repo: the export is the product. Also in-file use, and barrel re-export | B |
| 6 | Unused argument | `vulture` 100% tier, ESLint `no-unused-vars` | Structurally reliable, and low value: removal changes a signature | The signature is imposed by a callback, override, or interface contract. A `_` prefix or `[[maybe_unused]]` is an explicit author statement — a stop, not a finding | B |
| 7 | Name defined and not textually reused | `vulture` 60% tier | Almost nothing on its own: the tier is scope-insensitive and name-based | Anything dynamic. Vulture's own README ships a `getattr` false positive at this tier. Corroborate or drop | C |
| 8 | Zero coverage over a window | `coverage.py`, Istanbul, JaCoCo, production telemetry | Not executed **by the runs performed** | Untested-but-live code; a rare error, recovery, or migration path; a window that missed the workload. Error paths are the least covered and the worst to remove | C |
| 9 | Commented-out code | ruff `ERA001`, Python `deadcode` DC12 | A block of prose shaped like code | Documented examples and prose that merely resembles code — the rule's own known false positive | B |

## Slop signals

| # | Signal | Detect | Proves | Exonerated by | Ev |
| --- | --- | --- | --- | --- | --- |
| 10 | Duplicated block of 5+ consecutive meaningful lines | Clone detection (`jscpd`, PMD CPD) at ~5 lines | A maintenance liability at that location. GitClear measured this class growing roughly eightfold by 2024 | Generated code; deliberately explicit test fixtures; two call sites in different domains that will diverge; the Rule of Three not yet reached | A |
| 11 | Copy-paste share high, moved/refactored share near zero | Classify recent diff lines as added / updated / deleted / moved and compare with the repo baseline | The codebase grew without consolidating — the 2021→2024 inversion GitClear measured | Greenfield work has nothing to move; a pure bugfix legitimately moves nothing. **Repo-level metric: never a verdict on one file** | A |
| 12 | Lines rewritten within days of landing | Blame-age histogram over a two-week window | The code was not settled when committed | Iterative development, spikes, an unmerged branch under review | A |
| 13 | Security-weak pattern in changed code | Repo SAST / CodeQL on the changed files, mapped to CWE | A concrete vulnerability class is present | A test asserting the vulnerability; sandboxed sample code; a documented reviewed exception | A |
| 14 | Empty or swallowing catch | ESLint `no-empty`, `no-useless-catch`, ruff `E722`, .NET `CA1031` | An error can vanish silently | Process-edge crash barrier: supervisor loop, request handler, job runner, plugin host, UI event loop. Cleanup paths where a secondary failure must not mask the primary | B |
| 15 | `try` around code that cannot raise | No call, I/O, indexing, or parsing inside the guarded block | Pure noise: a branch nobody can exercise | Defensive wrapping across a version boundary where the callee may start raising; dynamic dispatch the analyzer cannot see | B |
| 16 | Comment restating the line below it | Token overlap between the comment and the next statement's identifiers, with no noun outside the code | A zero-information comment that will drift | It encodes a constraint the code cannot express: an upstream-bug workaround, an ordering requirement, a regulatory rule. A required public-API doc comment | B/C |
| 17 | Docs contradicting behaviour | Compare documented parameters and return types against the signature; scan for docs untouched while behaviour changed | Documentation drift, an active source of wrong decisions | A contract documented ahead of a tracked, in-progress migration | B/C |
| 18 | Test asserting only mocks or constants | Flag test bodies whose assertions touch only mocks, spies, or literals; confirm with mutation testing — a surviving mutant on covered lines proves the test asserts nothing | The test cannot fail when the behaviour breaks; it inflates coverage | A contract test where the outbound call *is* the behaviour; a smoke test asserting construction does not throw | C |
| 19 | Speculative generality | Count implementers per interface, products per factory, callers per config key; flag 1 | The abstraction is currently unpaid for | Required by a DI container or a mocking framework; a published extension point; a boundary isolating a third-party type; a second implementation in a known upcoming change | C |
| 20 | Defensive check against a state the types forbid | Null checks on non-nullable types, range checks on constrained enums | A redundant, untestable branch that dilutes real validation | **Any trust boundary**: input crossing a process, network, file, plugin, or FFI edge. Also where the guarantee is conventional rather than enforced | C |
| 21 | Ceremony out of proportion to the task | Statements per unit of cyclomatic complexity, comment-to-code ratio, and function length against repo percentiles | Effort went into structure rather than behaviour | Genuinely complex domain rules; an unavoidable exhaustive mapping; house style mandating documented public members | D |
| 22 | Stylistic tells (emoji, hedging, headings in comments) | Textual pattern match | **Nothing about code quality.** At most a hint about authorship, which is not a defect | House style, or a human who writes that way | D |

## What detectors cannot see

- **A confidence score is not a probability.** Vulture's tiers are fixed
  per-code-type heuristics its own README calls "very rough" estimates. Only
  its 100% tier is structurally sound, and that tier is the least interesting.
- **The finding and its autofix are separate judgements**, and the tools say so:
  ruff marks `F841` unsafe because the fix can delete attached comments, and
  `F401` unsafe in `__init__.py` because the module interface changes;
  typescript-eslint defaults import removal to off because of side-effect
  imports; knip warns that `--fix` before configuration converges "can lead to
  deleting code that your application relies on".
- **Entry points are configuration, so unreachability is too.** Two runs of the
  same tool on the same code legitimately disagree when the root set differs.
- **Ecosystems disagree about exported-but-unimported.** It is a finding for
  knip and ts-prune, and a non-finding by definition for rustc `dead_code`
  (unexported items only) and Staticcheck (packages use their exported
  surface). That disagreement encodes application versus library — classify the
  target first.
- **Name-based and graph-based tools err in opposite directions.** Vulture
  over-reports, while Go `deadcode` and Staticcheck deliberately under-report to
  stay safe. Neither posture is correct in general.
- **Coverage is the most seductive false signal.** `def` and `class` lines
  execute at import, so an untested module still shows nonzero coverage, and
  statement coverage marks a branch covered whose `else` never ran. Use branch
  coverage, and only as corroboration.
- **Duplication and deadness are orthogonal.** Nothing in a clone detector says
  a clone is unused; nothing in an unused-symbol tool says a live function is
  not a copy-paste. Run and read them separately.

The full evidence base, with primary sources and per-tool detail, is in
[`doc/dead-code-and-slop/`](../../../doc/dead-code-and-slop/overview.md).
