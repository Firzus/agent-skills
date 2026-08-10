# Access control

Reference for restricting who reads and writes what. The governing rule is
**access is opt-in**: every API enforces access control except the Local API,
which skips it entirely unless told otherwise.

## The four surfaces

| Surface | Where | Returns |
| --- | --- | --- |
| Collection | `access` on the collection config | `boolean` or a `Where` query |
| Field | `access` on a field config | `boolean` only |
| Global | `access` on the global config | `boolean` or a `Where` query |
| Admin | `admin.access` / `access.admin` | `boolean` — Admin Panel entry |

Collection operations: `create`, `read`, `update`, `delete`, plus `readVersions`
and `unlock` where applicable. Field operations: `create`, `read`, `update`.

## Returning a query instead of a boolean

A collection access function returning a `Where` becomes a filter merged into
every query — the row-level security mechanism:

```ts
access: {
  read: ({ req: { user } }) => {
    if (user?.role === 'admin') return true
    return { author: { equals: user?.id } }
  },
}
```

`true` means unrestricted, `false` means denied, and a `Where` means "only these
documents". Field access has no such option: it returns booleans only, so a
field cannot be hidden per-document by query.

## The Access Operation trap

The Admin Panel decides what to render by calling access functions through the
**Access Operation**, with no document in hand. In that call `id`, `data`,
`doc`, `siblingData` and `blockData` are all `undefined`, and any `Where` you
return is **not executed** — Payload assumes no access.

An access function that dereferences `data` without a guard therefore throws and
breaks the Admin Panel, while passing every test written against a real request:

```ts
// Breaks the Admin Panel: `data` is undefined during the Access Operation.
access: { update: ({ data }) => data.ownerId === '...' }

// Survives it.
access: { update: ({ req: { user }, data }) => Boolean(user) && (!data || data.ownerId === user.id) }
```

Guard every dereference of `data`, `doc`, `id` and `siblingData`.

## The Local API skips access control

```ts
// Runs as a superuser — no access control at all.
await payload.find({ collection: 'posts' })

// Enforces access control as this user.
await payload.find({ collection: 'posts', overrideAccess: false, user })
```

`user` alone changes nothing: without `overrideAccess: false` the operation
still bypasses every rule. This is the single most consequential default in
Payload — any Local API call reached from an end-user request (a route handler,
a server action, a custom endpoint) needs both arguments.

Inside hooks and custom endpoints you already hold `req`, so pass `req` through
instead of rebuilding the user context; that also keeps the transaction intact
(see [queries.md](queries.md)).

## Testing access rules

A rule is only proven by the negative case. For each rule, verify: the intended
user succeeds, an unauthenticated request fails, a user of another tenant or
role fails, and the Admin Panel still loads (the Access Operation path).
