# Dead code: a detection taxonomy

**Research date:** 2026-08-31
**Question:** "Dead code" names at least seven genuinely different properties. Each is decided by
a different analysis, at a different confidence, with a different deletion risk. Which are they,
and what can actually be proven about each?

## Executive conclusion

No tool decides whether code is dead. Every tool decides a **decidable approximation** of
deadness, and the identity of that approximation — not the tool's confidence score — determines
whether deletion is safe. "Unused method" from a reference-graph linter and "unreachable
function" from a whole-program reachability tool are different claims about different properties,
with different failure modes, even when they name the same symbol.

Classify the finding before deleting it. Classes 1 and 2 are compiler-grade facts, nearly free to
remove. Classes 3 and 4 are assumption-bound, and their assumptions — no reflection, closed world,
complete entrypoint set — are exactly the ones real systems violate. Class 5 is not a static
property at all. Classes 6 and 7 are not deadness; they are maintenance liabilities routinely
misfiled as deadness.

## The undecidability floor

The single most important constraint in this file; everything else follows from it.

"Is this statement executed on some input?" is a non-trivial semantic property of programs, hence
undecidable by Rice's theorem. **Reduction:** given an arbitrary program `P`, construct
`Q = { run P; S }`. Statement `S` is live exactly when `P` halts, so a perfect dead-code detector
decides halting.

**The specifications concede this.** The JLS does not attempt exact reachability: it defines
unreachability through a deliberately limited set of structural rules and, except for loop
conditions that are constant expressions, the compiler does **not** reason about expression values
([JLS SE 25 §14.22](https://docs.oracle.com/javase/specs/jls/se25/html/jls-14.html#jls-14.22)).
So `while (n > 7)` with `int n = 5;` compiles, while a statement after `while (true) { }` is a
compile-time **error**. The JLS also keeps the `if (false) { ... }` body reachable on purpose, so
the `static final boolean DEBUG = false;` conditional-compilation idiom stays legal
([JLS SE 14 §14.22](https://docs.oracle.com/javase/specs/jls/se14/html/jls-14.html#jls-14.22)).

**"Unreachable" therefore never means "logically impossible."** It means "unreachable under this
tool's stated rules." Two tools with different rules will legitimately disagree, and neither is
buggy.

## Sound versus complete

| Term (as used here) | Definition | Failure mode | Who errs this way |
| --- | --- | --- | --- |
| **Sound for deletion** | Everything reported dead really is dead; no false positives | Misses real dead code | Compiler optimizers, DCE/DSE passes, JLS unreachability, Go `deadcode` |
| **Complete** | All dead code is reported; no false negatives | Reports live code as dead | Reference-graph "unused symbol" scanners, coverage-based culling |

An optimizer must be sound for deletion — silently removing live code changes program meaning —
so it under-reports by construction. A hygiene scanner is tuned toward completeness: it would
rather list a live-but-reflectively-reached method than let real cruft survive, because a human
reviews the list. Go's `deadcode` states its position directly: the analysis is conservative around
function values, interfaces, and reflection, so **some genuinely dead functions go unreported**
([go.dev/blog/deadcode](https://go.dev/blog/deadcode)).

Beware the terminology inversion: compiler documentation uses "sound" for the *transformation*
(preserves semantics, i.e. sound-for-deletion), while verification work often uses "sound" for
"reports every instance" — the opposite pole.

**No tool is both.** That is the undecidability floor restated operationally. Any tool claiming
both is restricting the language, restricting the program (closed world), or wrong.

## Master table

| # | Class | Formal definition | Analysis required | Tool examples | Confidence | Deletion risk |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Unreachable code** | No control-flow path from the function entry reaches `S`, under the language's stated conservative rules | Intraprocedural control flow | `javac` (compile **error**), C# `CS0162`, rustc `unreachable_code`, ESLint `no-unreachable` | Very high, relative to the rule set | **Negligible** — semantics-preserving by construction |
| 2 | **Dead store** | The value assigned to `v` at point `p` is not live: no path from `p` reads it before overwrite or scope exit | Intraprocedural dataflow (live-variable) | LLVM `dse`/`dce`/`adce`, GCC `-ftree-dce`/`-fdse`, ruff `F841` | Very high in-function; falls with aliasing, `volatile`, FFI | **Negligible to low** — risk is the right-hand side, not the store |
| 3 | **Unused entity** | A declared symbol has zero static references in the analyzed source set | Name resolution over a reference graph | IDE "unused symbol", `ts-prune`, `knip`, `vulture`, Roslyn `IDE0051` | Only as strong as "every reference is static" | **High** — reflection, DI, serialization, string dispatch are invisible |
| 4 | **Unreachable from entrypoint** | Statically referenced, but no call-graph path reaches it from any entrypoint | Whole-program call-graph reachability, closed world | Go `deadcode`, tree-shaking, LLVM/LTO global DCE, .NET trimmer, GraalVM `native-image` | Sound only under its assumptions; violations are silent | **High to very high** — failures surface at runtime, not build time |
| 5 | **Never executed in production** | Reachable and referenced, but no execution observed over a measurement window | Dynamic instrumentation: coverage or telemetry | coverage.py, Istanbul/nyc, JaCoCo, production telemetry | Bounded by workload and window only | **Very high alone** — absence of evidence; the window is never complete |
| 6 | **Redundant / duplicated** | Two or more fragments are equivalent; all are live | Clone detection (token, AST, metric) | PMD CPD, jscpd, Simian | High for Type-1/2, weak for Type-3/4 | **Not a deletion target** — a consolidation target |
| 7 | **Obsolete / superseded** | A newer implementation is preferred, but the older one is still wired and reachable | None; requires intent, history, ownership | Git history, deprecation markers, ADRs, review | Not statically decidable | **Not decidable by tooling** — a migration, not a delete |

## Class 1 — Unreachable code

**Property.** Intraprocedural, control-flow-only, syntactic: no path from the function entry
reaches `S` under the language's flow rules. **Detection:** a control-flow graph plus reachability
from the entry block — decidable, linear, computable inside a single compilation unit.

Severity ranking shows how much each language trusts the analysis. Java makes it a **compile-time
error** ([JLS SE 25 §14.22](https://docs.oracle.com/javase/specs/jls/se25/html/jls-14.html#jls-14.22)).
C# makes it level-2 warning `CS0162`, raised after `return`, `throw`, `break`, or `continue`, on
constant conditions such as `if (false)`, on infinite loops with no reachable exit, and on a
bypassing `goto` ([CS0162](https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0162)). Rust uses
the warn-by-default lint `unreachable_code`, JavaScript the ESLint rule `no-unreachable`
(unverified). Java making it an *error* is the strongest evidence that the class is trusted — and
that is affordable precisely because the rules are conservative. Note that C# flags `if (false)`
while Java deliberately does not: **same class, different rule sets.**

**Deletion risk: negligible.** Removing a statement no path reaches cannot change observable
behaviour. The caveat is a macro or generator that emits the unreachable form deliberately;
delete at the generator, not at the output.

## Class 2 — Dead store

**Property.** A *dataflow* property, not a control-flow one. An assignment to `v` is dead if `v` is
not **live** immediately after it — no path from that point reads `v` before overwrite or scope
exit. Textbook live-variable analysis: a backward may-analysis over the CFG, solved as a monotone
dataflow fixpoint, decidable within a function.

**Detection.** LLVM runs `dse` (Dead Store Elimination), `dce`, and `adce` (Aggressive DCE) as
distinct passes; `adce` is optimistic — it assumes instructions dead until proven live. GCC exposes
`-ftree-dce`, `-fdce`, `-fdse`. At source level, ruff `F841` flags a local assigned but never used.
(unverified)

**Where confidence drops.** The analysis is only as good as its memory model: pointer aliasing,
escaping references, `volatile`, atomics, memory-mapped I/O, and FFI calls all force it to assume
a store may be observed. Compilers respond by refusing to eliminate; source-level linters often
do not model these at all — which is why an `F841` finding is a *style* signal while an LLVM DSE
decision is *correctness-preserving*.

**Deletion risk: negligible to low.** The residual risk is never the store, it is the right-hand
side. `x = expensiveCallWithSideEffects()` has a dead store and a live call: delete the binding,
keep the call, or prove the call pure.

## Class 3 — Unused entity

**Property.** A *name-resolution* property over a reference graph: a declared function, class,
field, import, parameter, or variable with zero static references in the analyzed source set.

This class dominates linter output and is the one most often mistaken for a proof. Its
correctness rests entirely on one assumption — **every way the entity can be reached is a static
reference the analyzer can see** — and that assumption is false in most production systems.

| Mechanism | Why the reference graph misses it |
| --- | --- |
| Reflection (`Class.forName`, `getMethod`, `Activator.CreateInstance`) | The target is a runtime string |
| Dependency injection, service locators | Wiring lives in configuration, not code |
| Serialization, ORM, data binding | Fields are read by name by a framework |
| Public API surface of a library | Callers are outside the analyzed set by definition |
| Test-only or tooling-only entrypoints | Present, but often excluded from the analyzed set |
| String-keyed dispatch, event buses, message names | The edge exists only at runtime |
| Conditional compilation, platform-specific builds | The referencing branch is not in this configuration |
| Native/FFI callbacks, assembly, linker aliasing | The caller is not in the analyzed language |

**Analysis-set framing is a first-class error source.** "Unused" always means "unused *within the
set I analyzed*." A scan excluding `tests/`, generated code, or a sibling package reports heavily
used entities as unused. Record the analyzed set alongside every finding.

**Deletion risk: high.** These findings require a second, independent line of evidence before
deletion: a repository-wide search for the symbol name as a *string literal*, a reflection/DI
configuration audit, an API-surface check, or class-5 telemetry.

## Class 4 — Unreachable from entrypoint

**Property.** The symbol *is* statically referenced — so class 3 will not flag it — but its whole
subgraph is unreachable from any entrypoint. Two functions that only call each other are the
canonical example. This is what whole-program tools compute; it strictly subsumes class 3.
**Detection:** build a call graph, mark the entrypoints, compute forward reachability, report the
complement. Interprocedural and whole-program, hence a build-time or link-time step.

**The reference implementation is Go's `deadcode`.** It identifies functions unreachable from a
program's `main` and initialization functions, builds an SSA-like intermediate representation, and
applies **Rapid Type Analysis**. RTA iterates over three facts at once: directly called functions;
dynamic calls through interface methods; and concrete types converted to interfaces. The
precision gain is the third — an interface method's possible targets are restricted to methods of
concrete types that actually became reachable through a conversion, rather than every
implementing type. The post states its blind spots plainly: conservative around function values,
interfaces, and reflection, with further blind spots for calls originating only in assembly or
through `go:linkname` ([go.dev/blog/deadcode](https://go.dev/blog/deadcode)). **This is what an
honest class-4 tool looks like: it publishes the shape of its own unsoundness.**

Other ecosystems compute the same property with weaker or differently-scoped call graphs: Rollup
and webpack tree-shaking rely on ES-module static structure plus honest `sideEffects`
declarations; LLVM global DCE gets a whole-program view only once the linker sees all objects;
the .NET IL trimmer emits trim warnings where reflection defeats the analysis; GraalVM
`native-image` and `jlink` require reflection configuration files. (unverified)

**The closed-world assumption, stated precisely.** All code that can ever execute is present and
visible at analysis time: no runtime class loading, no bytecode generated on the fly, no
reflective lookup by an unresolvable name, no plugin loaded from a path. Under that assumption
the result is sound. Violate it and the tool does not warn you — the program fails at runtime with
a missing method or type, possibly only on a rare path. AOT toolchains ship reflection
configuration files for exactly this reason: they are manual repairs to a broken closed-world
assumption. (unverified)

**Deletion risk: high to very high.** Higher than class 3 in one specific way: a class-3 finding
is normally reviewed by a human who may recognize the symbol, whereas class-4 trimming is
automated and silent, and its failures appear in production rather than at build time.

## Class 5 — Never executed in production

**Property.** Reachable, referenced, compiled in, shipped — but never actually run by real traffic
during a measurement window. This is a **dynamic** property: no static analysis produces it and
none refutes it. Coverage instrumentation records which lines or branches executed during a
specific run of a specific workload (coverage.py, Istanbul, JaCoCo) (unverified); production
telemetry measures the same property under real traffic and is strictly more informative here.

**The inference error to refuse.** Low coverage does **not** mean dead. It means one of: the code
is dead; the code is live but untested; the code handles a rare path (error recovery, retry,
migration fallback); the measurement window excluded the triggering workload; or instrumentation
missed that process, thread, platform, or build configuration. Only the first justifies deletion,
and coverage cannot distinguish it from the others. Error and recovery paths are systematically
the least covered and the most catastrophic to remove.

**Correct use.** Coverage and telemetry are *corroborating* evidence for a class-3 or class-4
finding, not independent evidence. "Statically unreferenced **and** six months of production
telemetry showing zero invocations" is a defensible deletion case; either alone is not.

## Class 6 — Redundant or duplicated code

**Property.** Two or more fragments compute the same thing, and every one of them may be fully
live. This is not deadness; it is in the taxonomy only because it is routinely misfiled as
deadness by people describing a codebase as "full of dead code." Clone-detection work
distinguishes Type-1 (exact), Type-2 (renamed identifiers), Type-3 (near-miss) and Type-4
(semantically equivalent, syntactically different); confidence falls sharply across that sequence,
and general Type-4 detection is unsolvable for the same undecidability reason as everything else
here. (unverified)

**The action is consolidation, not deletion.** Deleting one copy without redirecting its callers
deletes live code. Extract the shared behaviour, redirect every call site, then remove the
now-unused originals — at which point they have become a *class 3* finding with established
provenance, which is the safest route into class 3 that exists.

## Class 7 — Obsolete or superseded code

**Property.** A second implementation replaced a first, but the first is still referenced, still
reachable, and still executes for some callers. Nothing static distinguishes it from healthy
code; the distinguishing fact is *intent*, living in commit history, deprecation markers, design
records, and the heads of the people who ran the migration. An abandoned V1 path still serving 3%
of traffic is not dead — it is an **incomplete migration**, and deleting it breaks that 3%.

Signals, none of them proofs: a deprecation marker (explicit intent, silent about remaining
callers); two implementations behind a permanently-on flag (migration finished, cleanup did not);
naming drift such as `FooLegacy` or `FooV2` (strong prior, zero evidence); an old
last-substantive-commit date (weak — stable code also stops changing); and a commit message
announcing the replacement, the most reliable single artifact.

**Deletion risk: not decidable by tooling.** The unit of work is a migration — enumerate callers,
migrate or deprecate each, remove the flag, then delete. Compressing that into a delete is how
outages happen.

## What each tool actually reports

Most tools conflate classes 3 and 4; most users conflate 3, 4, and 5. Read every finding as a
claim about a specific class.

| Tool / feature | Claims to find | Actually computes | Class |
| --- | --- | --- | --- |
| `javac` unreachable-statement error | "dead code" | Value-insensitive CFG reachability under JLS §14.22 | 1 |
| C# `CS0162` | "unreachable code detected" | Intraprocedural CFG reachability, including constant conditions | 1 |
| rustc `unreachable_code`, ESLint `no-unreachable` | "unreachable code" | CFG reachability within one function or module | 1 |
| LLVM `dse`/`dce`/`adce`, GCC `-ftree-dce` | "dead code elimination" | Live-variable dataflow plus intra-module value reachability | 2 |
| ruff `F841`, IDE "value never read" | "unused variable" | Liveness of the binding, usually without side-effect analysis of the RHS | 2 |
| IDE "unused symbol", `IDE0051`, `ts-prune`, `knip`, `vulture` | "unused code" | Zero static references **inside the analyzed set** | 3 |
| Go `deadcode` | "unreachable functions" | RTA call-graph reachability from `main`/`init`; conservative on reflection, function values, `go:linkname`, assembly | 4 |
| Rollup / webpack tree-shaking | "removes unused exports" | Module-graph reachability plus `sideEffects` declarations | 4 |
| .NET trimmer, GraalVM `native-image` | "removes unused code" | Closed-world call-graph reachability; warns where the assumption breaks | 4 |
| coverage.py, Istanbul, JaCoCo | "uncovered lines" | Lines or branches not executed in this run | 5 |
| PMD CPD, jscpd, Simian | "duplicated code" | Token or AST clone similarity | 6 |
| Deprecation markers, git history | — | Nothing automatic | 7 |

**The single decision rule.** Deletion is justified when the class of the finding matches the
class of the evidence held. Classes 1 and 2 carry their own evidence. Classes 3 and 4 require a
second, independent line — a string-literal search, a reflection/DI configuration audit, an
API-surface check, or class-5 telemetry. Classes 6 and 7 are not deletions at all; they are
refactors and migrations that *terminate* in a class-3 deletion.

## Empirical grounding

Industrial studies report substantial fractions of production systems being unreachable or never
executed, but none could be re-verified against a primary source in this session. Treat as leads,
not citable numbers: Eder et al., *How much does unused code matter for maintenance?* (ICSE 2012,
industrial .NET system instrumented in production); Boomsma, Hoeve, Gross, *Dead code elimination
for web systems written in PHP* (ICSME 2012, industrial PHP system, large fraction of files never
executed in the observation window); Romano, Scanniello et al. on detecting unused Java methods
by static reference analysis. (unverified)

The methodological point survives whatever the percentages are: each study measures a *specific
class* — usually class 5 or class 3 — so their headline numbers are not comparable with each
other. When citing prevalence, always state which class was measured and over what window.

## Application to agent-generated code

Agent-written code concentrates in classes 3, 6, and 7, not 1 and 2: unused helpers and
abstractions built for a requirement never stated (3), a second implementation of an existing
repository utility because the existing one was not found (6), and a superseded path left wired
after a mid-task change of approach (7). Compilers catch none of these — classes 1 and 2 are what
compilers catch, and they are the classes agents rarely produce. An audit aimed at agent output
must therefore rest on reference-graph and clone analysis with human adjudication, not on
compiler diagnostics. (Analytical claim, not a measured result.)

## Source verification status

Retrieved and quoted from primary sources in this session:
[JLS SE 25 §14.22](https://docs.oracle.com/javase/specs/jls/se25/html/jls-14.html#jls-14.22) and
[JLS SE 14 §14.22](https://docs.oracle.com/javase/specs/jls/se14/html/jls-14.html#jls-14.22)
(conservative, value-insensitive reachability; compile-time **error**);
[C# CS0162](https://learn.microsoft.com/en-us/dotnet/csharp/misc/cs0162) (trigger conditions);
[Finding unreachable functions with deadcode — The Go Blog](https://go.dev/blog/deadcode)
(SSA plus Rapid Type Analysis, and the declared blind spots).

Cited from prior knowledge and **not** re-verified here — each marked `(unverified)` at its use
site, and to be confirmed before this document is treated as authoritative: rustc
`unreachable_code`, ESLint `no-unreachable`, LLVM Passes, GCC optimize options, ruff `F841`, Rollup and
webpack tree-shaking, .NET trim warnings, GraalVM `native-image` closed-world documentation,
coverage.py, Istanbul, JaCoCo, the clone-type taxonomy, and all three empirical studies.

The undecidability argument and the sound/complete framing are derivations, not citations. They
follow from Rice's theorem together with the JLS's own value-insensitive reachability rules
([JLS SE 25 §14.22](https://docs.oracle.com/javase/specs/jls/se25/html/jls-14.html#jls-14.22)) and
Go `deadcode`'s own statement that it under-reports
([go.dev/blog/deadcode](https://go.dev/blog/deadcode)).

