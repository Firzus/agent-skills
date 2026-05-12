# Scaffolding

`vp create` is the canonical way to start. It supports built-in templates, community shorthands, full npm package names, local templates, and remote Git templates.

## Usage

```bash
vp create
vp create <template>
vp create <template> -- <template-options>
```

Arguments after `--` are forwarded to the underlying template.

## Built-in Templates

| Template | Purpose |
|----------|---------|
| `vite:monorepo` | New monorepo |
| `vite:application` | New application |
| `vite:library` | New library |
| `vite:generator` | New generator |

## Community Shorthands

`vite`, `@tanstack/start`, `svelte`, `next-app`, `nuxt`, `react-router`, `vue`, … List them all with `vp create --list`.

## Full Specifiers

- npm packages: `create-vite`, `create-next-app`
- Local templates: `./tools/create-ui-component`, `@your-org/generator-*`
- Remote: `github:user/repo`, `https://github.com/user/template-repo`

## Forwarding Template Flags

```bash
vp create vite -- --template react-ts
```

## Common Options

- `--directory <path>` — target directory
- `--agent <name>` — write agent instruction files (Claude, Cursor, etc.)
- `--editor <name>` — write editor config (Zed, VS Code, etc.)
- `--hooks` / `--no-hooks` — enable / skip pre-commit hooks
- `--no-interactive` — no prompts (good for CI / agents)
- `--verbose` — detailed scaffolding output
- `--list` — print built-in + popular templates

## Organization Templates

An org can publish curated templates under a single npm scope by shipping an `@org/create` package with a `createConfig.templates` manifest in its `package.json`. Once published:

```bash
vp create @your-org              # interactive picker over the manifest
vp create @your-org:web          # direct manifest entry
vp create @your-org@1.2.3        # pin version
vp create @your-org:web@next     # pin dist-tag
```

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
| `name` | yes | kebab-case, unique |
| `description` | yes | shown in picker |
| `template` | yes | npm specifier, `github:user/repo`, `vite:*` builtin, local workspace package, or relative path resolved against `@org/create` root |
| `monorepo` | no | hidden from picker inside an existing monorepo |

Invalid manifests are a hard error (`@your-org/create: createConfig.templates[2].template must be a non-empty string`), not a silent fallback.

### Layouts

- **Bundled** (recommended): templates live as subdirectories of `@org/create`, referenced by `./path`. One repo, one publish.
- **Manifest-only**: `@org/create` is a thin index pointing at independently published `@org/template-*` packages or GitHub repos.
- Both can be mixed.

Private registries work automatically — Vite+ reads `.npmrc` from project root and `~/`, honoring `@org:registry=…` and `//host/:_authToken=…`.

### Repo Default

```ts
// vite.config.ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  create: { defaultTemplate: '@your-org' },
});
```

`vp create` (no args) then drops straight into the org picker. Explicit specifiers always bypass the default (`vp create vite:library` still works).

### Non-interactive Inspection

```bash
vp create @your-org --no-interactive
```

Prints the manifest as a table and exits 1. Useful for CI introspection.

### Publishing Checklist

1. Create `@org/create` if it doesn't exist.
2. Add `createConfig.templates` to `package.json`.
3. (Optional) Add a `bin` launcher so `npm create @org` still works for non-Vite+ users.
4. Publish.
5. Verify: `vp create @org --no-interactive` prints the table; `vp create @org` opens the picker.
6. (Optional) Commit `create.defaultTemplate: '@org'` in internal template repos.

## Examples

```bash
vp create                              # interactive
vp create vite:application
vp create vite                         # community shorthand
vp create create-next-app              # full package name
vp create github:user/repo
vp create vite -- --template react-ts  # forward flags
vp create --agent claude --editor vscode
```
