# Signals

What can be detected, what a hit actually proves, and the legitimate reason
that must be ruled out before it becomes a candidate.

Evidence grade: **A** quantified study · **B** codified in a linter, compiler,
or analyzer rule · **C** catalogued but judged qualitatively · **D** aesthetic
only. **A**/**B** may carry a removal proposal; **C** produces a question for
the user; **D** is reported at most. Friction signals rank refactors rather
than prove a removal; their grade says how far the ranking can be trusted.

## Before collecting suspects

Run whatever the repository already has before proposing anything new: its
linter, its compiler warnings, its analyzers, its coverage, its mutation tool,
its profiler. Record the exact command and configuration next to every hit,
because a candidate is only ever "unused within the set I analyzed." Adding a tool
to the project is a proposal for the user. Alongside the tools, read for the
shapes no tool encodes: a wrapper that only forwards, a second implementation of
an existing repository utility, a path left wired after a mid-task change of
approach.

Two moves carry most of the weight when exonerating code, and both are free:

- Search the symbol as a **bare string literal** across the whole repository,
  including untracked and ignored files, data, config, templates, and
  serialized assets, but not build caches or installed dependencies, which you
  exclude by pathspec (Unity `Library/ Temp/ obj/ Logs/`; Node `node_modules/
  dist/`; Python `.venv/ __pycache__/`):
  `git grep --untracked --no-exclude-standard 'Symbol' -- . ':!<excluded path>'`.
- Search the **mechanism**, not the symbol: `getattr(`, `importlib`,
  `Class.forName`, `Type.GetType`, `Activator.CreateInstance`, `obj[name]`,
  `.send(`, DI registrations, assembly scans. A name assembled at runtime from a
  prefix and a variable is unresolvable statically, and that ends the enquiry.

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
| 10 | Duplicated block of 5+ consecutive meaningful lines | Clone detection (`jscpd`, PMD CPD) at ~5 lines; without one, a script comparing whitespace-normalized windows of 5+ lines, confirmed by reading | A maintenance liability at that location. GitClear measured this class growing roughly eightfold by 2024 | Generated code; deliberately explicit test fixtures; two call sites in different domains that will diverge; the Rule of Three not yet reached | A |
| 11 | Copy-paste share high, moved/refactored share near zero | Classify recent diff lines as added / updated / deleted / moved and compare with the repo baseline | The codebase grew without consolidating — the 2021→2024 inversion GitClear measured | Greenfield work has nothing to move; a pure bugfix legitimately moves nothing. **Repo-level metric: never a verdict on one file** | A |
| 12 | Lines rewritten within days of landing | Blame-age histogram over a two-week window | The code was not settled when committed | Iterative development, spikes, an unmerged branch under review. **Repo-level metric: never a verdict on one file** | A |
| 13 | Security-weak pattern in changed code | Repo SAST / CodeQL on the changed files, mapped to CWE | A concrete vulnerability class is present | A test asserting the vulnerability; sandboxed sample code; a documented reviewed exception | A |
| 14 | Empty or swallowing catch | ESLint `no-empty`, `no-useless-catch`, ruff `E722`, .NET `CA1031` | An error can vanish silently | Process-edge crash barrier: supervisor loop, request handler, job runner, plugin host, UI event loop. Cleanup paths where a secondary failure must not mask the primary | B |
| 15 | `try` around code that cannot raise | No call, I/O, indexing, or parsing inside the guarded block | Pure noise: a branch nobody can exercise | Defensive wrapping across a version boundary where the callee may start raising; dynamic dispatch the analyzer cannot see | B |
| 16 | Comment restating the line below it | Token overlap between the comment and the next statement's identifiers, with no noun outside the code | A zero-information comment that will drift | It encodes a constraint the code cannot express: an upstream-bug workaround, an ordering requirement, a regulatory rule. A required public-API doc comment | B/C |
| 17 | Docs contradicting behaviour | Compare documented parameters and return types against the signature; scan for docs untouched while behaviour changed | Documentation drift, an active source of wrong decisions | A contract documented ahead of a tracked, in-progress migration | B/C |
| 18 | Speculative generality | Count implementers per interface, products per factory, callers per config key; flag 1 | The abstraction is currently unpaid for | Required by a DI container or a mocking framework; a published extension point; a boundary isolating a third-party type; a second implementation in a known upcoming change | C |
| 19 | Defensive check against a state the types forbid | Null checks on non-nullable types, range checks on constrained enums | A redundant, untestable branch that dilutes real validation | **Any trust boundary**: input crossing a process, network, file, plugin, or FFI edge. Also where the guarantee is conventional rather than enforced | C |
| 20 | Ceremony out of proportion to the task | Statements per unit of cyclomatic complexity, comment-to-code ratio, and function length against repo percentiles | Effort went into structure rather than behaviour | Genuinely complex domain rules; an unavoidable exhaustive mapping; house style mandating documented public members | D |
| 21 | Stylistic tells (emoji, hedging, headings in comments) | Textual pattern match | **Nothing about code quality.** At most a hint about authorship, which is not a defect | House style, or a human who writes that way | D |

## Test signals

Test code has no production caller by design, so reachability says nothing
about it. The question is what a test alone protects: a test written to drive
one step of test-driven development often protects nothing once later tests
cover the same behaviour.

| # | Signal | Detect | Proves | Exonerated by | Ev |
| --- | --- | --- | --- | --- | --- |
| 22 | The test kills no mutant that the rest of the suite misses | One run of the repository's mutation tool with bail disabled (Stryker `disable-bail`, PIT `fullMutationMatrix`), scoped with its file filter to the modules the suspect tests reach; read which tests kill each mutant in the report. Without a mutation tool, see the fallback in [`deletion.md`](deletion.md#removing-tests). Never edit or remove tests to measure | No generated mutant depends on this test alone. Real future regressions remain possible: mutation-preserving reductions still miss some real failures | The only test stating a requirement or a distinct scenario the reader needs; a regression test for a fixed bug whose failing input no other test reproduces; a test that has caught a real regression in the history. Within a group of mutually redundant tests, keep one | B with mutation evidence, C otherwise |
| 23 | Triangulation steps encoding one rule | Tests of one unit whose inputs differ while the assertions follow a single rule (empty, one item, two items) | Several tests state one rule; a table-driven test states it once | A case that crosses its own branch or boundary value: keep the case as a row, merge the tests. A case that documents a distinct domain scenario keeps its name | C |
| 24 | Test reaching past the caller's boundary | Imports a private module, asserts on internal state, private methods, or collaborator call order; `git log` shows it edited alongside behaviour-preserving refactors | It pins the implementation, so every refactor pays for it, and it says nothing a boundary test does not | A unit whose case space the boundary cannot reach at reasonable cost; no usable boundary exists; a contract test where the outbound call *is* the behaviour | C |
| 25 | Test asserting nothing, or only mocks or constants | Flag test bodies with no assertion, an empty body, an always-true comparison, or assertions touching only mocks, spies, or literals; confirm with mutation testing: a surviving mutant on covered lines proves the test asserts nothing | The test cannot fail when the behaviour breaks; it inflates coverage | A contract test where the outbound call *is* the behaviour; a smoke test asserting construction does not throw | C |
| 26 | Test of code the project does not own | Assertions that a setter stores what the getter returns, that the framework registers a route, or that a library behaves as documented | It tests the language, framework, or dependency | A pin on version-sensitive dependency behaviour the project relies on; a wrapper whose mapping is project logic | C |
| 27 | Duplicate scenario | Same arrange, act, and assert at the same boundary under another name or file; clone detection over test trees | One of the copies is redundant | The copies run at different boundaries (unit and end-to-end) and guard different integration points: decide with signal 22 | B |
| 28 | Test that never runs | Unconditionally skipped (`skip`, `xit`, `@Disabled`, `#[ignore]`, NUnit `[Ignore]` or `[Explicit]` without a reason, a Unity `[UnityPlatform]` exclusion covering every platform) or not collected by the runner configuration | It protects nothing today | A quarantine with a stated reason; a test run only by another job (nightly, `--ignored`, a tagged suite) | B |

## Friction signals

Friction is the cost of ordinary changes. Git history measures it; reading the
code explains it.

| # | Signal | Detect | Proves | Exonerated by | Ev |
| --- | --- | --- | --- | --- | --- |
| 29 | Hotspot: frequent change times complexity | Change count per file over a year (`git log --since=12.month --no-merges --format=format: --name-only`), crossed with size or indentation depth as a complexity proxy | Where a refactor would pay back most often | A file that changes often by nature (changelog, registry, configuration); stable complex code, which costs nothing today | A to rank, never to decide alone |
| 30 | Change coupling without a static dependency | Files changed together in a high share of their commits (`git log --no-merges --format=@%h --name-only`; ignore commits touching more than ~30 files; in a squash-merged history, where one commit is one pull request, ignore the largest tenth instead and grade C) | A hidden dependency: one change needs edits in places the code does not connect | A file and its own test; generated code and its source; mass commits (formatting, renaming, dependency updates) | B |
| 31 | Shallow module | The interface is nearly as large as the implementation; callers must know the details it should hide; a layer only forwards calls | The layer adds reading cost without hiding complexity | A boundary isolating a third-party type, a process edge, or a published API | C |
| 32 | Change that touched too many places | A recent feature or fix whose diff spread across many files for one concept | That concept has no single home | A deliberate cross-cutting change (rename, migration, dependency upgrade) | C |

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
- **Per-test coverage overlap is not redundancy.** Two tests that execute the
  same lines may check different outcomes; only mutation testing measures which
  faults a test detects. Mutation runs are slow, so scope them to the modules
  the suspect tests reach.
- **Duplication and deadness are orthogonal.** Nothing in a clone detector says
  a clone is unused; nothing in an unused-symbol tool says a live function is
  not a copy-paste. Run and read them separately.
