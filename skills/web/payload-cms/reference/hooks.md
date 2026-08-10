# Hooks

Reference for side effects during the document lifecycle. Payload's hooks are
server-side config functions — unrelated to the React hooks Payload also ships
for the Admin Panel.

## The four families

| Family | Declared on | Scope |
| --- | --- | --- |
| Root | `hooks` in `buildConfig` | `afterError` only — application-wide error handling |
| Collection | `hooks` on a collection | The document lifecycle |
| Global | `hooks` on a global | Same, minus create/delete |
| Field | `hooks` on a field | One field's value |

Collection hooks, in lifecycle order: `beforeOperation`, `beforeValidate`,
`beforeChange`, `afterChange`, `beforeRead`, `afterRead`, `beforeDelete`,
`afterDelete`, `afterOperation`, `afterError`. Auth-enabled collections add
`beforeLogin`, `afterLogin`, `afterLogout`, `afterRefresh`, `afterMe`,
`afterForgotPassword`, `refresh` and `me`.

Each is an array, so order inside the array is execution order — and a plugin
that assigns rather than appends silently drops the project's own hooks.

## Picking the right one

- Deriving or stamping a value before it is stored (author, timestamps,
  normalisation): `beforeChange`.
- Rejecting bad input: field `validate` first, `beforeValidate` when the rule
  spans several fields.
- Reacting to a save (cache revalidation, email, third-party sync):
  `afterChange`.
- Reshaping what the API returns: `afterRead`.
- Cascading deletes and cleanup: `beforeDelete`.

```ts
hooks: {
  beforeChange: [
    ({ data, req, operation }) => {
      if (operation === 'create') data.author = req.user?.id
      return data
    },
  ],
}
```

A `beforeChange` hook returns the data it wants stored; returning nothing
discards the change.

## Field hooks keep the type

A field hook must return the same *type* it received. GraphQL is statically
typed against the field's declared type, so a hook that turns a string into an
object errors at query time rather than at save time. Reshaping across fields
belongs in a collection hook.

## Preventing infinite loops

Calling `payload.update()` on the document that triggered `afterChange` fires
`afterChange` again — forever. `req.context` is the documented way out: an
arbitrary object that travels with the request and is visible to every hook it
reaches.

```ts
afterChange: [
  async ({ doc, req, context }) => {
    if (context.skipSync) return doc
    await req.payload.update({
      collection: 'posts',
      id: doc.id,
      data: { syncedAt: new Date().toISOString() },
      req,
      context: { skipSync: true },
    })
    return doc
  },
]
```

The same mechanism carries intent from a caller into the hooks: pass
`context: { skipRevalidation: true }` on a bulk import and let the hook check it.

## Always forward `req`

Every nested operation inside a hook takes `req` — it carries the transaction,
the user, and the locale. Dropping it opens a second transaction that can commit
while the outer one rolls back. See [queries.md](queries.md).

Pass `req` only to promises you `await`. A detached promise holding `req` lets
the request return a success response for data that was rolled back.

## Long work belongs in the queue

A hook runs inside the request. Image processing, third-party sync, batch
emails — anything slow or retryable — belongs in the jobs queue, with the hook
doing nothing but enqueueing it. See [extending.md](extending.md).
