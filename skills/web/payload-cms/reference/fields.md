# Fields

Reference for field authoring: the type catalogue, the fields that behave
unlike the rest, validation, and type guards.

## The catalogue

**Data fields** store a value and need a `name`: `array`, `blocks`, `checkbox`,
`code`, `date`, `email`, `group`, `json`, `number`, `point`, `radio`,
`relationship`, `richText`, `select`, `tabs` (named), `text`, `textarea`,
`upload`, `join`.

**Presentational fields** store nothing and organise the Admin Panel:
`collapsible`, `row`, `tabs` (unnamed), `ui`.

`point` is the one gap across adapters: it is not supported on SQLite. Choosing
SQLite rules out geospatial fields and the `near` / `within` / `intersects`
operators.

## Options every field shares

| Option | Effect |
| --- | --- |
| `required` | Enforced on save — but skipped when writing with `draft: true`. |
| `unique` | Database-level uniqueness; a migration on existing data. |
| `index` | Speeds up queries on the field. Add it wherever users filter. |
| `localized` | Stores one value per locale. Stripped from sub-fields when a parent is localized. |
| `defaultValue` | Static value, or a function receiving `{ user, locale, req }`. |
| `access` | Field-level access control — booleans only, see [access-control.md](access-control.md). |
| `hooks` | Field-level hooks, see [hooks.md](hooks.md). |
| `admin.condition` | `(data, siblingData, { user }) => boolean` — show/hide in the Admin Panel. |
| `admin.position` | `'sidebar'` pulls the field out of the main column. |

`admin.position: 'sidebar'` suits short at-a-glance values — status, author,
date, category. Long fields (rich text, descriptions) need the horizontal space
of the main column.

## Virtual fields

A virtual field is computed on read and never stored. Two forms, and the simpler
one is usually right:

```ts
// Populate from a relationship path — no hook needed.
{ name: 'categoryTitle', type: 'text', virtual: 'category.title' }

// Compute from sibling data.
{
  name: 'wordCount',
  type: 'number',
  virtual: true,
  hooks: { afterRead: [({ siblingData }) => siblingData?.content?.split(' ').length] },
}
```

Reach for the string form whenever the value already exists on a related
document; the hook form is for values that must actually be computed.

## Join fields

`join` surfaces the reverse side of a relationship without storing anything. It
requires an existing `relationship` or `upload` field on the other collection —
it reads that field, it does not create the link.

```ts
// On `categories`, listing the posts that point at this category.
{ name: 'posts', type: 'join', collection: 'posts', on: 'category' }
```

Its population `depth` defaults to `0`, so joined documents come back as IDs
unless you raise it.

## The slug field

`type: 'slug'` auto-generates a URL slug from another field, with a regenerate
toggle in the Admin Panel.

```ts
{ name: 'slug', type: 'slug', useAsSlug: 'title' }
```

Two corrections to the folklore around it:

- **It is experimental.** The docs state it may change or be removed in a future
  release. Say so when you introduce it; a hand-rolled
  `{ name: 'slug', type: 'text', unique: true, index: true }` remains the stable
  choice for a project that cannot absorb a breaking change.
- **`useAsSlug` is optional**, defaulting to `title`. Pass it to generate from a
  different source field.

Other options: `slugify` (custom transform), `disableUnique`, `checkboxName`,
`localized`, `required` (defaults to `true`), `position`, `overrides`.

## Validation

`validate` returns `true` or an error string, and receives the sibling data and
the request:

```ts
{
  name: 'discount',
  type: 'number',
  validate: (value, { siblingData }) =>
    value <= siblingData.price || 'Discount cannot exceed price',
}
```

Validation belongs here rather than in a `beforeChange` hook: it runs in the
Admin Panel too, so the user sees the message on the field instead of a failed
save.

## Filtering relationship options

`filterOptions` narrows what a relationship picker offers, and is enforced on
save as well as in the UI:

```ts
{
  name: 'category',
  type: 'relationship',
  relationTo: 'categories',
  filterOptions: ({ user }) => ({ tenant: { equals: user.tenant } }),
}
```

## Type guards

Field configs are a discriminated union on `type`, so narrowing by `type` before
reading a type-specific property is what keeps plugin and traversal code
type-safe:

```ts
import type { Field } from 'payload'

const named = (fields: Field[]) => fields.filter((f) => 'name' in f)
const hasSubfields = (f: Field) => 'fields' in f
```

`'name' in field` separates data fields from presentational ones; `'fields' in
field` finds the containers (`array`, `blocks`, `group`, `row`, `collapsible`,
named and unnamed `tabs`) you must recurse into.
