# Querying and the Local API

Reference for reading and writing documents: the query language, the three
APIs, result shaping, and transactions.

## One query language, three APIs

The Local API (direct database access, server-only), the REST API and GraphQL
share the same `Where` object, so the query language is learned once.

```ts
import type { Where } from 'payload'

const query: Where = { color: { equals: 'blue' } }
```

Operators: `equals`, `not_equals`, `greater_than`, `greater_than_equal`,
`less_than`, `less_than_equal`, `like`, `contains`, `in`, `not_in`, `all`
(MongoDB only), `exists`, and the point operators `near`, `within`,
`intersects` (unsupported on SQLite).

`and` and `or` take arrays of queries and nest arbitrarily:

```ts
const query: Where = {
  and: [
    { _status: { equals: 'published' } },
    { or: [{ color: { equals: 'mint' } }, { featured: { equals: true } }] },
  ],
}
```

Query a relationship by nesting its property path — `{ 'author.role': { equals:
'editor' } }`. Add `index: true` to any field users filter on regularly.

## Local API

```ts
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })
```

Inside hooks, access control and custom endpoints, use `req.payload` instead:
it carries the transaction and the user for free. `getPayload` is for entry
points that have neither — a route handler, a script, a cron job.

Local-only options worth knowing: `overrideAccess`, `user`, `depth`, `select`,
`populate`, `locale`, `fallbackLocale`, `draft`, `req`, `context`, `pagination`,
`limit`, `sort`.

**`overrideAccess` defaults to `true`** — the Local API skips access control.
See [access-control.md](access-control.md).

## Controlling response size

`depth` controls how many levels of relationships get populated instead of
returned as IDs. **It defaults to `2`**, which quietly fans out into many
queries and can return an enormous tree from an innocent `find`.

- `defaultDepth` in the Payload config changes it app-wide.
- `maxDepth` on a field caps it regardless of the request (default `1`).
- `depth: 0` returns IDs only — the right default for list endpoints.

`select` picks the fields to return, in include or exclude mode, and narrows the
**result type** as well as the payload:

```ts
await payload.find({
  collection: 'posts',
  depth: 0,
  select: { title: true, slug: true },
})
```

`populate` is the companion: it controls which fields come back *from* populated
relationship documents.

## Transactions

Transactions are on by default wherever the adapter supports them. A request
opens one and carries it on `req.transactionID`; you never start one manually.

The failure mode is therefore not "forgetting to open a transaction" but
**failing to thread the request**:

```ts
// Joins the caller's transaction — rolls back with it.
await req.payload.update({ collection: 'posts', id, data, req })

// Separate transaction: commits even if the outer one rolls back.
await req.payload.update({ collection: 'posts', id, data })
```

The inverse trap: never hand `req` to a promise you do not `await`. The request
can commit and answer OK while the detached work is still writing into a
transaction that no longer exists.

Adapter differences: SQLite has transactions **off** by default — pass
`transactionOptions: {}` to the adapter to enable them; MongoDB requires a
replica set.
