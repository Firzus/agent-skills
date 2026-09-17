---
name: zod
description: >-
  Zod schema validation. Use when writing or reviewing Zod schemas, parsing
  untrusted data, handling coercion, refinements, transforms or validation errors,
  integrating forms or APIs, exporting JSON Schema, or migrating Zod versions.
---

# Zod

## 1. Establish the version and boundary

Read the consuming package's resolved Zod version, imports, TypeScript settings,
existing schemas, adapters, and nearest tests. Account for multiple installed
versions. Match the project's import style and preserve its validation layer.
Use strict TypeScript checking; investigate incompatible adapters before changing
their schema types. This skill targets Zod 4 Classic, with **4.6.5** as its
documentation baseline; not every 4.x API is interchangeable.

| Task branch | Read before implementing |
| --- | --- |
| Zod 3 maintenance, major upgrade, or changing 4.x behavior | [migration.md](./migration.md) |
| Forms, query strings, environment variables, defaults, custom checks, errors | [boundaries.md](./boundaries.md) |
| Codecs, JSON Schema, metadata, Mini, library adapters, performance | [interop.md](./interop.md) |
| Unclear API availability or disputed behavior | Installed types and the [official documentation](https://zod.dev/api) for the resolved version |

Identify the raw representation, accepted values, parsed output, failure consumer,
and synchronous or asynchronous execution. Finish with those five decisions
explicit for each changed boundary.

## 2. Encode the contract

Reuse existing domain schemas where their accepted values and unknown-key policy
match. Infer application-owned types from schemas; for externally owned contracts,
check compatibility without erasing the concrete schema's inferred type.

| Contract decision | Zod 4 choice |
| --- | --- |
| Input versus parsed data | `z.input<typeof Schema>` versus `z.output<typeof Schema>`; `z.infer` is output |
| Absent, null, or either | `.optional()`, `.nullable()`, `.nullish()` respectively |
| Extra object keys | `z.object` strips; `z.strictObject` rejects; `z.looseObject` retains; `.catchall(schema)` validates extras |
| Tagged alternatives | `z.discriminatedUnion` with a shared discriminant |
| Untagged alternatives | `z.union`; test overlapping branches and their resulting output |
| All enum keys required | `z.record(KeyEnum, ValueSchema)` |
| Some enum keys allowed | `z.partialRecord(KeyEnum, ValueSchema)` |

Derive create, update, and public-response schemas deliberately. `.partial()` is
shallow; a PATCH contract must define absent versus explicit null and which fields
are writable. A database row schema is not automatically a safe write or response
schema. Select allowed fields before persistence or serialization.

Compose plain object shapes with `.extend()` or explicit shape spread. Check
overwritten keys and choose the resulting unknown-key policy. For refined objects
on 4.1+, use `.safeExtend()`: spreading `.shape` preserves fields, not object-level
checks. Its assignability check does not prove preservation of every runtime
restriction. Prefer object composition over an intersection when downstream code
needs object methods.

Finish when requiredness, variants, extra keys, and input/output differences are
intentional rather than side effects of schema composition.

## 3. Parse and consume the result

Treat external data as `unknown` until the boundary succeeds. Choose `safeParse`
for an expected validation-failure branch, or `parse` where throwing a `ZodError`
matches the existing caller. Consume parsed data, including normalization,
transforms, defaults, and stripped keys; a successful check does not rewrite input.

```ts
import * as z from "zod";

const RenameProject = z.strictObject({
  name: z.string().trim().min(1).max(120),
});

type RenameProjectInput = z.input<typeof RenameProject>;
type RenameProjectData = z.output<typeof RenameProject>;

export function validateRename(input: unknown) {
  const result = RenameProject.safeParse(input);
  if (!result.success) {
    return { ok: false as const, issues: result.error.issues };
  }
  return { ok: true as const, data: result.data };
}
```

Any asynchronous refinement or transform requires awaited `parseAsync` or
`safeParseAsync` throughout its callers. Safe parsing handles validation failures,
not arbitrary exceptions from user callbacks or unavailable services. Keep those
failures distinct from invalid input.

For Zod 4.6+, `.validate()` answers only whether input is acceptable. Use it only
when neither parsed output nor issues are needed; it narrows the input type, not
the output type. See [interop.md](./interop.md#performance) for measured hot paths.

Validate at the server trust boundary even when the client uses the same schema.
Keep authorization, database uniqueness, and transaction guarantees in their
existing enforcement layers. Format validation is not authentication, sanitization,
or permission to fetch a URL. Bound request size and nesting before costly parsing.

Finish when downstream effects receive the parsed contract and each failure has
an explicit owner.

## 4. Verify the changed boundary

Run the project's existing typecheck and focused tests. Select relevant cases:

- Valid input yields the exact expected output, not merely `success: true`.
- Wrong types, absent keys, explicit `undefined`, `null`, empty and whitespace-only
  strings take the intended paths.
- Extra keys and privileged fields cannot cross the write or response boundary.
- Union overlap, nested paths, numeric limits, and enum-record omissions behave
  as specified.
- Coercion, defaults, transform order, and async rejection preserve the contract.
- Composition retains cross-field checks; adapters receive the right input/output
  types and error shape.
- Version changes preserve recorded fixtures or document intentional differences.

Report the resolved version, changed contracts, executed checks, and any untested
integration.
