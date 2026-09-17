# Serialization, integrations, and performance

## Codecs

Use a codec for an explicitly bidirectional boundary on Zod 4.1+. A transform is
sufficient for one-way normalization. Codec parsing decodes; `z.decode` has typed
input, while `.parse` accepts unknown data. `z.encode` runs the reverse direction.

```ts
import * as z from "zod";

export const Timestamp = z.codec(
  z.iso.datetime({ offset: true }),
  z.date(),
  {
    decode: (value) => new Date(value),
    encode: (value) => value.toISOString(),
  },
);
```

Test both directions and semantic round trips: encoding normalizes offsets to
UTC rather than preserving the original spelling. Match allowed precision to the
application; JavaScript Date cannot retain arbitrary fractional-second precision.
Use async counterparts if callbacks are async. Encoding through a one-way transform
throws, including through safe encode; defaults, prefaults, and catch fallbacks
apply in the forward direction. [Codec contracts](https://zod.dev/codecs).

## JSON Schema and metadata

Before `z.toJSONSchema`, choose the consumer's dialect and whether its contract
describes input or output. Output is the default; use `{ io: "input" }` for a
raw-input contract. Test extra-key behavior: stripped Zod input and generated
output-schema rejection are different operations.

Keep conversion failures visible. `unrepresentable: "any"` can erase restrictions;
prefer a representable wire schema and explicit runtime conversion. Custom
checks and transforms cannot be assumed to survive export. Validate representative
fixtures with both Zod and the actual downstream validator. For reverse conversion,
check `z.fromJSONSchema` availability and supported keywords for the installed
version; an imported schema is not automatically equivalent to the original.
[JSON Schema conversion](https://zod.dev/json-schema).

Attach `.meta()` or registry metadata to the final schema instance. Most schema
methods create new instances; `.register()` returns the original. Give registry
IDs unique values. Audit metadata as part of export: it can override generated
keywords, not merely label fields. Metadata is not runtime validation.
[Metadata and registries](https://zod.dev/metadata).

## Mini and library adapters

Preserve the chosen package surface. Mini uses functional composition, so swapping
the import is not a migration. Use it when a measured client-bundle constraint
justifies the change; measure the built result with the project's bundler.
[Zod Mini](https://zod.dev/packages/mini).

For libraries accepting Classic and Mini, follow `zod/v4/core` contracts, generic
`$ZodType` parameters, and top-level parsing rather than assuming Classic methods.
If only validation is needed, consider the consumer's existing Standard Schema
interface before binding to Zod internals. Explicitly support and test each peer
range and import surface; do not infer compatibility from matching type names.
[Library authors](https://zod.dev/library-authors).

## Performance

Reuse stable schemas. Measure the changed path with realistic successes and
failures, including error consumption, before introducing a faster execution path.
Separate TypeScript composition cost, runtime parsing, and shipped bundle size.

- Prefer plain object composition over long extension chains when compiler cost
  is demonstrated, preserving refinements and unknown-key policy explicitly.
- Use 4.6 boolean validation only when the caller needs acceptance, not issues or
  parsed data. Benchmark results in release notes are not application guarantees.
- On 4.5+, consider `z.compile()` only for a measured hot path. It uses dynamic
  code generation; check Content Security Policy and the schema's supported
  features before adopting it. Compare output and failure behavior against normal
  parsing. Keep the normal parser when runtime restrictions preclude compilation.
- `z.withParser()` in 4.6 transfers correctness of the fast parser to its author;
  it must reproduce transformations and extra-key handling, not just acceptance.
  Use only for an explicit integration need with equivalence tests.

Sources: [AOT compilation](https://zod.dev/compile),
[4.6 release](https://zod.dev/blog/zod-4-6).
