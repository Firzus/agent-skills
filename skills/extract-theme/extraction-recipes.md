# Extraction Recipes

`evaluate_script` snippets to run inside the target page through the `chrome-devtools` MCP server. Each function is self-contained and returns a JSON-serializable object.

## Conventions

- All snippets are pure: no DOM mutation, no network, no `console.log` left over.
- Always wrap calls so the return value is the last expression — `chrome-devtools-mcp`'s `evaluate_script` returns it to the agent.
- Run `extractCssVariables` and `extractComputedTokens` **both** — declared variables and resolved styles disagree often (CSS-in-JS, runtime themes).
- For dark-mode capture, set `document.documentElement.classList.add('dark')` (or `setAttribute('data-theme','dark')`) **before** re-running the extractors. Restore by removing the class after.

---

## 1. Declared CSS variables

Reads custom properties off `:root` and any common dark-mode container.

```js
(() => {
  const collect = (el) => {
    const out = {};
    if (!el) return out;
    const cs = getComputedStyle(el);
    for (let i = 0; i < cs.length; i++) {
      const name = cs[i];
      if (name.startsWith('--')) out[name] = cs.getPropertyValue(name).trim();
    }
    return out;
  };

  return {
    root: collect(document.documentElement),
    body: collect(document.body),
    dark:
      collect(document.querySelector('.dark')) ||
      collect(document.querySelector('[data-theme="dark"]')) ||
      collect(document.querySelector('[data-mode="dark"]')) ||
      {},
  };
})();
```

What to keep from the result:

- Anything matching `--*color*`, `--*bg*`, `--*fg*`, `--*text*`, `--*border*`, `--*ring*`, `--*radius*`, `--*font*`, `--*shadow*`.
- Drop anything that resolves to `var(--…)` (unresolved alias) — use `extractComputedTokens` for those.

---

## 2. Computed tokens (real resolved styles)

Samples real elements. This is what shadcn's slot mapping leans on.

```js
(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      bg: cs.backgroundColor,
      color: cs.color,
      borderColor: cs.borderColor,
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
    };
  };

  // Sample multiple buttons and pick the most frequent CTA background
  const buttons = Array.from(
    document.querySelectorAll(
      'button, a[role="button"], a.btn, a[class*="button" i], [class*="cta" i]'
    )
  ).slice(0, 30);
  const ctaCounts = new Map();
  for (const b of buttons) {
    const cs = getComputedStyle(b);
    const key = `${cs.backgroundColor}|${cs.color}`;
    ctaCounts.set(key, (ctaCounts.get(key) || 0) + 1);
  }
  const topCta =
    [...ctaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const [ctaBg, ctaColor] = topCta ? topCta.split('|') : [null, null];

  return {
    body: pick('body'),
    h1: pick('h1'),
    h2: pick('h2'),
    p: pick('p'),
    primaryButton: { backgroundColor: ctaBg, color: ctaColor },
    card: pick(
      '[class*="card" i], article, section[class*="panel" i], [data-card]'
    ),
    input: pick('input:not([type="hidden"]), textarea'),
    nav: pick('nav, header'),
    link: pick('a:not([role="button"])'),
  };
})();
```

What to keep:

- `body.bg` → `--color-background`, `body.color` → `--color-foreground`.
- `primaryButton.backgroundColor` → `--color-primary`, `.color` → `--color-primary-foreground`.
- `card.bg` → `--color-card`, `card.color` → `--color-card-foreground`, `card.borderColor` → `--color-border`.
- `input.borderColor` → `--color-input`.
- `nav` styles often reveal the muted palette — cross-check against subdued sections.

---

## 3. Font stack

Resolves the actually-rendered font, not the first declared.

```js
(() => {
  const resolved = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
    };
  };

  // Detect mono usage anywhere on the page
  const monoEl = document.querySelector('code, pre, kbd, samp, [class*="mono" i]');

  return {
    body: resolved('body'),
    heading: resolved('h1') || resolved('h2'),
    mono: monoEl ? resolved(monoEl.tagName.toLowerCase()) : null,
  };
})();
```

Mapping:

- `body.fontFamily` → `--font-sans`. **Strip** any `var(--…)` references inside the family list before emitting; substitute the resolved literal name.
- `mono?.fontFamily` → `--font-mono`. If null, fall back to the shadcn default (`ui-monospace, SFMono-Regular, …`).

---

## 4. Radius and shadow scales

```js
(() => {
  const radii = new Map();
  const shadows = new Map();

  const sample = document.querySelectorAll(
    'button, [class*="card" i], [class*="dialog" i], [class*="popover" i], [class*="badge" i], input, [class*="rounded" i]'
  );
  for (const el of sample) {
    const cs = getComputedStyle(el);
    const r = cs.borderRadius;
    if (r && r !== '0px') radii.set(r, (radii.get(r) || 0) + 1);
    const s = cs.boxShadow;
    if (s && s !== 'none') shadows.set(s, (shadows.get(s) || 0) + 1);
  }

  const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  return {
    radius: sorted(radii).slice(0, 5),
    shadow: sorted(shadows).slice(0, 5),
  };
})();
```

Mapping:

- Pick the most frequent non-zero radius for `--radius`. If the top value is on small badges only, prefer the second (typical button radius).
- Shadows are emitted only when the site uses a clearly tiered scale; otherwise leave shadcn defaults.

---

## 5. Color → OKLCH conversion (in-page)

Chrome supports CSS Color 4 natively — let the browser do the math.

```js
((color) => {
  if (!color) return null;
  const probe = document.createElement('div');
  probe.style.color = color;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  document.body.removeChild(probe);

  // rgb() / rgba() → "rgb(R, G, B)" or "rgba(R, G, B, A)"
  const m = rgb.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
  const [r, g, b, a = 1] = parts;

  // sRGB → linear
  const lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);

  // linear sRGB → OKLab (Björn Ottosson)
  const l = 0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B;
  const m_ = 0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B;
  const s = 0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B;
  const l_ = Math.cbrt(l), m__ = Math.cbrt(m_), s_ = Math.cbrt(s);
  const L = 0.2104542553 * l_ + 0.7936177850 * m__ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.4285922050 * m__ + 0.4505937099 * s_;
  const Bb = 0.0259040371 * l_ + 0.7827717662 * m__ - 0.8086757660 * s_;

  // OKLab → OKLCH
  const C = Math.sqrt(A * A + Bb * Bb);
  let H = (Math.atan2(Bb, A) * 180) / Math.PI;
  if (H < 0) H += 360;

  const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
  const Lpct = round(L * 100, 1);
  const Cr = round(C, 3);
  const Hr = round(H, 1);

  return a < 1
    ? `oklch(${Lpct}% ${Cr} ${Hr} / ${round(a, 3)})`
    : `oklch(${Lpct}% ${Cr} ${Hr})`;
})('__COLOR_INPUT__');
```

Replace `__COLOR_INPUT__` per call, or wrap the body in a function and call it for each token in a single `evaluate_script` round-trip:

```js
(() => {
  const toOklch = (color) => { /* same body as above, but takes `color` */ };
  const tokens = {
    background: 'rgb(255, 255, 255)',
    foreground: 'rgb(10, 10, 10)',
    primary: 'rgb(99, 102, 241)',
    // ...
  };
  return Object.fromEntries(
    Object.entries(tokens).map(([k, v]) => [k, toOklch(v)])
  );
})();
```

---

## 6. Dark-mode toggling

Strategies in order of reliability — stop at the first one that flips the body's computed `color`.

### 6a. Visible theme toggle (try first)

Many sites ship a user-facing toggle (Cursor, Vercel, Linear, shadcn/ui all do). When present, this is the most reliable path because the site has already wired every cascade to it. Look for it in the snapshot:

```js
(() => {
  const candidates = Array.from(
    document.querySelectorAll('button, [role="button"], [role="switch"], a[role="button"]')
  );
  const patterns = [
    /\bdark\b/i, /\bsombre\b/i, /\bdunkel\b/i, /\boscuro\b/i,
    /\bnight\b/i, /\bnuit\b/i, /\btheme\b/i, /\bthème\b/i, /\bmode\b/i,
  ];
  const matches = candidates
    .filter((el) => {
      const text = (el.innerText || el.textContent || '').trim();
      const aria = el.getAttribute('aria-label') || '';
      const title = el.getAttribute('title') || '';
      return patterns.some((p) => p.test(text) || p.test(aria) || p.test(title));
    })
    .slice(0, 5)
    .map((el) => ({
      text: (el.innerText || '').trim().slice(0, 60),
      aria: el.getAttribute('aria-label'),
      tag: el.tagName.toLowerCase(),
      // Approximate selector so the agent can target it without uid:
      preview: el.outerHTML.slice(0, 200),
    }));
  return matches;
})();
```

If a candidate is found, drive it through `take_snapshot` + `click` (by `uid`) rather than fabricating a CSS selector. Then re-run the body-color check; if `color` changed, the toggle worked.

### 6b. Class / data-attribute toggle (fallback)

Try, in order, until one changes the body's computed `color`:

```js
(() => {
  const before = getComputedStyle(document.body).color;
  const tries = [
    () => document.documentElement.classList.add('dark'),
    () => document.documentElement.setAttribute('data-theme', 'dark'),
    () => document.documentElement.setAttribute('data-mode', 'dark'),
    () => document.body.classList.add('dark'),
  ];
  for (const fn of tries) {
    fn();
    const after = getComputedStyle(document.body).color;
    if (after !== before) return { applied: fn.toString(), before, after };
    // revert if it didn't work
    fn.toString().includes('add') ? document.documentElement.classList.remove('dark') : null;
  }
  return { applied: null, before };
})();
```

If `applied` is `null`, the site does not expose a class-based dark mode. At that point either:

- Use the MCP server's color-scheme emulation if available (`emulate_color_scheme: 'dark'`), reload, and re-extract.
- Or skip dark and ship light-only — note the gap in the summary.

---

## 7. Cleanup

Restore the page so subsequent screenshots — and the user's next manual visit — match the original state.

**This snippet is idempotent and safe to run anywhere, anytime.** Call it:

- Immediately after dark capture finishes (don't wait for Step 9).
- Again as part of Step 9's `finally` block.
- After any failure that occurred while a §6b mutation was active.

```js
(() => {
  document.documentElement.classList.remove('dark');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
  document.body.classList.remove('dark');
})();
```

Specific notes by strategy:

- **6a (visible toggle)** — the snippet above does **not** undo a click. Click the sibling "Light" button via its `uid` to restore. Sites with a toggle persist the choice in `localStorage`, so without the explicit re-click you change the user's next visit.
- **6b (DOM mutation)** — the snippet above is sufficient. No-op for sites that don't use those attributes.
- **6c (OS-level emulation)** — re-emit the emulation call with the original color scheme (`light` or the user's system default), or `navigate_page` again to reset.

Returning a cleanup confirmation is helpful for debugging:

```js
(() => {
  document.documentElement.classList.remove('dark');
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
  document.body.classList.remove('dark');
  return {
    classes: document.documentElement.className,
    dataTheme: document.documentElement.getAttribute('data-theme'),
    dataMode: document.documentElement.getAttribute('data-mode'),
    bodyClasses: document.body.className,
  };
})();
```

## 8. Reading site-defined design tokens directly (opportunistic)

Many polished sites already expose their own semantic tokens on `:root` (Cursor, Vercel, Linear). When `extractCssVariables` returns rich entries like `--color-theme-bg`, `--color-theme-fg`, `--color-bg-elevated`, `--color-text-secondary`, prefer **reading them directly** over re-deriving from computed styles — they are the site's own source of truth and skip a layer of inference.

```js
(() => {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim() || null;
  // Try both common naming conventions
  return {
    background: v('--color-theme-bg') || v('--color-background') || v('--background'),
    foreground: v('--color-theme-fg') || v('--color-foreground') || v('--foreground'),
    card: v('--color-theme-card-hex') || v('--color-card') || v('--color-bg-elevated'),
    primaryBg: v('--color-theme-button-bg') || v('--color-primary'),
    primaryText: v('--color-theme-button-text') || v('--color-primary-foreground'),
    accent: v('--color-theme-accent') || v('--color-accent') || v('--accent'),
    border: v('--color-theme-border-02') || v('--color-border') || v('--border'),
    mutedFg: v('--color-text-secondary') || v('--color-muted-foreground'),
    fontSans: v('--font-sans') || v('--font-family-sans'),
    fontMono: v('--font-mono') || v('--font-family-mono'),
  };
})();
```

When a slot resolves to a `color-mix(...)` expression, you can either keep it as-is (Tailwind v4 supports it) or evaluate it through a probe `<div>` like in §5 to get a flat `rgb()` value before OKLCH conversion.
