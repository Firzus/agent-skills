# Scaffolding

`vp create` is the canonical way to start a Vite+ project. It supports built-in templates and organization templates published via a manifest.

This document covers what to put in `vite.config.ts` for scaffolding defaults. For the upstream CLI reference and the complete option list, see https://viteplus.dev/guide/create.

## Built-in Templates

| Template | Purpose |
|----------|---------|
| `vite:monorepo` | New monorepo |
| `vite:application` | New application |
| `vite:library` | New library |
| `vite:generator` | New generator |

## Organization Templates

An org can publish curated templates under a single npm scope by shipping an `@org/create` package with a `createConfig.templates` manifest in its `package.json`. Once published, users can scaffold from the manifest:

- `vp create @your-org` opens an interactive picker over the manifest
- `vp create @your-org:web` selects a manifest entry directly
- Pinning by version or dist-tag is supported via the standard npm specifier syntax

### Manifest Schema

```json
{
  "name": "@your-org/create",
  "version": "1.0.0",
  "createConfig": {
    "templates": [
      {
        "name": "monorepo",
        "description": "Monorepo",
        "template": "@your-org/template-monorepo",
        "monorepo": true
      },
      {
        "name": "web",
        "description": "Web app template (Vite + React)",
        "template": "@your-org/template-web"
      },
      {
        "name": "demo",
        "description": "Bundled demo template",
        "template": "./templates/demo"
      }
    ]
  }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | kebab-case, unique within the array |
| `description` | yes | shown in the interactive picker |
| `template` | yes | npm specifier, `vite:*` builtin, local workspace package, or a relative path resolved against the `@org/create` root |
| `monorepo` | no | hidden from the picker inside an existing monorepo |

Invalid manifests are a hard error (`@your-org/create: createConfig.templates[2].template must be a non-empty string`), not a silent fallback.

### Layouts

- **Bundled** (recommended): templates live as subdirectories of `@org/create`, referenced by `./path`. One repo, one publish, one versioning story — the same pattern used by `create-vite` and `create-next-app`.
- **Manifest-only**: `@org/create` stays a thin index pointing at independently published `@org/template-*` packages.
- Both can be mixed in the same manifest.

### Repo Default

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  create: { defaultTemplate: '@your-org' },
});
```

`vp create` with no arguments then opens the org picker. Explicit specifiers always bypass the default (`vp create vite:library` still works).

The picker always appends a trailing "Vite+ built-in templates" entry, so the four `vite:*` builtins stay reachable interactively.

### Publishing Checklist

1. Create `@org/create` if it doesn't exist.
2. Add `createConfig.templates` to its `package.json`.
3. (Optional) Provide a `bin` launcher so `npm create @org` still works for non-Vite+ users.
4. Publish.
5. Verify with the upstream `vp create --no-interactive` introspection mode (it prints the manifest table).
6. (Optional) Commit `create.defaultTemplate: '@org'` in internal template repos.
