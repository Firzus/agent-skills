# Safe deletion — proving suspected-dead code can be removed

**Research date:** 2026-08-31
**Question:** once code is *suspected* dead, how does an agent prove deletion is safe?

Detection is a separate problem. This file starts one step later: a candidate
symbol, file, branch, flag, or endpoint is already flagged, and the remaining
question is purely evidentiary.

The governing asymmetry, stated by Meta about its own automated deletion system:
textual fallback search "can cause false negatives, but avoids false positives.
When automating the removal of dead code, those are a more serious problem"
([SCARF](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)).
Dead code left alive costs maintenance; live code deleted costs an incident. The
protocol below is deliberately biased toward false negatives.

## 1. Git as an evidence source

Git answers what no static analyzer answers: *was this ever used, and when did it
stop?*

### The pickaxe: `-S` vs `-G`

Constantly confused; they prove different things. Per
[git-diff](https://git-scm.com/docs/git-diff):

- `-S<string>` — "Look for differences that **change the number of occurrences**
  of the specified `<string>` (i.e. addition/deletion) in a file... useful when
  you're looking for an exact block of code (like a struct), and want to know the
  history of that block since it first came into being". Binary files included.
- `-G<regex>` — "Look for differences whose **patch text contains added/removed
  lines that match** `<regex>`".

The man page's own example settles it. For a diff containing
`+ return frotz(nitfol, two->ptr, 1, 0);` and `- hit = frotz(nitfol, mf2.ptr, 1, 0);`:
"While `git log -G"frotz\(nitfol"` will show this commit, `git log
-S"frotz\(nitfol" --pickaxe-regex` will not (because the number of occurrences of
that string did not change)".

| Goal | Command | Why |
|---|---|---|
| Find where a symbol was **introduced and removed** | `git log -S'Sym' -- .` | Occurrence-count semantics skip churn, surface birth/death |
| Every commit **touching a line mentioning** it | `git log -G'Sym' -- .` | Patch-text semantics; catches moves `-S` misses |
| Regex with `-S` | `--pickaxe-regex` | "Treat the `<string>` given to `-S` as an extended POSIX regular expression" |
| Whole changeset, not just matching files | `--pickaxe-all` | "show all the changes in that changeset" |

The high-value signal: a `-S` search whose most recent hit removed the last *call
site* while leaving the definition behind — the fingerprint of a symbol orphaned
by a refactor. A symbol whose only `-S` hit is its own introduction was born dead.

### Rename tracking, and blame's blind spot

- `git log --follow` "Continue listing the history of a file beyond renames
  (**works only for a single file**)" ([git-log](https://git-scm.com/docs/git-log)) —
  so it cannot audit a directory in one pass.
- `git blame` annotates "each line... with information from the revision which
  last modified the line"; rename-following is automatic and cannot be disabled,
  while `-C`/`-M` follow lines moved or copied between files
  ([git-blame](https://git-scm.com/docs/git-blame)).
- Blame is explicitly blind to deletion: "The report does not tell you anything
  about lines which have been deleted or replaced; you need to use a tool such as
  `git diff` or the 'pickaxe' interface" ([git-blame](https://git-scm.com/docs/git-blame)).
  This is why the pickaxe, not blame, is the primary instrument.
- Formatter and mass-rename commits poison blame: use `--ignore-rev` /
  `--ignore-revs-file`, backed by `blame.ignoreRevsFile`, conventionally a
  checked-in `.git-blame-ignore-revs` ([git-blame](https://git-scm.com/docs/git-blame)).

### Searching the tree

`git grep` looks "for specified patterns in the tracked files in the work tree,
blobs registered in the index file, or blobs in given tree objects". Two flags
matter, because dead references hide where the default search does not look:
`--untracked`, and `--no-exclude-standard` — "Also search in ignored files by not
honoring the `.gitignore` mechanism. Only useful with `--untracked`"
([git-grep](https://git-scm.com/docs/git-grep)). `git grep <tree>` answers "did
this string exist at the last release tag?" without a checkout.

### Why deletion is cheap to undo

`git revert`: "Given one or more existing commits, revert the changes that the
related patches introduce, and record some new commits that record them"
([git-revert](https://git-scm.com/docs/git-revert)). It is a forward commit, not a
history rewrite — so recovery costs one command and no coordination, **provided
the deletion was isolated in its own commit**. The entire delete-aggressively
posture rests on this, and it is contingent on the commit hygiene in §6.

### What age proves

Nothing. A file untouched for three years is equally consistent with abandonment
and with a stable, heavily used utility that needed no changes. Age is a
*prioritization* signal for review order, never a deletion argument. Inverted too:
mass refactors and formatter runs touch dead code as readily as live code.

## 2. Reference search beyond the import graph

The import graph is a lower bound on real usage, and an unsafe one. SCARF "must be
capable of introspecting any and all types of dynamic usage in addition to the
static dependency graph to make accurate determinations of whether a piece of code
is truly safe to remove," augmenting the compiler-derived graph with script
invocations, template hooks, URI handlers and routing, and dynamically referenced
dispatch methods ([SCARF](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)).

Their worked example is canonical: a URI dispatch table maps `'/photos/'` to
`PhotosController`. "If we only analyzed a language-level dependency graph, it
would be impossible to determine whether or not `PhotosController` is ever
referenced as it can be invoked via this URI dispatch mechanism" — only production
traffic logs showing the endpoint receives no requests made removal safe.

### The whole-repo textual sweep

Search the **bare identifier as text** across every file type, not just source:

| Surface | Why the symbol appears there |
|---|---|
| Config (`json`/`yaml`/`toml`/`.env`) | DI registration by name, handler class names, env keys |
| Templates (`html`/`jinja`/`erb`/`razor`/`vue`) | Runtime-resolved component and helper names |
| Serialized assets (Unity `.prefab`/`.asset`, UE `.uasset`) | Script refs stored by type name or GUID |
| SQL, migrations, stored procedures | Table/column names matching model fields |
| i18n catalogs | Message keys derived from symbol names |
| Schemas (GraphQL SDL, OpenAPI, protobuf) | Contract names that generate or bind to code |
| Build files, CI workflows, Dockerfiles | CLI command names, entry points, task names |
| Docs and runbooks | Human-invoked commands and flags |

### Reflection and string-built names

The symbol may never appear as a call. Search it as a **string literal**, then
search the reflection mechanisms themselves: Python `getattr` / `globals()` /
[`importlib.import_module`](https://docs.python.org/3/library/importlib.html);
.NET [`Activator.CreateInstance`](https://learn.microsoft.com/en-us/dotnet/api/system.activator.createinstance);
Java [`Class.forName`](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Class.html);
JS `eval`, bracket property access, dynamic `import()`.

Meta's fallback exists for exactly this: their textual BigGrep sweep "helps avoid
accidentally deleting MySQL tables that are referenced by name in other languages
and preventing deletions of dynamically invoked code in languages like Hack,
Python, and JavaScript that can call code through string references or use `eval`"
([SCARF](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)).

### Consumers outside the repository

For a published library the search domain is every consumer, not the repo: registry
reverse dependencies, org-wide code search, public code search. When the consumer
set is unbounded, in-repo textual absence proves nothing and §3 governs instead.

### Status of the textual signal

**Absence of any textual reference is the strongest cheap signal available.** It
subsumes the import graph, catches reflection by literal name, and needs no build.
What still defeats it:

1. **Name construction** — `getattr(mod, "handler_" + kind)` never contains the full symbol.
2. **Generated names** — codegen, ORM conventions, ID-to-class maps.
3. **Minified/obfuscated builds** — the shipped artifact lacks the source identifier.
4. **External consumers** — outside the searched corpus entirely.
5. **Data-driven invocation** — the name lives in a production DB row or remote config.

## 3. Public API and consumer risk

Once the symbol is externally reachable, deletion stops being a code question and
becomes a release-contract question. Semver: "MAJOR version when you make
incompatible API changes"; "Major version X (X.y.z | X > 0) MUST be incremented if
any backward incompatible changes are introduced to the public API"
([semver 2.0.0](https://semver.org/)). Removing a public export has no
minor-version path.

So the **private/public boundary decides everything**. PEP 387 defines what is
*not* public: names "prefixed by '\_' (except special names)", anything "documented
publicly as being private", imported modules, inheritance patterns of internal
classes, test suites — with the trap spelled out: "Note that if something is not
documented at all, it is not automatically considered private"
([PEP 387](https://peps.python.org/pep-0387/)). Undocumented is not private.

### Mandated waiting periods

The rare case where the required delay is a published number.

| Ecosystem | Rule | Source |
|---|---|---|
| Python | "the behavior of an API must not change in an incompatible fashion between any two consecutive releases"; the yearly release process "means that the deprecation period must last **at least two years**"; "a feature cannot be removed without notice between any two consecutive releases" | [PEP 387](https://peps.python.org/pep-0387/) |
| Node.js | Three levels: Documentation-Only, Runtime, End-of-Life. Doc-only "can not change to a Runtime Deprecation until the next major release"; "**No deprecated APIs can change to End-of-Life without going through a Runtime Deprecation cycle**" | [Collaborator guide](https://github.com/nodejs/node/blob/main/doc/contributing/collaborator-guide.md) |
| Node.js | "There is no rule that deprecated code must progress to End-of-Life... can remain in place for an unlimited duration" — deprecation is not a scheduled deletion | [Collaborator guide](https://github.com/nodejs/node/blob/main/doc/contributing/collaborator-guide.md) |
| Go | "programs written to the Go 1 specification will continue to compile and run correctly, unchanged, over the lifetime of that specification" — removal is effectively off the table | [Go 1 compatibility](https://go.dev/doc/go1compat) |
| Rust std | `#[deprecated(since, note)]` must accompany `stable`/`unstable`; `since` "is actually checked against the current version of rustc", a future value triggers `deprecated_in_future` | [rustc dev guide](https://rustc-dev-guide.rust-lang.org/stability.html) |

Node also supplies a directly reusable heuristic: "Avoid Runtime Deprecations when
an alias or a stub/no-op will suffice. An alias or stub will have lower maintenance
costs for end users and Node.js core"
([Collaborator guide](https://github.com/nodejs/node/blob/main/doc/contributing/collaborator-guide.md)) —
delete the body, keep a thin shim, remove the burden without breaking the contract.

Rust's model is the *design* answer: `#[unstable(feature, issue)]` items "cannot be
used without a corresponding `#![feature]` attribute on the crate," and "This
restriction only applies across crate boundaries"
([rustc dev guide](https://rustc-dev-guide.rust-lang.org/stability.html)).
Machine-enforced privacy makes future deletion a non-event.

**Rule:** if the symbol is exported from a published package, no amount of
repo-internal evidence authorises deletion. The path is deprecate → serve the
mandated period → remove in a major release.

## 4. Telemetry-driven deletion and tombstoning

When static and textual evidence is inconclusive and the code is reachable in
production, make the code *report on itself*: instrument the suspected region to
log when reached, ship it, wait a full business cycle, delete if the counter stayed
at zero.

The named prior art is the Ruby `tombstone` gem, whose description is the idea in
two sentences: "Use Tombstone to highlight dead code. Not sure if some code is safe
to remove? Tombstone it." A single version (0.1, November 2014) — an honest
maturity signal ([tombstone](https://rubygems.org/gems/tombstone)).

Meta runs the industrial version: SCARF's graph "is then augmented with further
information, like the usage of API endpoints from operational logs that determine
whether an endpoint is used at runtime." The scale is first-party reported: SCARF
"has grown to analyze hundreds of millions of lines of code; and five years on, it
has automatically deleted more than 100 million lines of code in over 370,000
change requests" ([SCARF](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)).

They also document the failure mode candidly, which agents must internalise:
"False-positives caught by engineers during code review... typically reflect new
sources of dynamic usage that our augmented graphs must account for. Sometimes
these misunderstood dynamic references can lead to incorrect deletion of code, and
these deletions can make it to production"
([SCARF](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)).
Even graph-based, telemetry-augmented, human-reviewed deletion ships mistakes.

**Window length.** The observation window must exceed the longest natural
invocation period: a monthly billing job, quarterly report, annual export, or
once-per-release migration each need a window longer than their cycle. Zero hits
over two weeks says nothing about a quarterly path. *(unverified — no primary
source located prescribing a window length; a first-party engineering policy
mandating an observation period before deletion would confirm it.)* The
instrumentation must be cheap and non-throwing: a log line or counter, never an
exception — the goal is to observe production, not break it.

### Feature flags as a deletion tool

A flag makes deletion a reversible runtime experiment: disable the path, observe,
then remove code and flag. LaunchDarkly defines staleness operationally — a flag is
stale when it is temporary, not deleted or archived, "was created at least 30 days
ago," and "has had a status of 'inactive' or 'launched' for at least 7 days";
`inactive` means "The flag has not been evaluated for at least seven days"
([Flag health](https://launchdarkly.com/docs/home/releases/flag-health)). Directly
reusable thresholds: 30 days of age plus 7 days of settled status.

For locating the code, code references "help you determine which projects reference
your feature flags and remove technical debt" via the open-source
`ld-find-code-refs` scanner in CI, and "Extinction events and archive checks use
code reference data to confirm when a flag is ready for code removal"
([Code references](https://launchdarkly.com/docs/home/flags/code-references)). The
generalisable pattern: a scheduled job correlating *runtime evaluation data* with
*source references*, acting only on the intersection where both say dead.

The trap is the flag that is never removed. It converts one dead branch into two
live-looking branches plus a config dependency — strictly worse than either
deleting or keeping the original code.

## 5. Build and test verification, and its limits

### A passing build proves different things per language

In statically compiled languages, removing a referenced symbol is a compile error,
so a green build across the full matrix nearly proves no *statically resolved*
reference remains. In dynamically resolved languages it proves nothing about
unexecuted paths: Python's execution model specifies that "Each occurrence of a name
in the program text refers to the binding of that name established by the following
name resolution rules"
([execution model](https://docs.python.org/3/reference/executionmodel.html)) — a
resolution that happens when code runs, not when the module is compiled. A missing
attribute on an untaken branch stays invisible until that branch runs.

TypeScript sits between: `noUnusedLocals` will "Report errors on unused local
variables" ([tsconfig](https://www.typescriptlang.org/tsconfig/noUnusedLocals.html)),
but type erasure means nothing stops a runtime string lookup from reaching a deleted
export.

### Conditional compilation breaks the green-build argument

A symbol used only under a platform guard is invisible to a single-target build:

| Language | Mechanism | Source |
|---|---|---|
| C# | `#if` "Starts a conditional compilation. The compiler compiles the code only if the specified symbol is defined", with platform symbols "available only when you specify an OS-specific TFM" | [Preprocessor directives](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/preprocessor-directives) |
| Rust | `cfg` options `target_os` (`"windows"`, `"macos"`, `"ios"`, `"linux"`, `"android"`…), `target_arch`, `target_feature`; "It is not possible to set a configuration option from within the source code of the crate being compiled" | [Conditional compilation](https://doc.rust-lang.org/reference/conditional-compilation.html) |
| Python | runtime `sys.platform` branches — not compile-time, so no build ever checks them | [sys](https://docs.python.org/3/library/sys.html) |

**The build matrix defines the proof surface.** A symbol referenced only inside
`#if ANDROID` is proven unused only if CI actually builds an Android configuration.
Three of five shipped targets built means the compile argument covers three of five.

### Why "tests pass" is weak evidence

A suite that never executed the deleted region cannot fail when it disappears. The
distinction is branch vs line coverage. coverage.py's minimal example: for `if x:`
followed by an assignment and a return, "Statement coverage would show all lines of
the function as executed. But the `if` was never evaluated as false, so line 2 never
jumps to line 4... This is known as a partial branch"
([branch coverage](https://coverage.readthedocs.io/en/latest/branch.html)).

100% line coverage of a function is therefore compatible with an entirely
unexercised `else`. The usable form is narrow: *tests pass **and** the deleted
region had branch coverage before deletion **and** surrounding coverage did not
drop*. Without the coverage measurement, "tests pass" only repeats what the compiler
already said for free in compiled languages.

## 6. Deletion procedure and reversibility

**One logical deletion per commit.** `git revert` records "some new commits" that
reverse an earlier patch ([git-revert](https://git-scm.com/docs/git-revert)) — a
one-command recovery only if the deletion is not entangled with unrelated edits. A
message naming the symbol also makes the deletion findable by `git log -S` later.

**Delete rather than comment out.** Ruff ERA001 is flat: "Commented-out code is dead
code, and is often included inadvertently. It should be removed." Its documented
limitation is worth knowing — "Prone to false positives when checking comments that
resemble Python code, but are not actually Python code"
([ERA001](https://docs.astral.sh/ruff/rules/commented-out-code/)). Commenting out is
strictly worse than deleting: it keeps the reading cost, removes compiler checking,
is invisible to tests — and git already preserves the content permanently.

**Separate the deletion PR from behavior changes.** A pure-deletion diff is
reviewable by inspection and revertible without side effects; mixed with a refactor,
neither holds, and an incident revert re-introduces the unrelated change. SCARF
submits dedicated deletion change requests carrying "human-readable descriptions
informing engineers about the analysis that determined the targeted code is provably
dead" ([SCARF](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)).
An agent should put the same into the commit body: which searches ran, what they returned.

**Do not leave code behind a flag forever.** The flag is a staging mechanism with an
expiry, not a resting place
([Flag health](https://launchdarkly.com/docs/home/releases/flag-health)).

## 7. The verification ladder

Cheapest to strongest. Climb until the evidence matches the blast radius.

1. **Static reachability / unused-symbol analysis.** *Proves:* no statically
   resolved reference in the analyzed configuration. *Open:* everything dynamic,
   unbuilt configurations, everything outside the repo.
2. **Whole-repo textual grep** for the bare identifier, including untracked and
   ignored files (`git grep --untracked --no-exclude-standard`), data, config,
   templates, serialized assets. *Proves:* the name appears nowhere in the corpus;
   subsumes step 1. *Open:* constructed names, generated names, external consumers.
3. **String-literal and reflection sweep.** The name quoted, plus `getattr` /
   `Class.forName` / `Activator.CreateInstance` / `eval` / dynamic import near the
   candidate's domain. *Proves:* no known reflective entry point names it. *Open:*
   name concatenation, DB-driven dispatch.
4. **Historical pickaxe.** `git log -S'Sym'` and `-G'Sym'`. *Proves:* when the last
   call site disappeared, and whether it was ever used at all. *Open:* usage that
   never existed in this repo's history, e.g. external consumers.
5. **Public-surface classification.** Exported from a published package, documented
   API, HTTP route, CLI command, DB column, schema type? *Proves:* whether
   repo-internal evidence is admissible at all — this step gates the rest. If public,
   switch to the deprecation path ([semver](https://semver.org/),
   [PEP 387](https://peps.python.org/pep-0387/)).
6. **Full build matrix compile.** All targets, all `cfg`/`#if` configurations.
   *Proves:* in compiled languages, no statically resolved reference in any built
   configuration. *Open:* unbuilt targets, dynamic resolution, runtime lookup.
7. **Test suite plus coverage delta.** Green, and the deleted region had branch
   coverage before removal ([coverage.py](https://coverage.readthedocs.io/en/latest/branch.html)).
   *Proves:* exercised behavior unchanged. *Open:* every path the suite never entered.
8. **Production telemetry over a full business cycle.** Tombstone log, endpoint
   request counts, or flag evaluation data
   ([SCARF](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/),
   [Flag health](https://launchdarkly.com/docs/home/releases/flag-health)). *Proves:*
   real users did not reach it in the window. *Open:* longer-period paths, DR and
   error paths, unreleased clients, pinned old versions.
9. **Reversible landing.** Isolated commit, message recording the evidence, easy
   revert ([git-revert](https://git-scm.com/docs/git-revert)). *Proves:* nothing about
   deadness — it bounds the cost of being wrong, which is the actual objective.

Rungs 1–4 are free and offline; always run all four. Rung 5 is a judgement that
changes the whole procedure. Rungs 6–8 cost time and infrastructure. Rung 9 is
mandatory regardless.

### Evidence type → strength → what it still fails to rule out

| Evidence type | Strength | What it still fails to rule out |
|---|---|---|
| Age of last modification | None | Stable live code; recency proves nothing either way |
| Unused-symbol linter / import graph | Weak | Reflection, string dispatch, templates, config, other languages, other repos |
| Whole-repo textual grep (incl. ignored/untracked) | **Strong — best cheap signal** | Constructed names, generated names, minified artifacts, external consumers, data-driven dispatch |
| String-literal + reflection sweep | Strong | Name concatenation, remote config, DB-stored handler names |
| `git log -S` (occurrence count) | Moderate | Usage that never existed in this repo; says when, not whether it is safe now |
| `git log -G` (patch text) | Moderate | Same, plus noisier; catches moves `-S` misses |
| `git blame` | Weak | "does not tell you anything about lines which have been deleted or replaced" ([git-blame](https://git-scm.com/docs/git-blame)) |
| Compile of one configuration | Moderate (compiled) / None (dynamic) | Other `cfg`/`#if` targets; all runtime resolution |
| Full build matrix compile | Strong (compiled only) | Dynamic resolution, reflection, external consumers |
| Tests pass, coverage unknown | Weak | Any unexecuted branch — partial branches show as covered lines |
| Tests pass + branch coverage of the region | Strong | Behavior not modeled by tests; production-only configurations |
| Not exported / `_`-private / `#[unstable]` | Strong for consumer risk | Internal dynamic use; and "if something is not documented at all, it is not automatically considered private" ([PEP 387](https://peps.python.org/pep-0387/)) |
| Telemetry: zero hits over a full business cycle | **Strongest available** | Longer-cycle paths, error/DR paths, pinned old clients, unreleased consumers |
| Deprecation period served (semver major) | Decisive for public API | Consumers who ignored the warnings — but the contract now covers you |
| Isolated revertible commit | Not evidence | Nothing — it caps the cost of error rather than its probability |

The honest closing position is Meta's: even with a compiler-derived dependency
graph, runtime augmentation, textual fallback, and human review, "these deletions
can make it to production"
([SCARF](https://engineering.fb.com/2023/10/24/data-infrastructure/automating-dead-code-cleanup/)).
Safe deletion is not certainty. It is a documented evidence level proportional to
blast radius, plus a cheap path back.
