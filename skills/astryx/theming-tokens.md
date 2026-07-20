# Theming & Design Tokens

Theming in Astryx is a declarative config over color, typography, radius, motion, spacing, tokens, and per-component overrides. Customize at the **token level**, not by rewriting components, to keep upgrades clean.

## Applying a theme

Wrap the app **once** in a single `<Theme>` provider near the root. Mind the import split — this is a real trap:

| Import | From |
|--------|------|
| `Theme` (provider component) | `@astryxdesign/core` |
| `useTheme`, `defineTheme` | `@astryxdesign/core/theme` |
| `<name>Theme` (theme object) | `@astryxdesign/theme-<name>` (or `/built`) |

```tsx
import {Theme} from '@astryxdesign/core';
import {neutralTheme} from '@astryxdesign/theme-neutral/built'; // SSR-safe, skips runtime injection
import '@astryxdesign/theme-neutral/theme.css';

<Theme theme={neutralTheme}><YourApp /></Theme>
```

Ships as `@astryxdesign/theme-*` packages: **neutral, butter, chocolate, gothic, matcha, stone, y2k** (7; `gothic` is dark-only). `/docs/theme` is authoritative over the `/themes` page if the two disagree.

## Dark mode

The `<Theme mode>` provider **owns color mode** — designate exactly one owner; never run a second dark-mode provider. `mode` is `'system' | 'light' | 'dark'`, default `'system'` (explicit values override OS preference).

```tsx
const [mode, setMode] = useState('system');
<Theme theme={neutralTheme} mode={mode}>
  <Button onClick={() => setMode(m => m === 'light' ? 'dark' : 'light')} />
</Theme>
```

Color tokens encode both values inline as `light / dark` (e.g. `--color-text-primary: #171717 / #fafafa`) and resolve via CSS `light-dark()` automatically — so referencing a semantic token is all you need. Read resolved tokens in React only for non-CSS consumers (charts, canvas):

```tsx
import {useTheme} from '@astryxdesign/core/theme';
const {mode, tokens} = useTheme();
<Chart textColor={tokens['--color-text-primary']} />
```

## Customizing with `defineTheme`

Prefer **extending** an existing theme over rebuilding — child tokens override the base, component rules deep-merge. Use `[light, dark]` tuples so dark mode switches automatically.

```tsx
import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

const brandTheme = defineTheme({
  name: 'brand',
  extends: neutralTheme,
  color: { accent: '#7B61FF', neutralStyle: 'cool' },
  typography: { scale: { base: 14, ratio: 1.2 }, body: { family: 'Inter' } },
  radius: { base: 4, multiplier: 1 },
  motion: { fast: 175, medium: 410, ratio: 0.75 },
  tokens: { '--color-accent': ['#7B61FF', '#9B85FF'] },  // [light, dark]
  components: {
    card:   { base: { borderRadius: '20px', padding: '24px' } },
    button: { base: { borderRadius: '9999px' }, 'variant:ghost': { borderWidth: '2px', borderStyle: 'solid' } },
  },
});
```

Component overrides key on `base`, `variant:<value>`, and state. For production, compile with `npx astryx theme build ./theme.ts` — it emits CSS/JS plus `.d.ts` (and `.variants.d.ts` for custom variants), avoiding runtime injection and giving type-safe token access.

## Token catalog

Semantic-first: tokens name **purpose, not appearance**. All are CSS custom properties, also exported as typed StyleX `*Vars` objects from `@astryxdesign/core`.

| Category | Prefix / vars | Notes |
|----------|--------------|-------|
| Color | `--color-*` / `colorVars` | Semantic (`--color-text-primary`, `--color-background-surface`, `--color-border`, `--color-accent`). Don't use `--color-on-accent` off-accent; don't mix accent with status colors. |
| Spacing | `--spacing-*` / `spacingVars` | Small steps for internal spacing, larger for section gaps. |
| Size | `--size-*` / `sizeVars` | Element sizes (sm/md/lg ≈ 28/32/36px). |
| Radius / shape | `--radius-*` / `radiusVars` | `--radius-element` (buttons/inputs), `--radius-container` (cards/panels/dialogs), `--radius-full` (pills/badges). |
| Elevation | `--shadow-*` / `shadowVars` | `--shadow-low` tooltips, `--shadow-med` dropdowns, `--shadow-high` dialogs; `--shadow-inset-*` for focus states over outlines. |
| Motion | `--duration-*` / `durationVars`, `--ease-*` / `easeVars` | Fast for frequent interactions, medium for layout transitions. Single easing: `--ease-standard = cubic-bezier(0.24, 1, 0.4, 1)`. Always respect reduced-motion. |
| Typography | `--text-*` / type scale | Geometric: `round(base × ratio^step)`; default base 14px / ratio 1.2 → 12 steps. Changing base/ratio in `defineTheme` regenerates **all** size tokens. |

Prefer component props over raw token imports where possible — `<Stack gap={4}>`, `<Heading level={1} type="display-1">`, `<Text type="body">` — reserving `*Vars` for custom layouts. The `gap` numeric scale mapping is shown in examples but not fully documented; verify with `npx astryx docs tokens`, which is also the authoritative source for the complete token list (the typed exports seen are `colorVars, spacingVars, sizeVars, radiusVars, shadowVars, durationVars, easeVars` — possibly not exhaustive).

Icons swap whole libraries (heroicons, lucide) via `registerIcons()` from `@astryxdesign/core/Icon` without changing call sites:

```tsx
import {registerIcons} from '@astryxdesign/core/Icon';
<Icon icon={PhotoIcon} size="lg" />
```
</content>
