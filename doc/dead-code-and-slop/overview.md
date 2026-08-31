# Dead code and AI slop: an audit evidence base

**Research date:** 2026-08-31
**Question:** what can an agent actually *prove* about "this code is dead" or
"this code is slop", and what must it rule out before acting on the finding?

## Executive conclusion

Two different problems are routinely audited under one name, and they have
different epistemics.

**Dead code is a reachability question.** It has a decidable core, documented
blind spots, and a deletion that evidence can justify. **Slop is a cost/benefit
question** about code that runs and should not exist in that form. It has no
decidable core; its findings terminate in a human judgement, not an automatic
fix. Conflating the two is the most common analytical error in this space:
a reachability result presented as a quality verdict, or a taste judgement
presented as proof.

Four conclusions hold across the whole corpus:

1. **No tool decides deadness.** Every tool decides a *decidable approximation*
   of it, and the identity of that approximation — not the tool's confidence
   score — determines whether deletion is safe. Perfect detection reduces to the
   halting problem, so every tool is either unsound for deletion or incomplete,
   never both ([dead-code-taxonomy.md](./dead-code-taxonomy.md)).
2. **A confidence score is not a probability.** Vulture's 60% tier is a fixed
   per-code-type heuristic its own README calls a "very rough" estimate, not a
   measured false-positive rate ([tooling.md](./tooling.md)).
3. **The false positives are silent.** The dangerous classes — reflection,
   dependency injection, serialization, engine wiring, deprecation windows —
   fail at runtime on a rare path, not at build time
   ([false-positives.md](./false-positives.md), [unity-and-csharp.md](./unity-and-csharp.md)).
4. **Slop amplifies pre-existing anti-patterns; it rarely invents new ones.**
   The measurable part is duplication, churn, and security-weak patterns; the
   rest is codified in linter rules that predate LLMs. Authorship itself is not
   detectable and is not the defect ([ai-slop-signals.md](./ai-slop-signals.md)).

## Reading order

| File | Answers |
| --- | --- |
| [dead-code-taxonomy.md](./dead-code-taxonomy.md) | Which property did the tool actually decide, and what is its deletion risk? |
| [tooling.md](./tooling.md) | What does each detector prove, where does it err, how is it suppressed? |
| [ai-slop-signals.md](./ai-slop-signals.md) | Which slop traits are measurable, with what evidence grade? |
| [false-positives.md](./false-positives.md) | Which mechanisms keep statically-unreferenced code alive? |
| [unity-and-csharp.md](./unity-and-csharp.md) | Why Unity defeats .NET static reachability, and what to check instead. |
| [safe-deletion.md](./safe-deletion.md) | How to prove a removal is safe, and how to make being wrong cheap. |

## The consolidated signal table

Every row pairs a mechanically detectable signal with the **legitimate reason
the code exists anyway**. A signal reported without its counter-indication
cleared is not a finding. `Ev` grades the primary evidence: **A** quantified
study, **B** codified in a linter/compiler rule, **C** catalogued but judged
qualitatively, **D** aesthetic only.

| # | Signal | Counter-indication that must be cleared | Ev |
| --- | --- | --- | --- |
| 1 | Unreachable statement (compiler CFG: `javac` error, `CS0162`, `no-unreachable`) | Emitted deliberately by a macro or generator — fix at the generator | B |
| 2 | Dead store (live-variable analysis, ruff `F841`) | The right-hand side has side effects; keep the call, drop the binding | B |
| 3 | Zero static references to a symbol | Reflection, DI, serialization, string dispatch, public API, external entry point, conditional compilation | B |
| 4 | Unreachable from every entry point (RTA, tree-shaking, trimming) | The root set is incomplete, or the closed-world assumption is violated by runtime loading | B |
| 5 | Exported and imported by no other module | Open-world repository: the export *is* the product; removal is a semver-major decision | B |
| 6 | Vulture 100% (unused argument, unreachable code) | Signature imposed by a callback or override contract | B |
| 7 | Vulture 60% (class, method, attribute) | Nearly everything: the tier is scope-insensitive and name-based; corroborate before using | C |
| 8 | Zero coverage over a measurement window | Untested-but-live code, rare error/recovery/migration path, or a window that missed the workload | C |
| 9 | Duplicated block of 5+ consecutive meaningful lines | Generated code, deliberately explicit test fixtures, two call sites in different domains | A |
| 10 | Copy-paste share high while moved/refactored share is near zero | Greenfield work has nothing to move; a pure bugfix legitimately moves nothing. Repo-level metric only | A |
| 11 | Lines rewritten within days of landing | Iterative development, spikes, an unmerged branch under review | A |
| 12 | SAST/CodeQL hit on the changed files | A test that asserts the vulnerability, or a documented reviewed exception | A |
| 13 | Empty or swallowing catch block | Process-edge crash barrier: supervisor loop, request handler, job runner, plugin host, UI event loop | B |
| 14 | Interface with exactly one implementation | Required by a DI container or a mocking framework, a published extension point, a boundary isolating a third-party type | C |
| 15 | Test whose assertions touch only mocks or constants (surviving mutant) | Contract test where the outbound call *is* the behaviour; smoke test asserting construction does not throw | C |
| 16 | Comment restating the statement below it | It encodes a constraint the code cannot express: an upstream bug workaround, an ordering requirement, a regulatory rule | B/C |
| 17 | Defensive check against a state the type system forbids | Trust boundary — any input crossing process, network, file, plugin, or FFI edges | C |
| 18 | Unity member flagged unused by an IDE analyzer | `[SerializeField]`, engine messages, `UnityEvent` wiring, `.meta` GUID references from scenes and prefabs | B |
| 19 | Stylistic tells (emoji, hedging, headings in comments) | Nothing. House style or a human who writes that way; no evidentiary value | D |

## Cross-cutting rules

- **Establish closed world versus open world first.** In a library or SDK, zero
  in-repo callers is the *expected* state of the entire public surface, and a
  reachability tool measures nothing but the density of its own examples.
- **Write down the root set.** "Unreachable" is a function of the declared entry
  points, so it is a configuration artifact. Knip documents that one unreached
  entry cascades into dozens of findings.
- **Never treat a score as a probability.** Grade the *class* of the finding and
  the *class* of the evidence held; delete only when they match.
- **Require a second, independent line of evidence** for any unreferenced-symbol
  finding: a whole-repo string-literal sweep, a reflection/DI configuration
  audit, a public-surface classification, or telemetry.
- **Report the counter-indication you cleared.** A finding that does not state
  which legitimate explanation was excluded is not a finding.
- **Make being wrong cheap.** One logical deletion per commit, a message
  recording the searches that ran, and a pure-deletion diff that reverts alone.

## Verification status

Primary sources were retrieved and quoted for: the JLS unreachability rules, C#
`CS0162`, the Go `deadcode` blog post and its declared blind spots, Knip, ESLint
`no-unused-vars`, TypeScript `noUnusedLocals`, esbuild/Rollup/webpack tree
shaking, Vulture, Ruff `F401`/`F841`/`ERA001`, `cargo-machete`, jscpd, Semgrep,
coverage.py, the git pickaxe and `git blame` documentation, PEP 387, semver,
Meta's SCARF write-up, LaunchDarkly flag health, the Unity manual and script
reference pages cited in [unity-and-csharp.md](./unity-and-csharp.md), the
GitClear 2025/2026 reports, and Pearce et al. (arXiv:2108.09293).

Claims written from prior knowledge and **not** re-verified in this pass are
tagged `(unverified)` at their use site in each file; the largest gaps are
first-party vendor guidance on reviewing generated code, official style guides,
the refactoring catalogue entry for Speculative Generality, and the empirical
studies on dead-code prevalence. Confirm those before quoting them as authority.
