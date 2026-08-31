# Dead Code and "AI Slop": Detectable Signals and Their Counter-Indications

**Research date:** 2026-08-31
**Question:** which characteristics of LLM-generated code are measurable enough that an agent can detect them mechanically, and what legitimate explanation must be excluded before flagging each one?

## Executive conclusion

"AI slop" is a partly rhetorical category. Roughly one third of it is measurable with published, quantified primary evidence; one third is enforceable only through pre-existing linter rules and official style guides that predate LLMs; the last third is taste, and an agent that deletes on taste alone will destroy working code.

Three claims are supported by strong primary evidence:

1. **Duplication grew and refactoring shrank as AI assistance spread.** GitClear analysed 211 million changed lines from January 2020 to December 2024 and reports copy/pasted lines rising from **8.3% of changed lines in 2021 to 12.3% in 2024**, moved (refactored) lines falling from roughly **25% in 2021 to under 10% in 2024** (chart commonly read as 9.5%), and commits containing a duplicated block of **five or more consecutive repeated meaningful lines** growing about **eightfold in 2024** versus earlier years. 2024 is the first year in the dataset where copy/pasted lines exceed moved lines ([2025 report](https://www.gitclear.com/ai_assistant_code_quality_2025_research), [2026 follow-up](https://www.gitclear.com/the_ai_code_quality_maintainability_gap)).
2. **Short-term churn rose.** Code revised shortly after being committed rose to about **5.7% in 2024** against roughly **3.1-3.3%** earlier in the same window (same source).
3. **Generated code reproduces insecure patterns.** Pearce et al. built 89 CWE-oriented completion scenarios, collected **1,689 Copilot-generated programs** in Python and C, and found approximately **40% contained a security weakness** ([arXiv:2108.09293](https://arxiv.org/abs/2108.09293), IEEE S&P 2022, DOI 10.1109/SP46214.2022.9833571).

Everything else in the popular slop vocabulary - narrating comments, speculative interfaces, mock-only tests, defensive code against impossible states - is real, but its authority comes from linter rules and style guides that condemned it long before LLMs existed. The honest framing is therefore: **LLMs amplify pre-existing anti-patterns at higher volume; they rarely invent new ones.** An audit must be built on the pre-existing rule, not on the accusation of AI authorship, because **authorship is not detectable and is not the defect**.

## Evidence grading scale

Every signal below is graded on the strength of its *primary* evidence, not on how often it is repeated online.

| Grade | Meaning |
|---|---|
| **A** | Quantified primary study or first-party dataset measuring the phenomenon at scale |
| **B** | Codified as a rule in an official linter, compiler, analyser, or language style guide; mechanically decidable |
| **C** | Named in an authoritative engineering catalogue but judged qualitatively; no threshold exists |
| **D** | Anecdotal or aesthetic; community consensus only; not safe as an automated deletion trigger |

A signal graded **D** may be reported, never acted on unilaterally.

## What is measurable and what is taste

| Claim | Status |
|---|---|
| Duplicated 5+ line blocks increased with AI adoption | Measured (GitClear, 211M lines) |
| Refactoring/moved-line share collapsed | Measured (GitClear) |
| Short-term churn increased | Measured (GitClear) |
| ~40% of Copilot completions in CWE-prone scenarios were vulnerable | Measured (Pearce et al., 1,689 programs) |
| Empty catch blocks, bare excepts, unreachable code are defects | Codified in linters/compilers, decidable |
| Comments that restate the next line add no value | Codified in style guides, partly decidable |
| Single-implementation interfaces are over-abstraction | Catalogued (Speculative Generality), not decidable |
| Code "feels" AI-generated because of tone, emoji, or headings | Taste; no evidentiary value |
| A given file was written by an LLM | **Not determinable.** Do not build an audit on this |

GitClear itself frames its result as **correlation with widespread AI adoption, not proof that any single assistant caused every change**. That caveat must survive into any tooling built on these numbers: a duplicated block is a maintainability finding regardless of who typed it.

## The signal table

Legend: **Detect** = mechanical procedure an agent can run. **Proves** = what a positive hit actually establishes. **Exonerates** = the legitimate explanation that must be ruled out before reporting. **Ev** = evidence grade.

| # | Signal | Detect | Proves | Exonerates (legitimate reason it exists) | Ev |
|---|---|---|---|---|---|
| 1 | Duplicated block of 5+ consecutive meaningful lines | Clone detector over the diff and the repo (`jscpd`, PMD CPD, or the analyser bundled with the language toolchain) with min-tokens tuned to ~5 lines *(tool names unverified)* | A maintenance liability exists at that location; GitClear shows this class grew ~8x in 2024 | Generated code (protobuf, ORM, bindings); test fixtures deliberately explicit; two call sites that are similar today but evolve independently; the Rule of Three not yet reached *(unverified)* | **A** |
| 2 | Short-term churn: lines added then rewritten within days | `git log -L` or blame-age histogram over a 2-week window on lines introduced by the change *(window definition matches GitClear, threshold unverified)* | The code was not settled when committed; rework cost was pushed downstream | Genuine iterative development, spikes, prototypes, and hotfix follow-ups; churn on a branch under review is normal | **A** |
| 3 | Copy/paste share high while moved/refactored share near zero | Classify diff lines as added / updated / deleted / moved and compare the moved ratio against the repo baseline | The change grew the codebase without consolidating it - the exact 2021→2024 inversion GitClear measured | A greenfield feature has nothing to move yet; a pure bugfix legitimately moves nothing | **A** |
| 4 | Security-weak pattern in generated code (injection, weak crypto, missing bounds/authz checks) | Run the repo SAST / CodeQL / analyser rules on the changed files only; map hits to CWE | A concrete vulnerability class is present; the base rate for this in AI completions was ~40% in the Pearce corpus | Deliberately unsafe code in a test that asserts the vulnerability; sandboxed sample code; a documented and reviewed exception | **A** |
| 5 | Empty or swallowing catch block | Linter rules: ESLint `no-empty` / `no-useless-catch`, ruff/pycodestyle `E722` bare-except, .NET `CA1031` do-not-catch-general-exception-types, Sonar `S108` *(rule identifiers unverified)* | Control flow can silently lose an error; a failure becomes invisible | Top-level crash barriers in a supervisor loop, event handler, or plugin host; cleanup paths where the secondary failure must not mask the primary one; explicitly commented best-effort telemetry | **B** |
| 6 | `try`/`except` wrapped around code that cannot raise | Static check: no call, no I/O, no indexing, no parsing inside the guarded block | Pure noise; it adds a branch nobody can exercise | Defensive wrapping across a version boundary where the callee may start raising; dynamic dispatch the analyser cannot see | **B** |
| 7 | Unreachable code / dead `else` / condition provably constant | Compiler and linter: ESLint `no-unreachable`, Roslyn `CS0162`, TypeScript `allowUnreachableCode: false`, Go vet *(identifiers unverified)* | Provable dead branch; zero behavioural contribution | Exhaustiveness `default:` arms that exist to fail loudly on a future enum value - these are load-bearing and must be kept | **B** |
| 8 | Unreferenced symbol (true dead code) | Whole-program unused-export analysis (`knip`/`ts-prune`, `vulture`, Roslyn `IDE0051`, `CS0169`) plus a repo-wide reference search *(tool names unverified)* | The symbol has no caller in this repo | Public API of a library; reflection, DI containers, serialization, dynamic imports, test-only helpers, entry points invoked by config or by another repo | **B** |
| 9 | Comment that restates the statement below it (`// increment i by 1`) | Token-overlap heuristic between comment text and the next statement identifiers; flag when overlap is near total and the comment adds no noun outside the code | Zero-information comment; maintenance burden that will drift | A comment restating *why* a surprising step is needed; a required doc-comment for a public API; a legally or regulator-mandated annotation | **B/C** |
| 10 | Docstring or README contradicting behaviour | Compare documented parameter names/return type with the actual signature (`darglint`, `pydocstyle` *(unverified)*); diff-scan for docs untouched while behaviour changed | Documentation drift, an active source of wrong decisions | Docs describing intended contract while implementation is mid-migration and the gap is deliberately tracked | **B/C** |
| 11 | Mock-only or tautological test (`assert True`; only asserts that a mock was called) | Parse test bodies: flag tests whose assertions reference only mock/spy objects or constants; confirm with mutation testing (`mutmut`, `Stryker`) - a surviving mutant on covered lines proves the test asserts nothing *(tool behaviour unverified)* | The test cannot fail when the behaviour breaks; coverage is inflated | Contract tests that legitimately assert a collaborator was invoked (an outbound call *is* the behaviour); smoke tests asserting only that construction does not throw | **C** |
| 12 | Speculative generality: interface with exactly one implementation, factory with one product, config key with one caller, unused parameter | Count implementers per interface and callers per config key across the repo; flag count == 1 with no test double | Abstraction is currently unpaid for; matches the "Speculative Generality" catalogue entry *(catalogue reference unverified)* | Required by a DI container, mocking framework, or test seam; a published extension point; a boundary deliberately placed to isolate a third-party dependency; a second implementation landing in a known upcoming change | **C** |
| 13 | Defensive check against a state the type system forbids | Flag null/None checks on non-nullable types and range checks on already-constrained enums | Redundant branch, untestable, dilutes real validation | **Trust-boundary validation is always legitimate**: any input crossing process, network, file, plugin, or FFI edges. Also legitimate when the guarantee is only conventional, not enforced | **C** |
| 14 | Over-long, over-commented, over-structured implementation of a trivial task | Ratio of statements to cyclomatic complexity, comment-to-code ratio, and function length versus repo percentiles | Effort was spent on ceremony rather than behaviour | Genuinely complex domain rules; a function whose length comes from an unavoidable exhaustive mapping; house style that mandates documented public members | **D** |
| 15 | Stylistic tells (emoji, "Note that...", headings in comments, uniform hedging) | Textual pattern match | **Nothing about code quality.** At most a weak hint about authorship, which is not a defect | House style; accessibility or i18n conventions; a human who writes that way | **D** |

## Reading the four strong signals correctly

### Duplication (signals 1 and 3)

GitClear defines a duplicated block as **five or more consecutive repeated meaningful lines**, and separates changed lines into added, updated, deleted, moved, and copy/pasted classes. The moved-line class is the one that captures refactoring, and its collapse from ~25% to under 10% between 2021 and 2024 is the single most useful number in the corpus: it says the industry stopped consolidating while it accelerated production. An agent auditing a repository should therefore report **the ratio of moved to copy/pasted lines in recent history**, not just an absolute clone count, because the ratio is what changed.

Limitations stated or evident in that work: it is observational, it attributes nothing to a specific assistant, adoption is inferred rather than instrumented per commit, the corpus is weighted toward the repositories GitClear can see, and "meaningful lines" and churn windows are proprietary operational definitions rather than a community standard *(exact definitions beyond the public summary unverified)*.

### Churn (signal 2)

Churn is only meaningful against a per-repository baseline. GitClear reports roughly 3.1-3.3% rising to ~5.7%; a repository whose normal churn is 10% is not automatically diseased. Churn on an unmerged branch is development, not debt.

### Security (signal 4)

The Pearce corpus is the strongest reason to treat generated code as untrusted input rather than as reviewed code. Two honest caveats: the 89 scenarios were **deliberately chosen to be CWE-prone**, so ~40% is a base rate for adversarially selected prompts and not a repository-wide expectation; and the study targets a 2021-era Copilot, so the absolute number should not be quoted as current. The durable conclusion is procedural - review, test, and run static analysis on generated code - not the percentage.

## The fairness requirement

This is the part an audit tool gets wrong most often. Every signal above has a population of legitimate instances, and several of them are *majority* legitimate in ordinary repositories:

- **Defensive code at trust boundaries is correct engineering, not slop.** The same `if (input == null) throw` is noise inside a private helper and mandatory in a public entry point. The signal must be scoped by position in the call graph, never by shape alone.
- **Single-implementation interfaces are frequently required**, by dependency-injection containers, by mocking frameworks that cannot fake concrete types, and by module boundaries that exist to keep a third-party type out of the domain. Counting implementers is a hint, not a verdict.
- **Duplication is sometimes correct.** Two call sites that look alike but belong to different domains should stay apart; premature extraction produces a worse defect than the duplication it removed. Clone hits need a same-reason test, not just a same-text test.
- **Broad exception handlers are load-bearing at process edges**: request handlers, job runners, plugin hosts, and UI event loops legitimately catch everything to avoid taking the process down.
- **Comments that look redundant may encode a constraint** the code cannot express - a workaround for an upstream bug, an ordering requirement, a regulatory rule. Deleting them is irreversible information loss.
- **Unreferenced symbols are the most dangerous category to auto-delete**, because reflection, DI, serialization, dynamic imports, build-time codegen, and cross-repository consumers are all invisible to static reference search.
- Every one of these patterns is abundantly present in code written entirely by humans. None of them is evidence of AI authorship, and no audit should claim otherwise.

## Operating rules for an automated audit

1. **Never accuse authorship.** Report the defect and the rule it violates. Authorship is undetectable and irrelevant to the fix.
2. **Prefer the pre-existing rule.** If a linter, compiler, or analyser already encodes the signal, cite that rule identifier; it is arguable in review, whereas "this looks AI-generated" is not.
3. **Grade before acting.** A and B signals may drive an automatic fix proposal. C signals produce a question for the author. D signals are never actionable alone.
4. **Scope to the diff first.** Repository-wide slop audits produce hundreds of findings with no owner; the changed lines have one.
5. **Require a second, independent confirmation before deleting anything.** For dead code: static reference search *plus* runtime coverage or a build with the symbol removed. For a useless test: coverage *plus* a surviving mutant. For duplication: clone hit *plus* a same-reason judgement.
6. **Baseline against the repository, not against an absolute.** Churn, comment density, and function length are only interpretable as percentiles of the surrounding codebase.
7. **Treat trust boundaries as protected.** Validation, authorization, error handling that prevents data loss, and accessibility affordances are out of scope for slop removal regardless of how redundant they look.
8. **Report the exoneration you checked.** A finding that does not state which legitimate explanation was excluded is not a finding.

## Dead code versus slop

These are different problems and should not be audited by the same pass. Dead code is a **reachability** question with a decidable core and well-known blind spots (reflection, DI, dynamic dispatch, public API surface, cross-repo consumers). Slop is a **cost/benefit** question about code that runs but should not exist in that form. Dead-code findings can reach an automated proposal quickly; slop findings usually cannot, and the honest output is a ranked report with the evidence attached.

## Verification status and limitations

- GitClear figures and definitions, and the Pearce et al. figures, were verified against the primary sources on the research date.
- **Every linter rule identifier, tool name, style-guide clause, and refactoring-catalogue reference in this document is marked `(unverified)` and was written from prior knowledge**: the web-search budget was exhausted before first-party vendor documentation (GitHub Copilot responsible-use and duplication-detection pages, OpenAI and Anthropic code-generation limitation docs), official style guides (Google, PEP 8, Rust API guidelines, .NET docs), and the Fowler refactoring catalogue entry for Speculative Generality could be retrieved. They should be confirmed before being quoted as authority.
- No study located here measures whether removing these patterns improves any outcome. The evidence base establishes that the patterns became more frequent and that they are recognised defects; it does not establish the value of a cleanup campaign.
- No reliable detector of LLM authorship for source code was located, and this document assumes none exists.
- Academic evidence on clone rates specifically *within* LLM output, on correctness benchmarks, and on maintainability was not retrieved in this pass and is a known gap `(unverified)`.
