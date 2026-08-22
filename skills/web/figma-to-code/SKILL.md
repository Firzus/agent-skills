---
name: figma-to-code
description: >-
  Implements a Figma design from a Figma URL, using the Figma MCP server:
  extracts design context, tokens (colors, typography, spacing), and assets
  (SVG, PNG), builds the UI in the project's stack — or as a standalone page
  for design review — then iterates until the render matches the node
  geometry Figma reports, to the pixel, and the reference screenshot. Use
  when the user provides a Figma link and wants it implemented, asks to
  "implement this Figma design", "build this screen from Figma", "make it
  match the Figma", or mentions figma-to-code.
---

# Figma to Code (Figma MCP → project stack)

Turn a Figma node into production code. The Figma MCP server output
(typically React + Tailwind) is a **representation of the design, not final
code** — re-express it in the target's language, framework, components, and
tokens. The work is done only when the rendered result **matches** the
design twice over: numerically against the node geometry Figma reports, and
visually against the reference screenshot — every deviation resolved or
explicitly accepted by the user.

**Tool mechanics live elsewhere.** The Figma MCP plugin ships its own
`figma-design-to-code` skill and declares it a mandatory prerequisite for
`get_design_context`. When that skill is available, read it before the first
call and follow it for the MCP mechanics — URL parsing, parameters, the
`skillNames` logging field, error recovery. This skill layers the token,
font, asset, and pixel-verification workflow on top; on tool mechanics the
plugin skill wins.

## Prerequisites

Verify all three before starting. If one fails, stop and tell the user what
is missing.

1. **Figma MCP server connected.** Figma MCP tools (e.g. `get_design_context`)
   are callable. If not, guide the user to enable the Figma MCP server and
   restart their MCP client.
2. **Figma URL with a node id**, in the format
   `https://figma.com/design/:fileKey/:fileName?node-id=1-2`. If the URL has
   no `node-id`, ask the user to select the frame and copy its link — never
   guess a node id.
3. **A target.** Either a host project — identify its stack (framework,
   styling system, component library) and its conventions for assets and
   tokens before writing anything — or, when the user wants a throwaway
   artifact to evaluate the design, **standalone mode**: a self-contained
   HTML + CSS page, no framework, in a **fresh, uniquely named scratch
   folder** created for this run — a reused folder silently mixes this
   run's assets with a previous run's under different names.

## Required workflow

Follow the steps in order.

### Step 1: Fetch design context and geometry

Extract the file key (segment after `/design/`) and node id (`node-id` query
parameter) from the URL, then:

- Call `get_design_context(fileKey, nodeId)`. It returns reference code,
  layout, typography, colors, component structure, asset URLs, and an
  embedded screenshot. Use that screenshot for orientation only — the
  downloadable reference image comes from a separate `get_screenshot` call
  in Step 5.
- Build the geometry table with `get_metadata(fileKey, nodeId)`: x/y/width/
  height per node, the **numeric ground truth** the Step 5 diff is measured
  against. `get_metadata` expands only the levels it chooses: on a root
  frame it can return a single childless tag. A childless response means
  **descend** — re-call it on each inner container, node by node, until
  every leaf you will render has coordinates.

If the design context is truncated or times out: use the `get_metadata` node
map to fetch each child individually with `get_design_context`. Implement
from fetched context, not from the screenshot alone, while
`get_design_context` can still answer.

### Step 2: Ground fonts and tokens before building

**Fonts first.** List every family and weight the design context uses, and
verify each one is loadable in the render target (project font files, a
webfont service, or system install). Every text metric depends on the font,
so a comparison loop running on a substitute font measures the wrong thing.
Resolve missing fonts now — load them, or record the substitution as an
accepted deviation before the first render.

To self-host a missing Google font: query the Google Fonts CSS API with a
**desktop browser user-agent** and extract the latin `@font-face` block —
the default user-agent gets TTF without `unicode-range`. Download the woff2
files next to the other assets.

**Then tokens.** Call `get_variable_defs(fileKey, nodeId)` for the variables
the design binds. Expect a partial answer: designs often bind only some
values (e.g. spacing units), leaving colors and type as raw values in the
design context. Build the full token list from both sources — named
variables as-is, and raw values grouped by recurrence and role (the hex used
by every border is one token). Then map that list onto the target:

- **Typography arrives as a composite string** — e.g. `Font(family:
  "Outfit", style: SemiBold, size: 18, weight: 600, lineHeight: 100,
  letterSpacing: 0)`. Split it into `font-family`, `font-weight`,
  `font-size`, `line-height`, `letter-spacing`. `lineHeight` there is a
  **percentage of the font size**, not pixels.
- **Reuse an existing project token** when one matches or is close; prefer the
  project value on conflict.
- **Add a token** to the project's token source only when nothing close
  exists, named by the project's convention.
- In standalone mode or a project without a token system, declare the tokens
  as CSS custom properties at the top of the stylesheet.

Completion: every color, font, and spacing value the implementation will use
resolves to a named token, whether Figma named it or you did.

### Step 3: Export assets

Download every image and icon the design references (SVG for vectors, PNG at
2x for bitmaps) into the target's asset folder, following its existing
layout and naming. Use the `download_assets` MCP tool — one call returns the
node's export, source bitmaps, and SVG layers; collect asset URLs by hand
from the reference code only when the tool is unavailable. Rules:

- **Render every icon and image from its exported asset.** The MCP asset URLs
  expire (~7 days), so commit the downloaded bytes — never leave a hotlinked
  MCP URL, a placeholder, or a hand-drawn `<svg>` in committed code.
- Reuse a project icon component only when its glyph visibly matches the
  design; a name match is not enough.
- Recreate flat shapes and simple gradients in CSS instead of exporting
  bitmaps for them.

### Step 4: Build the design

Implement the node in the target's stack:

- Reuse existing components, layout patterns, and utility classes before
  creating new ones; extend a close component rather than duplicating it.
- Honor the design-context hints by priority: Code Connect snippets, then
  component documentation, then designer annotations, then design tokens,
  then raw values read against the screenshot.
- Restore semantics the MCP output flattens: its reference code is a mat of
  `<div>`s — re-express navigation, buttons, inputs, and links as `<nav>`,
  `<button>`, `<input>`, `<a>` (or the stack's equivalents).
- Style through the tokens mapped in Step 2; size every image container
  explicitly (width and height) so assets render at design size.
- Tag each rendered block with its Figma node id — `data-node-id="693:1500"`
  (or the stack's equivalent) — so the Step 5 geometry diff can resolve
  rendered elements against the `get_metadata` table.
- Implement the interactive states the design defines (hover, active,
  disabled, focus). Discover them through the component set's variants and
  designer annotations; a design with none defined needs none built.

**Figma-specific CSS in the MCP output** — properties that change metrics
when dropped or copied blindly:

- `text-box-trim` / `text-box-edge`: Figma trims text to cap height, so text
  block heights assume the trim. Keep the properties where the render target
  supports them; otherwise compensate the line-box difference explicitly —
  silently dropping them shifts every text block by several pixels.
- `leading-[normal]` in the reference code: never ship `line-height:
  normal`. Resolve the real value — the `lineHeight` percentage from the
  font token, cross-checked against the text node's height in
  `get_metadata`. `normal` rounds per font and, inside a `space-between`
  parent, a sub-pixel drift moves every sibling below it.
- Percentage `inset` on icon wrappers (e.g. `inset: 0 0 -10% 0`): encodes
  the icon's live area inside its bounding box. Keep the two-element
  pattern: a positioned wrapper carrying the insets, and the `<img>` at
  `width/height: 100%` inside it. Merging the two applies the insets to the
  bitmap itself and distorts the glyph.
- Absolute x/y positioning: often a decorator deliberately overflowing its
  parent. Check the node's geometry in `get_metadata` before "fixing" an
  overflow that is the design.

### Step 5: Verify to the pixel and iterate

Render the implementation at the Figma frame's dimensions — dev server,
Storybook, or the project's preview; in standalone mode a `file://` URL
works, with a cache-busting query parameter (`?v=2`) bumped on every reload,
since plain reloads serve stale copies. Viewport-resize tools land a pixel
or two off the requested size (e.g. `resize_page` to 720 yields an
`innerHeight` of 722) — read the actual `innerWidth`/`innerHeight` back and
account for the difference before trusting a full-width or full-height
measurement. Then run both checks:

1. **Numeric diff** — run [scripts/verify-geometry.js](./scripts/verify-geometry.js)
   in the rendered page (browser console or MCP evaluate), feeding it the
   Step 1 `get_metadata` table. It waits for `document.fonts.ready`,
   resolves elements by `data-node-id`, flags any x/y/width/height deviation
   above 1 px, and reports unloaded fonts among the families the rendered
   nodes use, plus broken images. It measures in CSS pixels
   (`getBoundingClientRect`), so device pixel ratio cannot skew it — which
   is why a passing diff is proof the layout matches, where a screenshot
   comparison alone is an opinion.
2. **Visual sweep** — download the reference with `get_screenshot(fileKey,
   nodeId)`, `maxDimension` set to the frame width, and compare it against
   the browser capture, programmatically where image tooling is available.
   **Normalize first**: a browser screenshot is scaled by the device pixel
   ratio (a 125% display captures 1280×720 as 1600×902) — resize the
   capture to the frame dimensions before any pixel diff, and expect
   resampling noise on edges. The sweep covers what geometry misses:
   typography, color (fills, borders, shadows, gradients — through tokens),
   assets (correct glyph, no stretching), interactive states.

Fix every deviation found, re-render, and compare again. The loop exits only
in one of two states:

- **Match** — the numeric diff passes and a full sweep finds no visible
  deviation from the reference.
- **Accepted deviation** — a difference that cannot or should not be closed
  (font unavailable, accessibility fix, platform constraint), listed to the
  user with its reason.

One comparison pass is never enough; do not declare the work done on an
unswept render.

## Rules

- **DO** prefer project tokens and components over raw Figma values.
- **DO** commit downloaded asset bytes, sized explicitly where used.
- **DO** verify with the numeric geometry diff before the visual sweep.
- **DON'T** paste the MCP reference code verbatim — re-express it in the
  target's stack, semantics, and conventions.
- **DON'T** hand-write vector paths or substitute placeholder assets.
