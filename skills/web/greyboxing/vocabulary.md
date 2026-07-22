# Pattern vocabulary

A vocabulary, not a library: named patterns to think and communicate with, so plans reach past the default layout. Pull a pattern when the design read and dials call for it — never because the name sounds impressive. Signature elements are usually one of these executed with conviction.

## Hero paradigms

- **Asymmetric split hero** — text one side, asset the other, generous whitespace.
- **Editorial manifesto hero** — large type, no asset, almost a poster.
- **Media mask hero** — type cut out as a mask over video or imagery.
- **Kinetic-type hero** — animated typography as the primary visual.
- **Scroll-pinned hero** — hero stays pinned while content scrolls behind.
- **Ghost-watermark hero** — oversized near-invisible display type behind the subject.

## Navigation & menus

- **Magnetic button** — pulls toward the cursor.
- **Dynamic island** — morphing pill for status and alerts.
- **Mega menu reveal** — full-screen dropdown with staggered content.
- **Floating speed dial** — FAB springing into secondary actions.

## Layout & grids

- **Bento grid** — asymmetric tile grouping; exactly as many cells as there is content.
- **Masonry** — staggered grid, no fixed row height.
- **Split-screen scroll** — two halves sliding in opposite directions.
- **Sticky-stack sections** — sections pin and physically stack on scroll.
- **Broadsheet** — editorial columns, hairline rules, type-led hierarchy.

## Cards & containers

- **Parallax tilt card** — 3D tilt tracking the pointer.
- **Spotlight border card** — border illuminates under the cursor.
- **Glassmorphism panel** — frosted glass with an inner refraction edge; solid fallback under `prefers-reduced-transparency`.
- **Morphing modal** — the trigger expands into its own dialog.

## Scroll animations

- **Horizontal scroll hijack** — vertical scroll drives a horizontal pan.
- **Sequence scroll** — video or image sequence tied to scroll progress.
- **Zoom parallax** — central image zooming with scroll.
- **Scroll progress path** — an SVG line drawing itself along the scroll.

## Galleries & media

- **Coverflow carousel** — 3D carousel with angled edges.
- **Drag-to-pan grid** — boundless draggable canvas.
- **Accordion image slider** — narrow strips expanding on hover.
- **Hover image trail** — the pointer leaves a trail of popping images.

## Typography & text

- **Kinetic marquee** — endless text band; at most one per page.
- **Text mask reveal** — massive type as a transparent window to media.
- **Text scramble** — decoding effect on load or hover.
- **Circular text path** — text curving along a spinning circle.

## Micro-interactions & effects

- **Skeleton shimmer** — light sweep across loading placeholders shaped like the final layout.
- **Directional hover fill** — fill enters from the cursor's side.
- **Animated SVG line drawing** — vectors drawing themselves.
- **Lens blur depth** — background blurred to focus the foreground action.

## Library pairing

- UI and state-change motion → the project's UI motion library (Motion, CSS transitions).
- Scrolltelling, pinning, scrub → GSAP ScrollTrigger, isolated in leaf components with cleanup.
- Canvas backgrounds and 3D scenes → three.js ([3d-vfx.md](./3d-vfx.md)), same isolation rule.
- One driver per component tree — GSAP or three.js never share a subtree's frames with a UI motion library.
