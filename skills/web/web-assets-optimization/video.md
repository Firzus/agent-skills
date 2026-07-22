# Video Reference

Encode once, deliver everywhere: produce a compact WebM plus a universal MP4 fallback, extract a poster, and wire markup that loads only what the viewport needs. Use only the ffmpeg flags documented here — do not invent options.

## Codec and container strategy

Serve WebM (VP9 or AV1, with Opus audio) first, then MP4 (H.264 + AAC) as the universal fallback. The browser picks the first `<source>` it can play, so order sources from most efficient to most compatible.

| Codec | Container | Support | Size vs H.264 |
| --- | --- | --- | --- |
| H.264 (AVC) | MP4 | Every browser, hardware decode everywhere | baseline |
| VP9 | WebM | All modern browsers, including modern Safari | ~20-50% smaller |
| AV1 | WebM/MP4 | Chrome, Firefox, Edge, Opera; Safari only with hardware decode | ~30-50% smaller |

Never ship AV1-only — always keep an H.264 MP4 `<source>`. Plain `type="video/mp4"` is enough for format skipping; a `codecs=` parameter is optional and must match the actual encode — `avc1.640028,mp4a.40.2` for the High-profile output of the libx264 recipe below, `avc1.42E01E,mp4a.40.2` only if you encode with `-profile:v baseline -level 3.0`. Advertising a profile the file does not have makes old devices pick a source they cannot decode.

## H.264 (libx264) recipe

The safe single-file choice and the mandatory fallback:

```bash
ffmpeg -i in.mov -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ac 2 -movflags +faststart out.mp4
```

- CRF: range 0-51, default 23, sane range 18-28. Lower means better quality and bigger files; 18 is near visually lossless.
- Presets run ultrafast through veryslow; slower presets shrink the file at the same CRF with no quality loss. Use `slow` or `veryslow` for encode-once web assets.
- `-movflags +faststart` is mandatory for progressive MP4: it moves the moov atom to the front so playback starts before the full download.
- `-pix_fmt yuv420p` is mandatory for playback compatibility — players choke on 4:2:2/4:4:4.
- Muted loop / GIF replacement variant — strip audio and relax quality:

```bash
ffmpeg -i in.mov -an -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart bg.mp4
```

- Scale down with `-vf "scale=1280:-2"` — width 1280, height automatic and forced even (`-2`), which H.264 requires.
- For very old devices, add `-profile:v baseline -level 3.0` (costs compression efficiency); otherwise leave the profile alone.
- Use two-pass (`-pass 1` / `-pass 2` with `-b:v`) only when you must hit an exact file size; prefer CRF otherwise.

## VP9 (libvpx-vp9) recipe

Two-pass constant quality, per Google's VOD guidance (two-pass is recommended even in CRF mode):

```bash
ffmpeg -i in.mp4 -c:v libvpx-vp9 -b:v 0 -crf 32 -pass 1 -speed 4 -row-mt 1 -an -f null /dev/null
ffmpeg -i in.mp4 -c:v libvpx-vp9 -b:v 0 -crf 32 -pass 2 -speed 1 -row-mt 1 -c:a libopus -b:a 96k out.webm
```

Recommended CRF by output resolution:

| Resolution | CRF |
| --- | ---: |
| 1080p | 31 |
| 720p | 32 |
| 480p | 33-34 |
| 360p | 36 |

Constrained-bitrate targets for VOD (24-30 fps), when a bitrate cap matters more than constant quality:

| Resolution | Target | Min / Max |
| --- | ---: | --- |
| 1080p | 1800k | 900k / 2610k |
| 720p | 1024k | — |
| 480p | 512-750k | — |

## AV1 recipe

Prefer SVT-AV1 (`libsvtav1`); libaom is far slower for similar quality:

```bash
ffmpeg -i in.mp4 -c:v libsvtav1 -crf 30 -preset 6 -c:a libopus -b:a 96k out.webm
```

- SVT-AV1: CRF ~30 for general use, 24-26 for high quality; presets 4-6 are a reasonable speed/quality trade-off.
- libaom-av1 notes: `-crf` range is 0-63 (higher = smaller/worse), `-cpu-used` 0-8 (higher = faster), and encoding is very slow.
- Use CRF mode: true two-pass is limited in ffmpeg's libsvtav1 wrapper.

## Poster extraction

`-ss` before `-i` performs a fast input seek; `-frames:v 1` grabs a single frame; `-q:v 2` is a high JPEG quality on the VBR scale:

```bash
ffmpeg -ss 00:00:02 -i in.mp4 -frames:v 1 -q:v 2 poster.jpg
ffmpeg -ss 00:00:02 -i in.mp4 -frames:v 1 poster.webp
```

Posters are LCP candidates — optimize and size them like any raster image via [sharp-cli.md](./sharp-cli.md), and never lazy-load a poster that is the LCP element.

`fetchpriority` is not a valid attribute on `<video>` and cannot be attached to `poster`. When the poster is the LCP candidate, boost it from `<head>` instead, and keep the video's own sources on their normal (autoplay or `preload`-driven) schedule:

```html
<link rel="preload" as="image" href="poster.jpg" fetchpriority="high">
```

## `<video>` markup

- Always set `type` on each `<source>` so the browser can skip formats without downloading them. Order: most efficient first (AV1 or VP9 WebM), MP4/H.264 last.
- Hero/background loops require `autoplay muted playsinline loop` — browsers block autoplay with audible audio, and `playsinline` is needed for inline iOS playback.
- These are boolean attributes: remove them to disable. `autoplay="false"` and `muted="false"` do not work.
- `preload`: `none` (user may never play — click-to-play embeds), `metadata` (duration/dimensions only; the spec-advised default), `auto` (full download). It is a hint, and `autoplay` overrides it.
- Always set integer `width`/`height` attributes to reserve space (no CLS), plus CSS `max-width: 100%; height: auto` for responsiveness.
- Combine `poster` with `preload="none"` for cheap non-autoplay embeds; the poster carries the visual until play.

```html
<!-- Hero/background loop -->
<video autoplay muted playsinline loop width="1280" height="720" poster="poster.jpg">
  <source src="bg.webm" type="video/webm" />
  <source src="bg.mp4" type="video/mp4" />
</video>

<!-- Click-to-play demo -->
<video controls preload="metadata" width="1280" height="720" poster="poster.jpg">
  <source src="demo.webm" type="video/webm" />
  <source src="demo.mp4" type="video/mp4" />
</video>
```

## Lazy vs eager loading

Lazy-load below-the-fold videos, click-to-play embeds, and any page with multiple videos. `loading="lazy"` on `<video>` has uneven support, so use the robust cross-browser pattern: put the URL in `data-src` on each `<source>`, then swap it to `src` and call `load()` from an IntersectionObserver when the element nears the viewport.

```html
<video class="lazy" autoplay muted playsinline loop width="1280" height="720" poster="poster.jpg">
  <source data-src="bg.webm" type="video/webm" />
  <source data-src="bg.mp4" type="video/mp4" />
</video>
```

```js
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const video = entry.target;
    for (const source of video.querySelectorAll("source[data-src]")) {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    }
    video.load();
    observer.unobserve(video);
  }
});
document.querySelectorAll("video.lazy").forEach((v) => observer.observe(v));
```

Also pause autoplay loops that scroll out of view (another IntersectionObserver calling `pause()`/`play()`). Load eagerly only the above-the-fold autoplay hero — and keep that file tiny. Priority, preload, and LCP rules live in [delivery-strategy.md](./delivery-strategy.md).

## Progressive vs streaming

Progressive `+faststart` MP4 (or WebM) is sufficient for short clips, background loops, product demos, and any single-quality asset: zero infrastructure and byte-range seeking works. Reach for HLS/DASH only for long-form content, live streams, or genuine adaptive multi-bitrate needs — it requires segmenting plus a player library (hls.js/dash.js; native HLS is Safari-only) and is overkill for typical marketing or docs sites.

## Size targets by use case

| Use case | Spec | Target |
| --- | --- | --- |
| Background/hero loop | 5-15 s, muted (`-an`), 720p-1080p, 24 fps, CRF 26-30 (x264) / 33-38 (vp9) | < 1-2 MB total |
| Product demo / screencast | 720p-1080p, CRF 23-26; screen content compresses well | ~0.5-1.5 Mbps video |
| General VOD 1080p | H.264 CRF 21-23 or VP9 ~1800k | 2-4 Mbps (H.264), ~1.8 Mbps (VP9) |
| GIF replacement | MP4/WebM loop instead of GIF | typically 5-10x smaller than the GIF |

Audio: AAC 128k stereo in MP4, Opus 96-128k in WebM, and `-an` for anything muted. GIF-specific conversion guidance and reduced-motion fallbacks: [animated-media.md](./animated-media.md).

## Command plan

Generate a reviewable command plan from the asset scan:

```bash
python3 <skill-dir>/scripts/generate-ffmpeg-plan.py asset-scan.json
```

It prints commands only (MP4 + two-pass WebM + poster per video, plus GIF conversions) — nothing runs until you review and execute them. After running two-pass encodes, delete the ffmpeg `-passlogfile` logs so the tree stays clean.
