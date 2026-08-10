# Collections, globals, versions

Reference for the document containers: collection config, auth, uploads, drafts
and globals. Field authoring lives in [fields.md](fields.md).

## Collection config

```ts
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: { useAsTitle: 'title', defaultColumns: ['title', '_status', 'updatedAt'] },
  versions: { drafts: true },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richText' },
  ],
}
```

`slug` is the collection's identity: it is the database table or collection
name, the REST path segment, and the `collection` argument of every Local API
call. Renaming it is a schema migration, not a rename.

`admin.useAsTitle` names the field the Admin Panel shows in lists, relationship
pickers and the document header. Without it, documents show as their ID.

## Versions and drafts

`versions: { drafts: true }` injects a `_status` field into the schema. It
stores exactly two values, `draft` and `published`. The "changed" state visible
in the Admin Panel is derived by the UI from comparing the latest version to the
published one — it is never a stored value, so never query for it.

Consequences an agent must carry:

- Query `_status`, not a hand-rolled `status` field. Adding your own `status`
  field alongside drafts duplicates the concept and diverges.
- `draft: true` on a create or update writes **only to the versions table** and
  relaxes required-field validation. A write that "succeeded" may be absent from
  the main collection.
- `draft: true` on a read returns the newest draft instead of the published
  document.

```ts
await payload.update({
  collection: 'posts',
  id,
  data: { title: 'WIP' },
  draft: true, // versions table only; required fields not enforced
})

await payload.find({
  collection: 'posts',
  where: { _status: { equals: 'published' } },
})
```

`versions: { drafts: { autosave: true } }` and `versions: { max: N }` cap and
automate version history. Skip versions entirely for collections with no
publish lifecycle — join tables, settings, logs.

## Auth collections

`auth: true` on a collection adds email/password login, JWT handling, and the
auth-specific hooks (`beforeLogin`, `afterLogin`, `afterLogout`, `afterRefresh`,
`afterMe`, `afterForgotPassword`, `refresh`, `me`). `admin.user` in the Payload
config names which auth collection signs into the Admin Panel.

API-key auth is a separate switch (`auth: { useAPIKey: true }`) — this is the
mechanism the MCP plugin builds on; see [mcp.md](mcp.md).

## Upload collections

`upload: true` (or an options object) turns a collection into a file store,
adding `filename`, `mimeType`, `filesize` and URL fields. Image resizing through
`imageSizes` requires the `sharp` package to be installed and passed to
`buildConfig`. Where the bytes actually live is an adapter choice — see
[extending.md](extending.md).

## Globals

A global is a single document with no ID: site settings, a navigation menu, a
footer. Same field system, same hooks, same access control, but only `find` and
`update` operations exist — there is nothing to create or delete.

```ts
const nav = await payload.findGlobal({ slug: 'nav' })
await payload.updateGlobal({ slug: 'nav', data: { items: [] } })
```

Reach for a global when exactly one document should ever exist; a collection
with a single row invites a second one.
