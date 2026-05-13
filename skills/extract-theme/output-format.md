# Output Format (shadcn/ui + Tailwind v4)

The patch produced by this skill targets a single CSS file (typically `app/globals.css` for Next.js or `src/app.css` for Vite). It writes:

1. A `@custom-variant dark (...)` declaration (only inserted if missing).
2. A `@theme inline { ... }` block with the full token set.
3. A `.dark { ... }` block that overrides color tokens (only when dark mode was extracted).

Sibling rules in the file (`@import`, `@layer base`, custom utilities, `body` styles) are preserved.

## Token vocabulary

The 17 color tokens shadcn expects. Always emit all of them — fill from extraction, fall back to the shadcn `new-york` defaults only when extraction yields nothing for a slot.

| Token                         | Source heuristic                                             |
| ----------------------------- | ------------------------------------------------------------ |
| `--color-background`          | `body` background                                            |
| `--color-foreground`          | `body` color                                                 |
| `--color-card`                | Card / elevated surface background                           |
| `--color-card-foreground`     | Card text color                                              |
| `--color-popover`             | Same as card unless distinct popover/menu surface is found   |
| `--color-popover-foreground`  | Popover text color (mirror card-foreground if not distinct)  |
| `--color-primary`             | Most-frequent CTA background                                 |
| `--color-primary-foreground`  | Computed text color on the primary CTA                       |
| `--color-secondary`           | Secondary button background                                  |
| `--color-secondary-foreground`| Secondary button text                                        |
| `--color-muted`               | Subdued section background                                   |
| `--color-muted-foreground`    | Subdued text color                                           |
| `--color-accent`              | Hover background of nav items / dropdown rows                |
| `--color-accent-foreground`   | Hover text color (mirror foreground if not distinct)         |
| `--color-destructive`         | Red-family CTA / error text (omit → keep shadcn default)     |
| `--color-border`              | Card / divider border color                                  |
| `--color-input`               | Input border color (mirror `border` if not distinct)         |
| `--color-ring`                | Focus outline color (mirror `primary` if not explicit)       |

Plus:

| Token                | Source heuristic                                           |
| -------------------- | ---------------------------------------------------------- |
| `--radius`           | Most frequent non-zero `border-radius` (rounded to 0.125rem)|
| `--radius-xs/sm/md/lg/xl` | Derived via `calc()` per shadcn convention             |
| `--font-sans`        | Resolved body font, **literal names**, with system fallback|
| `--font-mono`        | Resolved code/pre font, **literal names**, with fallback   |

## Template

Substitute every `{token}` placeholder. Do not emit comments inside the block (keep it parseable and small). Do not include extracted tokens that are not in this contract — they confuse downstream tooling.

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  /* Colors — light */
  --color-background: {background};
  --color-foreground: {foreground};

  --color-card: {card};
  --color-card-foreground: {card-foreground};

  --color-popover: {popover};
  --color-popover-foreground: {popover-foreground};

  --color-primary: {primary};
  --color-primary-foreground: {primary-foreground};

  --color-secondary: {secondary};
  --color-secondary-foreground: {secondary-foreground};

  --color-muted: {muted};
  --color-muted-foreground: {muted-foreground};

  --color-accent: {accent};
  --color-accent-foreground: {accent-foreground};

  --color-destructive: {destructive};

  --color-border: {border};
  --color-input: {input};
  --color-ring: {ring};

  /* Radius */
  --radius: {radius};
  --radius-xs: calc(var(--radius) * 0.5);
  --radius-sm: calc(var(--radius) * 0.75);
  --radius-md: calc(var(--radius) * 0.875);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.5);

  /* Typography — literal family names, never var(--font-sans) */
  --font-sans: {font-sans};
  --font-mono: {font-mono};
}

.dark {
  --color-background: {dark.background};
  --color-foreground: {dark.foreground};

  --color-card: {dark.card};
  --color-card-foreground: {dark.card-foreground};

  --color-popover: {dark.popover};
  --color-popover-foreground: {dark.popover-foreground};

  --color-primary: {dark.primary};
  --color-primary-foreground: {dark.primary-foreground};

  --color-secondary: {dark.secondary};
  --color-secondary-foreground: {dark.secondary-foreground};

  --color-muted: {dark.muted};
  --color-muted-foreground: {dark.muted-foreground};

  --color-accent: {dark.accent};
  --color-accent-foreground: {dark.accent-foreground};

  --color-destructive: {dark.destructive};

  --color-border: {dark.border};
  --color-input: {dark.input};
  --color-ring: {dark.ring};
}
```

If the site has no extractable dark variant, **omit the entire `.dark { ... }` block** — do not emit it with placeholder values.

## Worked example

Source: `https://example.com` (light only, primary CTA is indigo, body uses Inter).

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: oklch(100% 0 0);
  --color-foreground: oklch(14.5% 0.025 264);

  --color-card: oklch(100% 0 0);
  --color-card-foreground: oklch(14.5% 0.025 264);

  --color-popover: oklch(100% 0 0);
  --color-popover-foreground: oklch(14.5% 0.025 264);

  --color-primary: oklch(58.2% 0.198 280.4);
  --color-primary-foreground: oklch(98% 0.01 264);

  --color-secondary: oklch(96.1% 0.01 264);
  --color-secondary-foreground: oklch(14.5% 0.025 264);

  --color-muted: oklch(96.1% 0.01 264);
  --color-muted-foreground: oklch(46% 0.02 264);

  --color-accent: oklch(96.1% 0.01 264);
  --color-accent-foreground: oklch(14.5% 0.025 264);

  --color-destructive: oklch(53% 0.22 27);

  --color-border: oklch(91% 0.01 264);
  --color-input: oklch(91% 0.01 264);
  --color-ring: oklch(58.2% 0.198 280.4);

  --radius: 0.5rem;
  --radius-xs: calc(var(--radius) * 0.5);
  --radius-sm: calc(var(--radius) * 0.75);
  --radius-md: calc(var(--radius) * 0.875);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.5);

  --font-sans: "Inter", "Inter Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}
```

## Patching rules (recap)

- Replace the **contents** of any existing `@theme { ... }` or `@theme inline { ... }` block. Do not duplicate the block.
- Inside an existing `.dark { ... }`, replace only the `--color-*` declarations. Preserve any other rules.
- Insert the `@custom-variant dark (...)` line once, after the `@import "tailwindcss";` line. Skip if it (or an equivalent) is already present.
- Show a diff before writing if the file already contains hand-tuned tokens with named comments or non-shadcn token names.

## What this skill never emits

- `tailwind.config.{js,ts}` files (Tailwind v4 does not use them).
- `components.json` changes (handled by `npx shadcn@latest init`).
- New components under `components/ui/`.
- `var(--font-sans)` self-references inside `@theme inline` (breaks Tailwind v4 parsing — see the `shadcn` skill's "shadcn init breaks Geist Font" gotcha).
- Tokens outside the shadcn vocabulary, even if extraction surfaced them. Note them in the summary instead.
