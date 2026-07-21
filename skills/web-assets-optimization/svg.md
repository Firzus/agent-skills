# SVG Reference

Optimize SVGs with SVGO and pick the right delivery method (inline, `<img>`, or sprite) per asset. Keep logos and icons as vectors; never rasterize them.

## SVGO usage

Run SVGO via `npx svgo` or an existing devDependency; ask before adding it to the project. Verified commands:

```bash
npx svgo input.svg              # optimize in place
svgo input.svg -o out.svg       # write to a new file
svgo -f ./icons                 # optimize a folder
svgo -rf ./src -o ./dist        # recursive, into an output dir
svgo -p 2 input.svg             # numeric precision (2-3 usually visually lossless)
svgo --multipass input.svg      # re-run until stable (~2-5% extra savings)
```

- Config file: `svgo.config.mjs` (auto-detected) or pass `--config <path>`.
- Default plugin set: `preset-default`.
- **The invariant: never let SVGO strip the `viewBox`** — losing it breaks responsive scaling. What you must do depends on the SVGO major version (check with `npx svgo --version`):
  - **SVGO v4+ (current):** `removeViewBox` (and `removeTitle`) are no longer part of `preset-default`; the `viewBox` is kept by default. No override needed — adding one is at best a no-op.
  - **SVGO v3 and earlier:** `removeViewBox` is enabled in `preset-default`. Disable it:

```js
// svgo.config.mjs — only needed on SVGO v3 or earlier
export default {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: { removeViewBox: false },
      },
    },
  ],
};
```

## Delivery trade-offs

| Method | Pros | Cons |
|---|---|---|
| Inline `<svg>` | Full CSS/JS styling and animation, no request, `currentColor` works directly | Not cached, repeated per page, DOM bloat with many icons (hurts parse cost) |
| `<img src="x.svg">` / CSS background | Cached, simple | No CSS styling of internals, no `currentColor` |
| External sprite `<use href="sprite.svg#icon">` | Cached across pages, one request | Only inherited props penetrate (`currentColor`, CSS custom properties); rendering performance varies by browser |

Heuristic:

- Component-driven SPA → inline SVG components.
- Multi-page or CMS site → external sprite referenced with `<use href="sprite.svg#icon">`.

## currentColor

Author icons with `fill="currentColor"` (and/or `stroke="currentColor"`) so the icon inherits the parent's CSS `color`. This enables theming and hover states, and it works even through `<use>` in an external sprite.

Enforce it with SVGO's `convertColors` plugin:

```js
// svgo.config.mjs (excerpt)
plugins: [
  { name: "convertColors", params: { currentColor: true } },
],
```

## Never rasterize logos/icons

Keep logos, icons, and simple illustrations as SVG:

- Resolution-independent: crisp at any DPR and zoom level.
- Usually smaller than PNG for flat art.
- Themable (`currentColor`) and animatable.
- Reserve AVIF/WebP for photographic content — a photo embedded in an SVG gains nothing from the SVG wrapper.
- Keep the `viewBox`; drop fixed `width`/`height` attributes on the SVG root so it scales responsively.

## Delivery note

SVG is XML text: make sure brotli or gzip compression applies to `.svg` responses — the wins are large. See the caching section of [delivery-strategy.md](./delivery-strategy.md).
