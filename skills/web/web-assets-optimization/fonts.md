# Fonts Reference

Use this reference to decide font format, subsetting, loading strategy, and CLS mitigation for every shipped font. Fonts affect two metrics at once: bytes (LCP, bandwidth) and layout stability (CLS on font swap). Preload competition and CLS context live in [delivery-strategy.md](./delivery-strategy.md); framework-native font pipelines (`next/font`, `@nuxt/fonts`, Astro Fonts API) that already handle self-hosting and fallback metrics are covered in [frameworks.md](./frameworks.md) — prefer those when the project uses that framework.

## WOFF2 only

- Ship WOFF2 exclusively. It is Brotli-compressed, ~30% smaller than WOFF, and supported by all modern browsers.
- `src:` lists a single WOFF2 source — no WOFF, TTF, or EOT fallbacks:

```css
@font-face {
  font-family: "Poppins";
  src: url("/fonts/poppins-latin.woff2") format("woff2");
  font-weight: 400;
  font-display: fallback;
}
```

- During the inventory step, flag any shipped `.ttf`, `.otf`, or `.woff` file for conversion to WOFF2 and deletion once unreferenced.
- Do not apply gzip/brotli transfer compression to WOFF2 — it already contains Brotli internally.

## Subsetting

Full font files carry glyphs the page never renders: Latin fonts hold ~100–1000 glyphs, CJK fonts can exceed 10,000. Subsetting to the characters actually used is often the single largest font saving.

Follow the skill's installation policy: use tooling already present in the project first, and ask before adding dependencies (`fonttools`/`brotli` via pip, `glyphhanger` via npm).

Static range subset with `pyftsubset` (part of Python `fonttools`; WOFF2 output requires the `brotli` Python package):

```bash
pyftsubset font.ttf --unicodes="U+0000-00FF" --flavor=woff2 --output-file=font-subset.woff2
```

Content-driven subset — let `glyphhanger` detect the glyphs a page actually uses, then subset to exactly those:

```bash
glyphhanger ./index.html > glyphs.txt
pyftsubset font.ttf --unicodes-file=glyphs.txt --flavor=woff2 --output-file=font-subset.woff2
```

`glyphhanger` can also subset directly:

```bash
glyphhanger --whitelist=U+0-7F --formats=woff2 --subset="*.ttf"
glyphhanger --US_ASCII --formats=woff2 --subset=*.ttf
```

For multilingual sites, produce one subset file per script and declare each with a `unicode-range` descriptor in its `@font-face` rule: the browser downloads a file only if the page uses characters in that range. This is exactly what Google Fonts does automatically per language.

## font-display

The timeline is: block period (invisible text) → swap period (fallback shown, web font may still swap in) → failure (fallback stays).

| Value | Block period | Swap period | When to use |
|---|---|---|---|
| `block` | short (~3s) | infinite | Brand-critical font; you accept invisible text while it loads |
| `swap` | ~0 | infinite | Text readable immediately; risk of visible flash and CLS when the font swaps in |
| `fallback` | ~100ms | ~3s | Balanced default; a late font never swaps in, so no late shift |
| `optional` | ~100ms | none | Best pure-performance choice; font used only if loaded near-immediately or cached |

- `optional` is the best pure-performance / no-CLS choice — ideal for secondary and decorative fonts.
- Use `swap` when showing the web font matters most, and pair it with a metric-adjusted fallback (below) to contain CLS.
- Use `fallback` as the balanced default for body text.

## Preloading

Fonts referenced only from CSS are late-discovered; preload the critical ones from the initial HTML:

```html
<link rel="preload" href="/fonts/x.woff2" as="font" type="font/woff2" crossorigin>
```

- `crossorigin` is mandatory even for same-origin fonts: font requests always run in CORS anonymous mode, so a preload without `crossorigin` does not match and the font downloads twice.
- Preload only critical, above-the-fold, subsetted fonts. Every preload competes with other critical resources — see [delivery-strategy.md](./delivery-strategy.md).
- For Google Fonts (third-party), use two preconnects instead of font preloads:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

## Self-hosting vs Google Fonts

- Browser cache partitioning removed the old cross-site cache benefit of Google Fonts — a font cached for one site is not reused on another.
- Self-hosting gives you control: subsetting, preloading, immutable caching of hashed files, and no third-party privacy exposure.
- Self-hosting is not automatically faster: without a good CDN and proper cache headers it can lose to Google Fonts, which auto-subsets per script and serves optimized `unicode-range` slices.
- Decision: prefer self-hosting when you can subset and set cache headers; keep Google Fonts (with the two preconnects) when the project cannot control its serving stack.

## Metric-adjusted fallbacks (CLS)

Font swap shifts layout because the fallback and the web font have different metrics. Define a local fallback whose metrics are adjusted to match the web font — this nearly eliminates font-swap CLS:

```css
@font-face {
  font-family: "poppins-fallback";
  src: local("Arial");
  size-adjust: 60.851%;
  ascent-override: 164.336%;
  descent-override: 57.518%;
  line-gap-override: 16.434%;
}
/* font-family: Poppins, "poppins-fallback", sans-serif; */
```

Formula notes:

- Each override = web font metric / unitsPerEm; when combined with `size-adjust`, divide the result by the `size-adjust` value.
- `size-adjust` = average character width of the web font / average character width of the fallback.

Do not hand-compute these values when a generator is available:

- `next/font` (Next.js) generates them automatically — see [frameworks.md](./frameworks.md).
- Fontaine (unjs/fontaine) does the same for Vite/Nuxt setups.
- `fontkit` (Node library) reads the raw font metrics if you need to compute overrides yourself.
- fontdrop.info lets you inspect font tables in the browser.

## Variable fonts

- A variable font packs many weights/styles into one file via axes (`wght`, `ital`, …). It wins when the site uses >= 2–3 weights of the same family: one file replaces several static files.
- A single variable file is larger than a single static instance, so a site using one weight should ship a static subset instead.
- Subset the axis range you actually use with fontTools instancer:

```bash
fonttools varLib.instancer font.ttf wght=400:700
```

- Variable fonts subset, preload, and fallback-adjust exactly like static fonts — apply every section above to them too.
