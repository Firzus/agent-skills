# 3D & VFX

A ladder, cheapest rung first. Climb only when the content justifies the next rung — the subject is spatial, the motion is the message, or the user manipulates the thing. Facts below verified July 2026; re-check versions and support when precision matters.

## The ladder

**1 — Scroll-driven & parallax.** Native CSS first: `animation-timeline: scroll()` / `view()` (~84 % support, runs off the main thread) inside `@supports`, page fully usable without. GSAP ScrollTrigger (free since 3.13, commercial included) only for what CSS can't do: pinning, scrub with inertia, orchestrated timelines. Lenis only when a WebGL render must sync with scroll.

**2 — Video & cinematics.** Pre-rendered "3D": AAA quality, hardware decoding, zero device risk — the recommended substitute for rungs 3–5 whenever interactivity isn't needed. Serve AV1/WebM with an H.264/MP4 fallback last (Apple decodes AV1 in hardware only: M3+/iPhone 15 Pro+). Reliable autoplay needs `muted playsinline poster preload="metadata"` — the poster doubles as the LCP candidate. Scrubbed video needs all-keyframe encoding; an image sequence on canvas is smoother but heavy — desktop only, lighter mobile variant.

**3 — A single 3D object in a 2D page.** `<model-viewer>` + glTF/GLB compressed with Draco or Meshopt + KTX2 textures; budget **1–3 MB** per model. `poster` + `reveal="interaction"` keeps it out of the critical load; `ios-src`/auto-generated USDZ gives AR Quick Look. Earned when the object gains from manipulation (product, AR try-out); a looping untouchable model is rung 2 in disguise.

**4 — A fully 3D site.** three.js / react-three-fiber + drei. **WebGL2 is the production baseline; WebGPU is a runtime enhancement** (`WebGPURenderer` falls back automatically — Firefox ships it on Windows only). three.js is ~155 KB gzip and barely tree-shakes: load scenes by dynamic import, never in the critical bundle. Cap pixel ratio at `min(devicePixelRatio, 2)`; render on demand and stop the loop off-viewport and on hidden tabs; move heavy scenes to a worker via OffscreenCanvas (Baseline since 2023). A canvas is never an LCP candidate — keep a real poster, image, or text at first paint.

**5 — Advanced VFX.** Custom shaders (write TSL — compiles to both WGSL and GLSL), fused post-processing (pmndrs `postprocessing`, one `EffectPass`, DPR 1.5 on mobile), GPGPU particles (mobile tier 10–50k vs desktop 500k+), WebGL text (troika SDF — decorative only: WebGL text doesn't exist for screen readers, SEO, or selection; meaningful text stays in the DOM). Requires rung 3–4 plus shader competence. Earned only when the effect *is* the site's signature and a CSS filter or a video can't fake it.

## Decision

| The rung is earned when…                                                    | It's decorative when…                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------- |
| The subject is spatial or the motion IS the message (product, data, story)  | It's there "because it looks good" on a content site |
| The user manipulates the scene (orbit, configure, explore)                  | It autoplays and can't be touched — use video        |
| The site is itself the demonstration (studio, campaign)                      | A cheaper rung produces the same perceived effect    |
| The team can hold the budget: fallbacks, multi-device QA, three.js upkeep   | No mobile QA or fallback is planned                  |

When in doubt, descend a rung — the review test still applies: the effect stays only if removing it would lose meaning or authored character.

## Non-negotiable fallbacks

1. `prefers-reduced-motion: reduce` → no autoplay, no parallax, no animated camera; static or dissolve.
2. WebGL missing or software-rendered (`failIfMajorPerformanceCaveat`, `webglcontextlost`) → static image/video, content intact.
3. Meaningful content (text, CTA, navigation) always lives in the DOM — canvas is presentation only.
4. Video: `muted playsinline` + poster + H.264/MP4 last.
5. CSS scroll-driven effects behind `@supports`; the page works without them.
6. WebGPU never required — runtime detection with WebGL2 fallback.
