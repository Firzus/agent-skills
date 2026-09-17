# Version-aware maintenance

Read before mixing Zod generations or upgrading a consumer. Start with resolved
versions and adapter compatibility, not the spelling of an import alone.
Recent Zod 3 distributions can expose both `zod/v3` and `zod/v4`; a root import
changes generation across the major release. Keep versioned imports where a
library deliberately supports both. [Library author guidance](https://zod.dev/library-authors).

## Zod 3 to 4

Inventory affected schemas and callers, record representative input/output/error
fixtures, then change one boundary at a time. Use the
[official migration guide](https://zod.dev/v4/changelog) for each affected API.

| Inspect | Migration action |
| --- | --- |
| `message`, `errorMap`, required/type error options | Adopt the unified `error` contract and verify precedence and issue consumers |
| Defaults and optional properties | Check output defaults versus parsed prefaults and key presence |
| Single-argument records and enum-key records | Supply key/value schemas; select exhaustive or partial semantics |
| `.merge()`, `.strict()`, `.passthrough()` | Prefer explicit object composition and constructors for new code; preserve behavior in existing code |
| String-format methods and `z.nativeEnum` | Prefer top-level formats and `z.enum`; regression-test accepted formats |
| Numeric bounds and nonempty arrays | Check finite/safe ranges and tuple assumptions in inferred types |
| Predicate refinements and `ctx.path` | Verify inferred narrowing against the target minor release; explicitly target issues |
| Function schemas and promises | Inspect the new function factory and async implementation contract |
| Internal classes, generics, `_def` | Follow the public integration path; recheck adapter support |

Treat a compiling migration as necessary, not sufficient. Compare parsed objects
and issue paths against fixtures, including absent keys and transformed values.
Keep deprecated but supported calls unless changing them is part of the request.

## Minor releases also matter

| Version evidence | Consequence |
| --- | --- |
| Codecs and `safeExtend` introduced in 4.1 | Gate examples on that minimum; ordinary extension of refined objects dropped checks in 4.0 and throws from 4.1 |
| 4.4 requires object keys with `z.any()` or `z.unknown()` at runtime | Use explicit optionality for absent keys; earlier 4.x differed |
| 4.5 introduces `z.compile()` and top-level `z.deepPartial()` | The removed Zod 3 `.deepPartial()` method is not the new top-level API; inspect traversal semantics before using it for updates |
| 4.5 changes string length and datetime checks | Recheck Unicode and timestamp fixtures rather than assuming format compatibility |
| 4.6 introduces boolean validation and changes safe-error construction timing | Verify input guards and pure error maps |

Sources: [4.1 release](https://github.com/colinhacks/zod/releases/tag/v4.1.0),
[migration guide](https://zod.dev/v4/changelog),
[4.5 release](https://zod.dev/blog/zod-4-5), [4.6 release](https://zod.dev/blog/zod-4-6).
For another minor release, consult its release notes and installed declarations
rather than extrapolating from this table. The historical migration guide and
current [upstream refinement tests](https://github.com/colinhacks/zod/blob/main/packages/zod/src/v4/classic/tests/refine.test.ts)
disagree about predicate narrowing; typecheck the installed version rather than
assuming the latest tests describe it.

Finish with compatibility checks for every touched adapter and fixture comparisons
covering accepted input, parsed output, and error presentation. State intentional
contract changes separately from syntax replacements.
