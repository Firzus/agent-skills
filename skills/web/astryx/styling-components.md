# Components & Styling

How to import, style, and target Astryx components. All approaches resolve to the same **design-token** CSS variables, so theming and dark mode work regardless of method.

## Import conventions

Import each component from its **own subpath** — never a barrel root:

```tsx
import {Button} from '@astryxdesign/core/Button';
import {Card} from '@astryxdesign/core/Card';
import {VStack} from '@astryxdesign/core/Layout';

<VStack gap={4}>
  <Button label="Hello Astryx" onClick={() => alert('Hi!')} />
</VStack>
```

Some providers/hooks come from the package root (`@astryxdesign/core`); components come from their subpath. Form inputs are **controlled** (`value` + `onChange`). Use `useLinkComponent()` for navigation rather than hardcoded `<a>`, so framework routers work. `contentEditable`, `dangerouslySetInnerHTML`, and `children` are intentionally omitted from base HTML prop types.

## Styling order of preference

Use the first that fits, in this order:

1. **`xstyle` (StyleX)** — component-specific overrides. Apply directly on the component instead of wrapping it in a `<div>` for margin.
2. **Tailwind utilities** — layout/wrapper styling.
3. **`className` / `style`** — external CSS / one-offs (`className` is appended after the component's own classes).

```tsx
import * as stylex from '@stylexjs/stylex';

const overrides = stylex.create({
  card: { maxWidth: 400, marginBlock: 16 },
  saveButton: { alignSelf: 'flex-end' },
});

<Card xstyle={overrides.card} />
<Button label="Save" xstyle={overrides.saveButton} />
```

Hard rules:

- `xstyle` accepts **only** styles from `stylex.create()` — never inline objects or `className` strings.
- Guard every StyleX `:hover` with `@media (hover: hover)`.
- **No `!important`.** `xstyle` merges last; if a style isn't applying, it's a specificity issue, not a merge-order one.
- `xstyle` and swizzling require a StyleX build plugin ([setup.md](./setup.md)).

```tsx
const s = stylex.create({
  card: { boxShadow: { default: 'none', ':hover': { '@media (hover: hover)': '0 4px 12px rgba(0,0,0,0.1)' } } },
});
```

## Tokens over literals

Reference design tokens so styles adapt to theme + light/dark automatically. Prefer the **typed** `*Vars` exports (autocomplete + build-time typo detection) over raw `var()` strings:

```tsx
import {colorVars, spacingVars, radiusVars} from '@astryxdesign/core';
// equivalent subpath: '@astryxdesign/core/theme/tokens.stylex'

const styles = stylex.create({
  panel: {
    backgroundColor: colorVars['--color-background-surface'],
    color: colorVars['--color-text-primary'],
    padding: spacingVars['--spacing-4'],
    borderRadius: radiusVars['--radius-container'],
  },
});
```

In plain CSS, use the variables directly:

```css
.card {
  background: var(--color-background-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-container);
  padding: var(--spacing-4);
}
```

Never use **Sass variables** for themeable values — they compile to static values and won't react to runtime theme/mode switches. The full token catalog lives in [theming-tokens.md](./theming-tokens.md).

## Cascade layers (required for Tailwind coexistence)

Declare the `@layer` order **once, before any imports**. Unlayered styles beat every named layer, and a later layer beats an earlier one — so unlayered or misordered stylesheets silently override Astryx.

```css
@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;

@import "tailwindcss/theme.css"      layer(theme);
@import "tailwindcss/preflight.css"  layer(base);
@import "@astryxdesign/core/reset.css";
@import "@astryxdesign/core/astryx.css";
@import "@astryxdesign/theme-neutral/theme.css";
@import "@astryxdesign/core/tailwind-theme.css";   /* Tailwind v4 token bridge */
@import "tailwindcss/utilities.css"  layer(utilities);
```

## Targeting components from external CSS

Combine the stable base class (`.astryx-button`, `.astryx-card`) with reflected **data attributes** (`data-variant`, `data-size`, `data-level`). Bare prop/state classes (`.primary`, `.sm`, `.level-2`, `.checked`) are **deprecated**; base classes are not.

```css
.my-app .astryx-button[data-variant="primary"][data-size="sm"] { /* ... */ }
```

## Library interop

Map each library's semantic tokens **to** Astryx CSS variables, by intent (text, surface, border, accent) — never the reverse. Prefer CSS variables over the token-resolver APIs for DOM styling (they inherit, follow `data-theme`, and update on switch). The resolver APIs (`resolveThemeTokens`, `useTheme`) are for **non-CSS** consumers only (SVG attributes, canvas, charts).

```ts
// Panda / Chakra
semanticTokens: { colors: {
  text: { primary: { value: 'var(--color-text-primary)' } },
  background: { surface: { value: 'var(--color-background-surface)' } },
}}

// MUI
createTheme({ cssVariables: true, colorSchemes: { light: { palette: {
  primary: { main: 'var(--color-accent)' },
  background: { paper: 'var(--color-background-surface)' },
}}}})
```
</content>
