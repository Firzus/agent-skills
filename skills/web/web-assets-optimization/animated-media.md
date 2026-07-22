# Animated Media Reference

Use this reference when replacing animated GIFs in pages, or when choosing between `<video>` and animated WebP/AVIF for looping animations. For deeper encode options and full markup rules, see [video.md](./video.md). For the lazy loading policy applied to below-fold animations, see [delivery-strategy.md](./delivery-strategy.md).

## Why GIF loses

- GIF stores 8-bit indexed color (max 256 colors per frame), 1-bit transparency (no alpha), and uses LZW lossless compression with no inter-frame motion compression — every frame is stored near-fully.
- Video codecs (H.264/VP9/AV1) use inter-frame prediction, so the same animation compresses dramatically better. Real-world deltas: a 3.7 MB GIF becomes a 551 KB MP4 (~85% smaller) or a 341 KB WebM (~91% smaller).
- Even the image-format replacements beat GIF substantially: animated AVIF is often ~90% smaller than the equivalent GIF.

Treat any GIF referenced in a page as a byte hog to replace unless the context only accepts image formats (see the last section).

## Conversion targets

| Target | Element | Support | Notes |
| --- | --- | --- | --- |
| MP4 / H.264 | `<video>` | Universal | Safest video baseline; always include it |
| WebM / VP9 | `<video>` | All modern browsers | Smaller than H.264; list it first — browsers pick the first playable `<source>`, they do not pick the optimal one |
| Animated WebP | `<img>` | All modern browsers | Drop-in `<img>` replacement; supports looping and alpha |
| Animated AVIF | `<img>` | Modern browsers, animated support more recent than still AVIF | Best compression; no progressive rendering; always provide a fallback via `<picture>` |

Prefer `<video>` for anything sizeable or long; prefer animated WebP/AVIF when you need `<img>` semantics (alt text, `loading="lazy"`, Markdown-adjacent pipelines).

## Verified ffmpeg commands

These are the commands `scripts/generate-ffmpeg-plan.py` emits for GIF assets.

```bash
# GIF -> MP4 (H.264). yuv420p is required for broad browser compatibility
# (the default pix_fmt inherited from GIF input may be unplayable).
# H.264 + yuv420p requires EVEN width/height or ffmpeg errors; the scale
# filter truncates each dimension down to the nearest even number (loses <=1px).
ffmpeg -i in.gif -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart -an out.mp4
# Quality control: -crf 23..28; 26 is the script default.
# -movflags +faststart moves the moov atom to the front so playback
# starts before the file finishes downloading.

# GIF -> WebM (VP9), constant-quality mode:
ffmpeg -i in.gif -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  -c:v libvpx-vp9 -b:v 0 -crf 41 -an out.webm
# VP9 tolerates odd dimensions, but the script keeps the same scale
# filter so the WebM output stays consistent with the MP4.
```

Always pass `-an`: GIFs have no audio, and a silent audio track wastes bytes and can interfere with autoplay policies.

## `<video>` replacement markup

```html
<video autoplay muted loop playsinline width="640" height="360">
  <source src="anim.webm" type="video/webm">
  <source src="anim.mp4" type="video/mp4">
</video>
```

- `muted` is mandatory for `autoplay` to work under mobile and desktop autoplay policies.
- `playsinline` prevents iOS Safari from taking the video fullscreen.
- `loop` reproduces GIF looping.
- Order WebM before MP4 — the first playable source wins.
- Set `width`/`height` (or a CSS `aspect-ratio`) to reserve space and avoid CLS.
- `<video>` has no `alt` attribute: if the animation is meaningful, add `aria-label` or describe it in nearby text.

## `<picture>` with animated AVIF/WebP

Use this when you want to keep `<img>` semantics (alt text, native lazy loading) and a video element is not wanted:

```html
<picture>
  <source type="image/avif" srcset="anim.avif">
  <source type="image/webp" srcset="anim.webp">
  <!-- loading attribute per the Step 3 strategy matrix: lazy only below the fold; never on an LCP candidate -->
  <img src="anim.gif" alt="Description" width="640" height="360">
</picture>
```

- The `<img>` keeps the original GIF as the universal fallback and carries `alt`, `width`/`height`, and the loading policy from the strategy matrix.
- Always wrap animated AVIF in `<picture>` with fallbacks — never ship it as a bare `<img src>`.

## prefers-reduced-motion

CSS cannot pause an animated GIF, WebP, or AVIF: the animation is a property of the media itself, not of CSS. The only fixes are serving a static file or swapping `src` in JS.

For image-based animations, use the `<picture>` technique — the reduced-motion `<source>` MUST come first:

```html
<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="still.png">
  <source type="image/webp" srcset="anim.webp">
  <img src="anim.gif" alt="Description" width="640" height="360">
</picture>
```

For `<video>` replacements, gate autoplay in JS:

```js
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) video.play();
```

Alternatively, show `controls` and skip `autoplay` entirely so the user opts in.

## When to keep a real GIF

Keep an actual GIF only when:

- The context only accepts image formats: README/Markdown renderers without video support, email clients, chat/embed platforms, Open Graph previews.
- The GIF is tiny (a few KB) and the pipeline or CMS cannot emit multiple sources.
- It serves as the `<img>` fallback inside a `<picture>` element.

Even then, prefer better image formats when the renderer supports them: APNG beats GIF for simple lossless animation (better color depth), and animated WebP/AVIF beat both.
