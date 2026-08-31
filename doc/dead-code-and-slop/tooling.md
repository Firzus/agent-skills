# Dead-code and unused-code detection tooling

**Research date:** 2026-08-31
**Scope:** what detection tools actually prove about "this code is dead", excluding C#/Unity tooling.
**Audience:** an agent deciding whether a reported finding justifies deleting code.

## Three questions, not one

Every tool below answers one of three different questions, and they are not interchangeable:

1. **Syntactic unused-ness** — a binding is declared in a scope and never read there. Cheap, local, near-zero false positives, near-zero reach (ESLint `no-unused-vars`, `noUnusedLocals`, rustc `unused_imports`).
2. **Graph-relative unreachability** — a symbol cannot be reached from a *declared* set of entry points. Powerful, but the answer is a function of the entry set, not of the code (Knip, `unimported`, Go's `deadcode`).
3. **Name-frequency heuristics** — a defined name never appears again in the scanned text. Language-agnostic, fast, structurally unable to model dynamic dispatch (Vulture, Python `deadcode`).

Go's `deadcode` blog post is the clearest primary statement of why (2) beats (3): a `goodbye` function reachable only through an interface no live code ever instantiates is dead, even though its name appears repeatedly in the file ([Go blog: Finding unreachable functions with deadcode](https://go.dev/blog/deadcode)). The same post states its analysis "is not sound" with respect to assembly callers and `go:linkname` aliasing — even reachability analysis has a horizon.

## JavaScript / TypeScript

### Knip — module-graph reachability

Two phases: a **build phase** starting from entry files that resolves every import into a project graph, and an **analysis phase** that only queries that graph. "A file is unused when no entry reaches it, an export is unused when no other file imports it, a dependency is unused when no file imports it" ([How Knip works](https://knip.dev/explanations/how-knip-works)).

Entity kinds reported: unused files, dependencies, devDependencies, unlisted dependencies, unlisted binaries, unresolved imports, unused exports, unused exported types, unused enum members, unused namespace members, duplicate exports, circular dependencies ([Issue Types](https://knip.dev/reference/issue-types)). `cycles` defaults to `warn`; `nsExports`/`nsTypes` are off by default.

The dominant false-positive class is documented by name: **a missing entry point cascades**. "One unreached entry can turn into dozens of findings" — the file looks unused, every file it imports looks unused, every export in those files looks unused, and every dependency only those files used looks unused. Stated causes of surprises: a missing entry for an unknown tool convention, a dynamic import that cannot be resolved statically, and transitively-resolved dependencies ([How Knip works](https://knip.dev/explanations/how-knip-works)).

Suppression is layered and actively discouraged at the bottom:

| Mechanism | Effect | Doc position |
|---|---|---|
| `entry` / `project` globs, plugins | Fix the graph | Preferred |
| `--production` (`!`-suffixed patterns) | Drops tests, stories, devDependencies | Preferred over ignore patterns |
| `ignoreExportsUsedInFile` | Export used only inside its own file | Preferred over ignoring the file |
| JSDoc/TSDoc `@public`, `@internal`, `@alias`, custom tags | Per-export exception | "usually not recommended … it hides issues" |
| `ignore`, `ignoreFiles`, `ignoreDependencies`, `ignoreBinaries` | Suppresses *reporting only* | Last resort |

Two statements matter operationally: ignore patterns "do not exclude files from the analysis, [they] only suppress the reporting of issues in those files", and running `knip --fix` before configuration converges "can lead to deleting code that your application relies on" ([FAQ](https://knip.dev/reference/faq)). Knip emits **configuration hints** and instructs you to resolve those *before* trusting any finding. Confidence is not numeric — it is the `error`/`warn`/`off` rule tiers ([Rules & Filters](https://knip.dev/features/rules-and-filters)).

Documented blind spots inside the graph: CommonJS member access (`const mod = require('./mod'); mod.fn()`) is untraced while destructuring is traced; exports consumed through an external library's callback API can escape tracing; conditional dependencies in config files may evaluate differently because Knip *executes* config files ([Resolve reported issues](https://knip.dev/guides/handling-issues)).

### ts-prune, depcheck, unimported — all superseded, all instructive

- **ts-prune** finds unused *exports* via ts-morph and distinguishes "used in module" exports. Its README declares it **in maintenance mode** and recommends knip. Limits: dynamic imports, string-based `require`, framework reflection, config files. Suppression: `// ts-prune-ignore-next`, `--ignore`/`--skip` regexes ([ts-prune README](https://github.com/nadeesha/ts-prune)).
- **depcheck** compares `package.json` against detected usage, with a "specials" layer of per-tool parsers (babel, eslint, webpack, jest, husky…) precisely because dependencies are referenced outside import syntax. "Depcheck is no longer actively maintained." It has a dedicated **False Alert** section: "the predefined rules may not be enough or may even be wrong" ([depcheck README](https://github.com/depcheck/depcheck)).
- **unimported** (archived) is worth quoting for its honesty about signal strength: unimported files "should be safe to delete", but unused dependencies are "hints that something might be wrong. It's no guarantee". Its entry-point fallback chain ended at `package.json#main`, which it warned about because that usually points at `dist` and "analyzing a bundled asset is likely to result in false positives" ([unimported README](https://github.com/smeijer/unimported)).

### ESLint `no-unused-vars` — AST-local, scope-precise

"Used" is defined operationally: called, constructed, read, passed as an argument, or read inside a nested function. A variable only declared or only assigned is **not** used, and self-modification (`z = z + 1`) is not a read. Unused recursive functions are reported ([no-unused-vars](https://eslint.org/docs/latest/rules/no-unused-vars)). Defaults: `vars: all`, `args: after-used`, `caughtErrors: all`. Suppression: `varsIgnorePattern`, `argsIgnorePattern`, `caughtErrorsIgnorePattern`, `destructuredArrayIgnorePattern`, or the `/* exported */` block comment — which has no effect in module or commonjs source types.

`@typescript-eslint/no-unused-vars` adds type awareness and `enableAutofixRemoval.imports`, defaulting to `false` with an explicit safety rationale: "Many codebases assume that all modules are side-effect free… If your codebase relies on side-effects caused by importing modules, you should leave this option set to false." The same page recommends this rule *over* the compiler options, because those are TSConfig-scoped, hardcode their exemption to leading `_`, and often block builds ([typescript-eslint no-unused-vars](https://typescript-eslint.io/rules/no-unused-vars/)).

### TypeScript `noUnusedLocals` / `noUnusedParameters`

File-local checks producing TS6133 "declared but its value is never read". `noUnusedParameters` exempts names starting with `_` ([noUnusedLocals](https://www.typescriptlang.org/tsconfig/noUnusedLocals.html), [noUnusedParameters](https://www.typescriptlang.org/tsconfig/noUnusedParameters.html)). Neither reports an **exported** symbol no other module imports — that is outside their analysis unit, and is exactly the gap Knip and ts-prune fill *(the compiler docs describe only the local-scope behavior; the exported-symbol exclusion follows from that scope and from typescript-eslint framing these options as covering "unused local variables or parameters")*.

### Bundler tree shaking — an optimization, not an audit

Tree shaking removes declaration-level dead code from the *output*. It never tells you which source is dead.

- **esbuild** scopes itself to "declaration-level dead code removal", requires ESM (it "does not work with CommonJS modules"), and its side-effect detection "is conservative": `"ab" + cd` and `foo.bar` are not side-effect free because `toString()` and getters can run, and even referencing a global identifier counts because it can throw `ReferenceError`. `/* @__PURE__ */` overrides this per call/new expression ([esbuild tree shaking](https://esbuild.github.io/api/#tree-shaking)).
- **Rollup** presets `safest`/`recommended`/`smallest` document exactly what each gives up: `smallest` implies `propertyReadSideEffects: false`, `moduleSideEffects: false`, `tryCatchDeoptimization: false`, `unknownGlobalSideEffects: false`, and "some semantic issues may be swallowed". It honours `@__PURE__` (call-level) and `@__NO_SIDE_EFFECTS__` (declaration-level), plus a `manualPureFunctions` list matched **solely by name** ([Rollup treeshake](https://rollupjs.org/configuration-options/#treeshake)).
- **webpack** separates the mechanisms: `sideEffects` "is much more effective since it allows to skip whole modules/files and the complete subtree", whereas `usedExports` "relies on terser to detect side effects in statements… It's too difficult to determine it reliably in a dynamic language like JavaScript." A CSS file imported purely for effect must be listed in `sideEffects` or it is dropped in production mode ([webpack tree shaking](https://webpack.js.org/guides/tree-shaking/)).

Knip's FAQ draws the boundary: tree shaking is an automatic build-time optimization on bundled production code, while Knip reports source-level clutter for review — and "dead code within a single file may slip through" Knip ([FAQ: Isn't tree-shaking enough?](https://knip.dev/reference/faq)).

## Python

### Vulture — name-based AST heuristics with published confidence

Vulture builds ASTs with `ast`, records defined and used names, and reports the difference. The model's decisive caveat is in its own README: "This analysis ignores scopes and only takes object names into account." It also warns that "static code analyzers like Vulture are likely to miss some dead code" and "code that is only called implicitly may be reported as unused" ([Vulture README](https://github.com/jendrikseipp/vulture)).

| Code type | Confidence |
|---|---|
| function/method/class argument, unreachable code | 100% |
| import | 90% |
| attribute, class, function, method, property, variable | 60% |

Values below 100% are "*very rough* estimates (based on the type of code chunk)"; `--min-confidence 100` reports only code "guaranteed to be unused **within the analyzed files**". The canonical false positive is in the README's own example: `getattr(greeter, "greet")` makes `greet` used, and Vulture reports it at 60% anyway.

Suppression, in the README's own preference order: **whitelist modules** (`--make-whitelist` generates real Python that can be syntax-checked against the codebase), then `--exclude` path globs, then `--ignore-names`/`--ignore-decorators` (e.g. `--ignore-decorators "@app.route"` for Flask), then leading-underscore names, then flake8-compatible `# noqa: F401`/`# noqa: F841` — discouraged as "visual noise". Config in `[tool.vulture]` of `pyproject.toml`; exit code 3 means dead code found. After deleting, **run it again**: removal exposes more dead code.

### Ruff — Pyflakes-derived, with per-rule fix safety

- **F401 `unused-import`** — fixes "are safe, except in `__init__.py` files", where removing third-party/stdlib imports is an *unsafe* fix "because the module's interface changes". Re-export intent is expressed via `from module import member as member` or `__all__`, both respected. Options: `lint.ignore-init-module-imports`, `lint.pyflakes.allowed-unused-imports` ([F401](https://docs.astral.sh/ruff/rules/unused-import/)).
- **F841 `unused-variable`** — function scopes only; fix marked **unsafe** "because removing an unused variable assignment may delete comments that are attached to the assignment". Exemption via `lint.dummy-variable-rgx`; does not cover unpacked assignments ([F841](https://docs.astral.sh/ruff/rules/unused-variable/)).
- **ERA001 `commented-out-code`** — the only rule here aimed at the commented-out-leftover shape. Ruff's own **Known problems**: "Prone to false positives when checking comments that resemble Python code, but are not actually Python code" ([ERA001](https://docs.astral.sh/ruff/rules/commented-out-code/)).

Scope boundary: F401/F841 are module- and function-local. Ruff has no whole-project unused-symbol rule.

### deadcode — project-wide DC rules with autofix

Fills exactly that gap, and says so: "ruff and flake8 don't have rules for unused global code detection, only for local ones F823, F841, F842." DC01–DC13 cover unused variable/function/class/method/attribute/name/import/property, unreachable `if` blocks, empty files, commented-out code, and code after terminal statements. Offers `--fix`/`--dry`, `# noqa: DC03` inline suppression, and a granular ignore matrix (`--ignore-names-if-inherits-from`, `--ignore-bodies-if-decorated-with`, `--ignore-definitions-if-inherits-from`, …). Its **Known limitations** carry the decisive one: "In case there are several definitions using the same name — they all won't be reported if at least one usage of that name is being detected" ([deadcode README](https://github.com/albertas/deadcode)).

## Rust

- **`dead_code`** (warn-by-default) "detects unused, **unexported** items". Silence by leading underscore, by adding `pub` if the item is meant to be public, or by `#[allow(dead_code)]`. It documents a real behavioral hazard: "Removing fields that are only used for side-effects and never read will result in behavioral changes" — when a field acts on drop, or when its type carries an auto trait such as `Send`/`Sync`/`Unpin`; use `#[allow(dead_code)]` or `PhantomData` respectively ([rustc lints: dead-code](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html#dead-code)). The word *unexported* is the whole story: adding `pub` silences the lint without making the code any more used, so in a library crate `dead_code` proves nothing about the public API.
- **`unused_imports`** — same family; the documented escape is adding a visibility modifier when re-export was the intent ([unused-imports](https://doc.rust-lang.org/rustc/lints/listing/warn-by-default.html#unused-imports)).
- **`cargo-udeps`** — unused `Cargo.toml` entries; **requires nightly to run** (`cargo +nightly udeps`) though it compiles on stable. Its **Known bugs**: "Some unused crates might not be detected. This includes crates used by std and its dependencies as well as crates that are already being used by dependencies of the studied crate", and crates are handled per-name, so two versions of one name are a problem. Suppression via `[package.metadata.cargo-udeps.ignore]` with `normal`/`development`/`build` keys — the README's own example ignores a crate used only in doc-tests, "which `cargo-udeps` cannot check" ([cargo-udeps README](https://github.com/est31/cargo-udeps)).
- **`cargo-machete`** — the same job "in a fast (yet imprecise) way", on stable; exit 1 means at least one unused dependency. Documented false positives: build-script-generated usage (its example ignores `prost`) and crates whose import name differs from the package name (`rustls-webpki` → `webpki`). Two suppression tables — `ignored` (blanket) and `renamed` (keeps future detection alive) — plus `--with-metadata`, which improves accuracy but "may modify the `Cargo.lock` files in your projects" ([cargo-machete README](https://github.com/bnjbvr/cargo-machete)).

## Go — the reference implementation of reachability

`golang.org/x/tools/cmd/deadcode` type-checks, lowers to a compiler-like IR, then runs **Rapid Type Analysis** from each main package's `main` and package-initializer functions. Per reachable function it collects direct calls, dynamic interface-method calls, and **types converted to an interface** — the last set is what stops it assuming every type-compatible method is a call target. The fixpoint over (interface method calls × instantiated concrete types) yields the live set ([Go blog: deadcode](https://go.dev/blog/deadcode)). Three properties worth internalizing:

- **Sound about dynamic dispatch**: "if it reports a function as dead code, it means the function cannot be called even through these dynamic mechanisms." **Unsound about foreign code**: assembly callers and `go:linkname`.
- Whole-program only — "you can't start from a library package". `-test` supplies test binaries as entries instead, and the blog frames the result as a coverage statement, not a deletion order: "a sign that your test coverage could be improved."
- `-whylive=<symbol>` prints the call chain keeping a symbol alive — the inverse query almost no other tool answers.

Staticcheck's `unused` check (U1000) models the same problem with an explicit table of "uses" axioms in its source header: packages use exported types/functions/variables/constants and `init`; all interface methods are marked used "even if they never get called… to accommodate sum types"; "any concrete type implements all known interfaces"; variable *reads* use variables while writes do not, except in tests; and "if one constant out of a block of constants is used, mark all of them used" ([go-tools `unused/unused.go`](https://github.com/dominikh/go-tools/blob/master/unused/unused.go)). That header is the best available worked example of the arbitrary-but-necessary judgment calls hidden inside any "unused" verdict.

## Cross-cutting tooling

**jscpd** implements **Rabin-Karp** over tokenized source across 224+ formats ([jscpd README](https://github.com/kucherenko/jscpd)). Thresholds: `--min-lines` (default 5), `--min-tokens` (default 50). Modes: `strict` (all tokens including whitespace), `mild` (default; ignores empty/newline tokens), `weak` (also ignores comments). `--threshold` turns a duplication percentage into a non-zero exit; `--skipLocal` drops same-directory clones ([jscpd v4 docs](https://github.com/kucherenko/jscpd/blob/master/docs/typescript.md)). It measures token-level clone mass — a refactoring signal, never a deletion signal.

**Semgrep** is the escape hatch when a slop shape has no off-the-shelf rule (a wrapper that only forwards, a redundant try/except, generated boilerplate). A rule requires `id`, `message`, `severity` (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`, legacy `INFO`/`WARNING`/`ERROR` still accepted), `languages`, and exactly one of `pattern`/`patterns`/`pattern-either`/`pattern-regex`. Composition: `pattern-not`, `pattern-inside`, `pattern-not-inside`, `metavariable-pattern`, `metavariable-comparison`, `focus-metavariable`; `paths` scopes a rule, `fix` supplies autofix ([Semgrep rule syntax](https://semgrep.dev/docs/writing-rules/rule-syntax)). It matches syntax, so it can prove shape but never reachability.

**Coverage is the most seductive false signal.** Vulture's README says "coverage finds unused code more reliably than Vulture, but requires all branches of the code to actually be run" — and that conditional does enormous work. coverage.py's FAQ documents why "not executed" ≠ "unused": "The `def` and `class` lines in your Python file are executed when the file is imported… They run even if you never call the functions", so an untested module still shows nonzero coverage; function bodies can appear executed while their `def` lines do not, if coverage started after import; stale data can make unexecutable lines appear executed unless you `coverage erase`; and a missing line is a statement not executed **by the runs you performed** ([coverage.py FAQ](https://coverage.readthedocs.io/en/latest/faq.html)). Coverage yields false positives for deletion in exact proportion to the incompleteness of your tests and inputs: strong as corroboration, very weak as a primary signal.

## Comparison

| Tool | Entity kinds detected | Analysis model | Dominant false-positive class | Suppression mechanism |
|---|---|---|---|---|
| **Knip** | files, exports, exported types, enum/namespace members, deps, devDeps, binaries, duplicates, cycles | Import/module graph from entry files + framework plugins | Missing/unreached entry → cascading findings; dynamic imports; CJS member access | `entry`/`project`/plugins, `--production`, JSDoc tags, `ignore*` (last resort) |
| **ts-prune** | unused exports | ts-morph over the tsconfig program | Dynamic imports, framework reflection | `// ts-prune-ignore-next`, `--ignore`/`--skip` |
| **depcheck** | unused / missing deps and devDeps | Dependency manifest + per-tool "specials" parsers | Deps referenced outside import syntax | `--ignores`, `--ignore-patterns`, `.depcheckrc` |
| **ESLint `no-unused-vars`** | vars, args, caught errors, TS type bindings | AST-local scope analysis | Write-only variables kept deliberately; side-effect imports on autofix | `*IgnorePattern` regexes, `/* exported */`, `eslint-disable` |
| **`noUnusedLocals`/`Parameters`** | unused locals, unused parameters | TypeScript compiler, per-file | Blocks builds; cannot see cross-module usage | Leading `_` (parameters), disable the flag |
| **Rollup / webpack / esbuild** | unreachable declarations in the *bundle* | ESM import/export graph + side-effect inference | Impure code assumed pure (`sideEffects: false`, `@__PURE__`) → silent behavior change | `sideEffects` field, `moduleSideEffects`, treeshake presets |
| **Vulture** | imports, functions, classes, methods, properties, attributes, variables, args, unreachable code | Name-based AST diff, scope-insensitive | Dynamic access (`getattr`), decorator-driven frameworks, implicit calls | Whitelist module (preferred), `--exclude`, `--ignore-names`, `--ignore-decorators`, `# noqa` |
| **Ruff F401 / F841 / ERA001** | unused imports, unused function-scope variables, commented-out code | Pyflakes-style per-module/per-scope AST | ERA001 on prose resembling code; F401 on `__init__.py` re-exports | `__all__`, redundant alias, `dummy-variable-rgx`, `allowed-unused-imports`, `# noqa` |
| **deadcode (Python)** | project-wide unused names, unreachable and commented-out code (DC01–DC13) | Name-based AST across the project | Name collisions mask real deadness | `# noqa: DCxx`, `--ignore-names*` / `--ignore-bodies*` / `--ignore-definitions*` |
| **rustc `dead_code`** | unused *unexported* items and fields | Compiler reachability within the crate | Drop / auto-trait side-effect fields; `pub` hides rather than fixes | `_` prefix, `#[allow(dead_code)]`, `PhantomData` |
| **cargo-udeps** | unused `Cargo.toml` dependencies | Build-graph aware; nightly required | Doc-test-only deps; deps also used by dependencies | `[package.metadata.cargo-udeps.ignore]` |
| **cargo-machete** | unused `Cargo.toml` dependencies | Fast source scan, "imprecise" by design | Build-script-generated usage; renamed crates | `ignored` / `renamed` metadata, `--with-metadata` |
| **Go `deadcode`** | unreachable functions and methods | Rapid Type Analysis from `main`/`init` | Assembly callers, `go:linkname`; libraries need `-test` | `-filter` regex; entry set via `-test` |
| **Staticcheck `unused` (U1000)** | unused package-level and unexported objects | Object-graph reachability with documented "uses" axioms | Deliberate over-approximations (all interface methods used, whole const groups used) | `//lint:ignore` directives *(unverified)* |
| **jscpd** | duplicated token blocks | Rabin-Karp over tokens, `min-lines`/`min-tokens` | Legitimate structural repetition (DTOs, tests, generated code) | `--ignore`, `--ignore-pattern`, `--skipLocal`, `--mode weak` |
| **semgrep** | whatever the rule expresses | Syntactic / structural pattern matching | Whatever the rule fails to constrain | `paths`, `pattern-not`, `nosemgrep` *(unverified)* |
| **coverage.py / nyc** | statements and branches not executed in *this run* | Runtime tracing | Untested-but-live code; `def` lines executed at import | `# pragma: no cover`, `[report] exclude_lines` *(unverified)* |

### What a signal proves versus what it does not

| Signal | Proves | Does **not** prove |
|---|---|---|
| ESLint / rustc / TS local unused | The binding is unread in its scope — near-certain | Anything about the enclosing function's usefulness |
| Knip "unused file" | No entry in the *configured* set reaches it | That no entry exists; resolve config hints first |
| Knip / ts-prune "unused export" | No *other module* imports it | That it is unused — it may be used in-file, or be public API |
| Vulture 100% | Unreachable code or an unused argument, within scanned files | Anything about names reached via `getattr` |
| Vulture 60% | A name defined and not textually re-used | Deadness — this tier requires corroboration |
| Ruff F401 | The import is unread in this module | That it is not a deliberate re-export (check `__all__`) |
| cargo machete / udeps | The manifest declares something the tool did not see used | That build scripts, doc-tests, or feature-gated code do not use it |
| Go `deadcode` | Unreachable even through interfaces and reflection | Immunity to assembly or `go:linkname` callers |
| jscpd clone | N tokens repeat | That either copy should be deleted |
| 0% coverage | Not executed by the runs performed | Not executed in production |

## Limits and disagreements between tools

**Exported-but-unimported is the central disagreement.** `noUnusedLocals` and ESLint say nothing about it; Knip and ts-prune report it; rustc's `dead_code` *excludes* it by definition ("unused, **unexported** items"); Staticcheck's axioms state that packages simply use all their exported types, functions, variables and constants. The same construct — a public symbol with no in-repo consumer — is a finding in the JS ecosystem and a non-finding in the Rust and Go ecosystems. That encodes whether the analyzed unit is *an application* (public surface is dead weight) or *a library* (public surface is the product). Classify the target before treating the finding as actionable.

**Entry points are a configuration artifact, so "unreachable" is too.** Knip, `unimported` and Go's `deadcode` all report against a declared entry set. Knip names this as the primary cause of surprising output; `unimported` warned that pointing at `dist` produces false positives; Go's `deadcode` cannot start from a library at all. Two runs of the same tool on the same code can legitimately disagree.

**Name-based and graph-based tools err in opposite directions.** Vulture's own example ships a false *positive* (a `getattr`-dispatched method reported dead). Go's `deadcode` and Staticcheck deliberately produce false *negatives* (all interface methods used, whole constant groups used) to avoid the opposite error. Neither posture is correct in general; they trade recall for precision at different points.

**Ruff and Vulture disagree about `# noqa`.** Both accept F401/F841 suppressions, but Vulture recommends whitelists instead, because whitelists are syntax-checkable and fail visibly once the code disappears, while `noqa` comments accumulate silently. Knip makes the same argument through **tag hints**, which report suppression tags that are no longer needed.

**Autofix safety is a separate judgment from finding validity, and the tools say so.** Ruff marks F841 unsafe (comment loss) and F401 unsafe in `__init__.py` (interface change). typescript-eslint defaults import removal to off on side-effect grounds. Knip warns against `--fix` before configuration converges. rustc warns that deleting a field can change drop behavior or auto-trait membership.

**Duplication and deadness are orthogonal.** jscpd measures repetition; nothing in its model says a clone is unused, and no unused-code tool says a live function is not a copy-paste. Run and interpret them separately.

**Commented-out code is the only slop shape with a dedicated rule, and it is the weakest one.** Ruff's ERA001 lists false positives on comments resembling code as a *known problem*, and Python's `deadcode` DC12 covers the same territory. Neither distinguishes a documented example from an abandoned experiment.
