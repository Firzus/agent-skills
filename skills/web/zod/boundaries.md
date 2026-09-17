# Boundary parsing and failures

Read for transport normalization, form integration, defaults, custom checks, and
error presentation. Examples use Zod 4 Classic. The recommendations below turn
the [documented API contracts](https://zod.dev/api) into boundary decisions.

## Normalize only accepted representations

Coercion uses JavaScript conversions, not a domain parser: `"false"` becomes true
with boolean coercion; empty strings and null can become numeric zero. Constrain
the raw representation before conversion. A coercion generic changes its static
input type, not its runtime acceptance rules.

For a page query parameter accepting decimal digits only:

```ts
import * as z from "zod";

export const Page = z.string()
  .regex(/^[0-9]+$/)
  .pipe(z.coerce.number().int().min(1).max(10000));

export const Enabled = z.stringbool({
  truthy: ["true"],
  falsy: ["false"],
  case: "sensitive",
});
```

Test `"1"`, `"0"`, `"1e2"`, `" "`, `""`, `null`, and oversized values for `Page`.
Choose missing-value defaults separately. Preserve leading zeros for identifiers
instead of treating every digit string as a number.

With FormData or URLSearchParams, decide whether repeated fields are errors,
scalars, or arrays before building an object; use `getAll` for repeated values.
Handle file values separately from text. Convert blank text to absence only for
fields whose contract calls for it. Optional strings still accept empty strings
unless another check rejects them.

For form resolvers, inspect the installed adapter's supported Zod versions and
type parameters. Form state is usually input-shaped; submit handlers may receive
output-shaped data. Confirm whether the adapter returns raw or parsed values.
Keep server parsing authoritative.

## Choose fallback semantics

| Need | Zod 4 behavior | Required check |
| --- | --- | --- |
| Missing input returns a ready output | `.default(value)` returns on `undefined` without parsing that fallback | Fallback already satisfies output invariants |
| Missing input goes through normalization | `.prefault(value)` feeds a replacement input through the schema | Fallback passes the same validation and transforms |
| Invalid input intentionally degrades | `.catch(value)` substitutes for a validation failure | Product contract permits hiding that failure |

Null is not absence. Wrapper order changes behavior; test the exact composed
schema with missing and explicit values. Keep invalid writes and malformed
configuration visible rather than masking them with a catch-all fallback.

## Refine and transform

Use built-in constraints first. Use `.refine()` for a predicate and put a
cross-field issue on the field the consumer can fix. Use `.superRefine()` for
multiple issues; `.check()` is a lower-level choice, not a mandatory rewrite.

Refinements can be skipped after a non-continuable issue. If an independent
cross-field check must still run, use the documented `when` option only after
validating its dependencies with a separate base/subset schema. Keep that gate
non-recursive and verify the installed API. Test the check alongside an invalid
unrelated field.

Validate before transforming, then pipe into an output schema when the conversion
itself can produce an invalid result. Report expected callback failures through
Zod issues rather than throwing. A callback exception escapes safe parsing.
Keep asynchronous lookups side-effect free; validate structure before expensive
I/O and preserve infrastructure errors as infrastructure errors.

## Present errors without leaking input

Keep `.issues` codes and path arrays until the presentation boundary. Select
`z.flattenError` for a shallow field map, `z.treeifyError` for nested structures,
or `z.prettifyError` for human-readable diagnostics. Root issues need a form-level
or request-level destination. A flattened map is not a lossless nested path map.
[Formatting contracts](https://zod.dev/error-formatting).

In Zod 4, `error` accepts a message or customization function. Schema-level
customization outranks per-parse customization, then global configuration and
locale messages. Return `undefined` to defer. Keep configuration process-wide
and stable; use request-local error handling instead of swapping global locales.
Leave `reportInput` disabled for ordinary logs and redact custom messages that
embed sensitive values. [Error customization](https://zod.dev/error-customization).

In 4.6, safe-parse error maps run when the error is first accessed. Keep maps pure
and test request-local localization under concurrency. See the
[4.6 release notes](https://zod.dev/blog/zod-4-6).
