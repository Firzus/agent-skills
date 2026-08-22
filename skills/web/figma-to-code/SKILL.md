---
name: figma-to-code
description: >-
  Implements a Figma design in the current codebase from a Figma URL, using
  the Figma MCP server: extracts design context, tokens (colors, typography,
  spacing), and assets (SVG, PNG) into the project, builds the UI with the
  project's stack, then iterates against the Figma screenshot until the
  result is pixel-accurate. Use when the user provides a Figma link and wants
  it implemented, asks to "implement this Figma design", "build this screen
  from Figma", "make it match the Figma", or mentions figma-to-code.
---

# Figma to Code (Figma MCP → project stack)

Turn a Figma node into production code in the host project. The Figma MCP
server output (typically React + Tailwind) is a **representation of the
design, not final code** — re-express it in the project's language, framework,
components, and tokens. The work is done only when a rendered screenshot of
the implementation **matches** the Figma screenshot — every visible deviation
resolved or explicitly accepted by the user.

## Prerequisites

Verify all three before starting. If one fails, stop and tell the user what is
missing.

1. **Figma MCP server connected.** Figma MCP tools (e.g. `get_design_context`)
   are callable. If not, guide the user to enable the Figma MCP server and
   restart their MCP client.
2. **Figma URL with a node id**, in the format
   `https://figma.com/design/:fileKey/:fileName?node-id=1-2`. If the URL has
   no `node-id`, ask the user to select the frame and copy its link — never
   guess a node id.
3. **A target project.** Identify its stack (framework, styling system,
   component library) and its conventions for assets and tokens before
   writing anything.

## Required workflow

Follow the steps in order.

### Step 1: Fetch the design context

Extract the file key (segment after `/design/`) and node id (`node-id` query
parameter) from the URL, then call `get_design_context(fileKey, nodeId)`. It
returns reference code, layout, typography, colors, component structure, and
asset URLs.

If the response is truncated or times out: call `get_metadata(fileKey,
nodeId)` for the node map, then fetch each child node individually with
`get_design_context`. Do not fall back to implementing from the screenshot
alone while `get_design_context` can still answer.

### Step 2: Capture the reference screenshot

Call `get_screenshot(fileKey, nodeId)` and save the image inside the project
(e.g. under a gitignored `tmp/` or the OS temp directory). This screenshot is
the **reference** for the comparison loop in Step 6 — every iteration is
judged against it, not against memory of the design.

### Step 3: Extract tokens into the project's token system

Call `get_variable_defs(fileKey, nodeId)` to list the colors, typography, and
spacing variables the design uses. Then locate the project's token source
(theme file, CSS custom properties, Tailwind config, design-system package)
and map every Figma variable onto it:

- **Reuse an existing project token** when one matches or is close; prefer the
  project value on conflict.
- **Add a token** to the project's token source only when nothing close
  exists, named by the project's convention.
- If the project has no token system, create a minimal one in the stack's
  idiomatic location rather than scattering raw values.

Completion: every color, font, and spacing value the implementation will use
resolves to a token — no raw hex or magic number left for Step 5 to hardcode.

### Step 4: Export assets into the project

Download every image and icon the design context references (SVG for vectors,
PNG at 2x for bitmaps) into the project's asset folder, following its existing
layout and naming. Rules:

- **Render every icon and image from its exported asset.** The MCP asset URLs
  expire (~7 days), so commit the downloaded bytes — never leave a hotlinked
  MCP URL, a placeholder, or a hand-drawn `<svg>` in committed code.
- Reuse a project icon component only when its glyph visibly matches the
  design; a name match is not enough.
- Recreate flat shapes and simple gradients in CSS instead of exporting
  bitmaps for them.

### Step 5: Build the design

Implement the node in the project's stack:

- Reuse existing components, layout patterns, and utility classes before
  creating new ones; extend a close component rather than duplicating it.
- Honor the design-context hints by priority: Code Connect snippets, then
  component documentation, then designer annotations, then design tokens,
  then raw values read against the screenshot.
- Style through the tokens mapped in Step 3; size every image container
  explicitly (width and height) so assets render at design size.
- Implement the interactive states the design defines (hover, active,
  disabled, focus).

### Step 6: Compare and iterate until the design matches

Render the implementation (dev server, Storybook, or the project's preview)
at the Figma frame's dimensions and screenshot it with the available browser
tooling. Put the render side by side with the Step 2 reference and sweep:

- layout: position, alignment, sizing, element order, responsive behavior at
  the frame width;
- spacing: margins, paddings, gaps;
- typography: family, size, weight, line height, letter spacing;
- color: fills, borders, shadows, gradients — resolved through tokens;
- assets: correct glyph, no stretching, no missing image.

Fix every deviation found, re-render, and compare again. The loop exits only
in one of two states:

- **Match** — a full sweep finds no visible deviation from the reference.
- **Accepted deviation** — a difference that cannot or should not be closed
  (font unavailable, accessibility fix, platform constraint), listed to the
  user with its reason.

One comparison pass is never enough; do not declare the work done on an
unswept render.

## Rules

- **DO** prefer project tokens and components over raw Figma values.
- **DO** commit downloaded asset bytes, sized explicitly where used.
- **DON'T** paste the MCP reference code verbatim — re-express it in the
  project's stack and conventions.
- **DON'T** hand-write vector paths or substitute placeholder assets.
