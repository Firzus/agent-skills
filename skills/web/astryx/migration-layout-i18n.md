# Principles, Layout, Migration & i18n

## Design principles

1. **Components over primitives** — use a component for everything it covers before reaching for raw HTML.
2. **Semantic tokens over hardcoded values** — name by purpose, not appearance.
3. **Theme-agnostic code** — app code never references specific colors or measurements, so themes and dark mode work automatically.
4. **Open internals** — every primitive is exported and composable.

## Layout: frame-first

Build **top-down**: pick the shell, name its regions, give each an explicit size budget, *then* fill with content.

| Primitive | Use |
|-----------|-----|
| `AppShell` | Apps with top/side nav |
| `Layout` + `LayoutPanel` + `LayoutContent` | Multi-pane tools (explorers, consoles, master-detail) |

```tsx
<AppShell sideNav={<SideNav>{/* items */}</SideNav>} contentPadding={0}>
  <Layout>
    <LayoutContent>{/* dense list or table, edge-to-edge */}</LayoutContent>
    <LayoutPanel width={380} resizable={{minSizePx: 320, maxSizePx: 480, autoSaveId: 'inspector'}} hasDivider>
      {selected ? <DetailFields item={selected} /> : <EmptyState title="Nothing selected" />}
    </LayoutPanel>
  </Layout>
</AppShell>
```

Recommended region budgets: side nav 240–280px · icon rail 64–72px · detail/inspector panel 340–420px · filter rail 220–260px · dense row height 32–40px. Declare a "responsive contract" comment for breakpoint behavior (typical thresholds 1024px, 768px). Layout primitives are imported from `@astryxdesign/core` (inferred — the layout docs page doesn't state the package explicitly).

**Anti-patterns:** "card soup" (wrapping every list item in a Card — `Card` is a widget container, not a list-item wrapper; use `Table`/`List`/`Item` for rows), nesting Cards, `Badge` as decoration (reserve for counts/states), and inventing props without checking component docs.

## Migration (from Tailwind / shadcn / Radix)

Treat it as a **product-shell and workflow migration, not a global class replacement**. Migrate one route at a time; keep business logic intact.

```
1. install + init
2. wrap root in <Theme>
3. make CSS @layer order explicit (see styling-components.md — silent-override hazard)
4. foundation smoke test: Button + TextInput + Card keep padding/borders/backgrounds
5. migrate the persistent frame (AppShell / TopNav / SideNav / mobile nav)
6. replace shared primitives
7. replace global workflows (command palette, settings, theme toggle)
8. remove legacy Tailwind classes
9. verify light/dark, keyboard nav, responsive
```

Primitive mapping (shadcn/Radix → Astryx): `button`→`Button`/`IconButton`, `input`→`TextInput`, `textarea`→`TextArea`, `switch`→`Switch`, `checkbox`→`CheckboxInput`/`CheckboxList`, `radio group`→`RadioList`, `select`/`combobox`→`Selector`/`Typeahead`, `tabs`→`TabList`, `command dialog`→`CommandPalette`, `alert`→`Banner`/`Toast`, `dialog`→`Dialog`/`AlertDialog`.

For an agent, kick off with `npx astryx docs migration --dense` and `npx astryx template AppShellTopNavWithSideNav --skeleton`, then migrate route by route, taking screenshots between surfaces.

## Internationalization

Built-in i18n (`InternationalizationProvider` + `useTranslator` from `@astryxdesign/core`) that coexists with react-intl / i18next / next-intl / Lingui.

```tsx
import {InternationalizationProvider, useTranslator} from '@astryxdesign/core';

<InternationalizationProvider locale="fr" messages={{ fr }}>
  <App />
</InternationalizationProvider>
// const t = useTranslator(); t('@myapp.actions.save')
```

- Astryx bundles **English only**; other languages need catalogs via `messages`. Omitted keys fall back through the locale chain to English.
- Namespace custom keys with `@myapp.*` (your npm scope) to keep them separate from `@astryx.*` keys.
- `overrides` win over both bundled English and any `messages` catalog for the same key.
- Use the **pseudo locale** (`@astryxdesign/core/locales/pseudo.json`) in tests to surface hardcoded strings and text-overflow.
- **RTL / direction support is not documented** — do not assume it exists.
</content>
