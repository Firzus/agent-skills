# CLI & Agent Workflows

The Astryx CLI (`npx astryx`, package `@astryxdesign/cli`) is the shared API behind component docs, tokens, templates, theming, and upgrade codemods — reachable from the terminal, as a typed `--json` envelope, via programmatic imports from `@astryxdesign/cli/api`, or over the hosted MCP server. Humans and agents build from the **same reference**; prefer it over the HTML docsite or memory.

## The discovery loop

Run this **before writing any UI** — it is the officially prescribed order and the biggest correctness lever:

```bash
npx astryx template --list              # 1. find a page/block pattern
npx astryx template <Name> --skeleton   # 2. inspect the layout skeleton
npx astryx component <Name>             # 3. read real props, usage, examples
```

## Command surface

```bash
npx astryx init [...]              # setup wizard (see setup.md)
npx astryx component               # list all components
npx astryx component Button        # full docs; also --props | --source | --showcase | --blocks
npx astryx search <query>          # ranked cross-domain search (components, hooks, docs, templates)
npx astryx docs                    # list doc topics
npx astryx docs tokens             # design-token reference
npx astryx docs styling|theme|migration
npx astryx hook --list             # list hooks; hook <Name> --params for params
npx astryx template --list         # list page/block templates
npx astryx template <Name> ./path  # inject a template at a path
npx astryx template <Name> --skeleton
npx astryx swizzle --list          # list swizzle-able components
npx astryx swizzle <Component>     # copy component source into your project
npx astryx discover [<search>]     # find EXTERNAL (third-party) packages/components
npx astryx upgrade --list          # list codemods; --apply (with --from/--to) to migrate versions
npx astryx theme build ./theme.ts  # compile a defineTheme file to production CSS/JS + .d.ts
npx astryx doctor                  # diagnose setup; exit 0 = ok (warnings fine), 1 = a check failed
npx astryx manifest --json         # self-describing capability manifest for agents
```

Distinctions worth remembering:

- **No `add` command.** Add UI via `template`, `swizzle`, or plain imports — not `astryx add`.
- **`search` vs `discover`.** `search` covers core Astryx (components/hooks/docs/templates); `discover` searches the *external* ecosystem.
- **`swizzle` last.** It copies raw StyleX source and requires a build-time StyleX compiler ([setup.md](./setup.md)). Prefer theming/tokens first; swizzle only for deep source-level customization.

## Output flags

| Flag | Use |
|------|-----|
| `--json` | Machine-readable typed envelope for scripts, CI, agent pipelines. Response objects carry `type` discriminators (`component.*`, `search.*`, `template.*`, …). |
| `--dense` | Token-efficient output for context-limited AI tools (web ChatGPT/Claude). |

Gate CI with `npx astryx doctor`. The exact `--detail`/`--lang` flag matrix is under-documented — confirm against `npx astryx --help`.

## MCP server

For MCP-capable tools (Claude Desktop, Cursor, Windsurf, Cline), connect the hosted server so agents run natural-language searches without manual CLI calls. It exposes `search(query)` and `get(name)`:

```json
{
  "mcpServers": {
    "xds": { "type": "url", "url": "https://astryx.atmeta.com/mcp" }
  }
}
```

The server key is `xds` (not `astryx`). Verify the endpoint before relying on it — Astryx is beta.

## Agent context files

Three ways agents consume Astryx:

1. **Generated local context** — `npx astryx init --features agents --agent <claude|cursor|codex>` writes `CLAUDE.md` / `.cursorrules` / `AGENTS.md` with a component index, behavioral rules, and CLI reference from the **installed** version.
2. **Direct CLI queries** — the discovery loop with `--dense`.
3. **MCP server** — `search`/`get`.

For Cursor user-level rules: `mkdir -p ~/.cursor/rules && npx astryx init --features agents --agent-docs-path ~/.cursor/rules/xds.mdc`.

Behavioral rules baked in: **no raw divs, no inline styles, design tokens over magic values**. There is no `llms.txt` — Astryx uses CLI + MCP as the agent channel instead.

## Agent knowledge check

Before generating code, confirm the docs are actually installed by having the agent answer: *the correct import path for `Button`; how to make a `Dialog` non-dismissible; what prop `Selector` uses for its items.* If it can't, run the discovery loop or `init --features agents` first.
</content>
