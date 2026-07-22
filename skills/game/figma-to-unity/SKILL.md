---
name: figma-to-unity
description: >-
  Implements Figma designs (frames, components, HUD elements, menus) as Unity
  UI Toolkit interfaces — UXML hierarchy, USS styles mapped to design tokens,
  exported sprite assets, and a minimal C# controller — using the Figma MCP
  server (get_design_context, get_metadata, get_screenshot,
  get_variable_defs). Use when the user provides a Figma URL and wants it
  implemented in a Unity project, asks to "implement this Figma design in
  Unity", "build this HUD/menu/component from Figma", "convert Figma to
  UXML/USS", or mentions figma-to-unity.
---

# Figma to Unity (Figma MCP → UI Toolkit)

Translate a Figma design into production-ready Unity UI Toolkit code: UXML for structure, USS for style (wired to the project's design tokens), exported assets with correct import settings, and a thin C# controller. The Figma MCP server output (typically React + Tailwind) is a **representation of the design, not final code** — always re-express it in UXML/USS following the host project's conventions.

## Prerequisites

Verify all three before starting. If one fails, stop and tell the user.

1. **Figma MCP server connected.** Check that Figma MCP tools (e.g. `get_design_context`) are available. If not, guide the user to enable the Figma MCP server (included with the Figma desktop app / plugin) and restart their MCP client.
2. **Figma URL with a node id**, in the format `https://figma.com/design/:fileKey/:fileName?node-id=1-2`. If the URL has no `node-id`, ask the user to select the frame/component and copy its link.
3. **Unity project using UI Toolkit.** Look for `.uxml`/`.uss` files and `UIDocument` usage under `Assets/`. If the project's UI is uGUI (Canvas + TextMeshPro), say so and stop — this skill does not cover uGUI.

## Required workflow

Follow these steps in order. Do not skip steps.

### Step 1: Extract file key and node ID

From `https://figma.com/design/:fileKey/:fileName?node-id=1-2`:

- **File key**: the segment after `/design/`
- **Node ID**: the `node-id` query parameter value (e.g. `1461-137`)

### Step 2: Fetch design context

Run `get_design_context(fileKey, nodeId)`. It returns layout (Auto Layout, constraints, sizing), typography, colors/tokens, component structure, and spacing.

**If the response is too large or truncated:**

1. Run `get_metadata(fileKey, nodeId)` to get the high-level node map.
2. Identify the child nodes you need.
3. Fetch each child individually with `get_design_context(fileKey, childNodeId)`.

### Step 3: Capture the visual reference

Run `get_screenshot(fileKey, nodeId)`. This screenshot is the source of truth for visual validation — keep it accessible throughout implementation.

### Step 4: Map design tokens to USS variables

Run `get_variable_defs(fileKey, nodeId)` to retrieve colors, typography, and spacing variables used by the design.

Then locate the project's existing theme/token stylesheet (search for USS files defining `--*` custom properties, often named `Theme.uss`, `Tokens.uss`, or referenced from a `.tss` theme file):

- **Reuse existing tokens first.** Map each Figma variable to the closest existing USS variable (`var(--accent)`, `var(--font-size-md)`, ...).
- **Add new tokens** to the theme stylesheet only when nothing close exists. Name them following the project's convention.
- **On conflict** (project token value differs from Figma): prefer the project token for consistency, and adjust spacing/sizing minimally to preserve visual fidelity.
- If the project has no token stylesheet, propose creating one rather than hardcoding values across files.

### Step 5: Export required assets

Download any images/icons returned by the Figma MCP server into the project's UI art folder (follow the host project's layout, e.g. `Assets/Art/UI/<Feature>/` or `Assets/UI/<Feature>/Sprites/`).

Asset rules:

- If the MCP server returns a `localhost` source for an image or SVG, use that source directly. Do not substitute placeholders and do not import icon packages.
- Prefer vector data (SVG, supported by UI Toolkit in Unity 6.2+) for icons when the project already imports SVGs; otherwise export PNG at 2x.
- After import, set Texture Type to **Sprite (2D and UI)**. For panels, frames, and bars that stretch, configure **9-slice borders** in the Sprite Editor and use `-unity-slice-*` / `-unity-background-image-tint-color` in USS as needed.
- Decorative gradients and flat shapes usually do not need an asset — recreate them in USS (or a custom `VisualElement` with `generateVisualContent`) instead of exporting a bitmap.

### Step 6: Translate to UXML + USS

Build the `VisualElement` hierarchy in UXML and style it in USS. Key principles:

- Treat the Figma MCP code output (React + Tailwind) as a design spec: read flex direction, padding, gap, radius, colors from it — do not transliterate JSX or Tailwind classes.
- Mirror Figma Auto Layout frames as containers with `flex-direction`, and convert gap/padding/sizing per [figma-to-uss-mapping.md](./figma-to-uss-mapping.md). Consult that reference for the full property mapping and USS limitations (no `gap` in most versions, no `box-shadow`, no `z-index`...).
- Reuse existing UXML components, USS utility classes, and custom `VisualElement`s from the project before creating new ones. When a similar component exists, extend it (new USS class/variant) rather than duplicating it.
- Name elements (`name="HealthBarFill"`) only when C# needs to query them; style through classes, not names.
- Follow the host project's file layout and naming (e.g. one feature folder containing `Feature.uxml`, `Feature.uss`, `FeatureController.cs`).

### Step 7: Write the minimal C# controller

- `MonoBehaviour` with a `[SerializeField] UIDocument` (or follow the project's established UI wiring pattern if it differs).
- Query elements once in `OnEnable` via `root.Q<T>("Name")`; cache references.
- The controller binds data to the view (set `style.width`, text, toggle USS classes). No game logic in the view layer, no game logic in `VisualElement` subclasses.
- Hook into the project's existing data flow (events, view models, ScriptableObject channels) instead of polling in `Update` when possible.

### Step 8: Validate against the Figma screenshot

Compare the rendered result (Game view / UI Builder preview) with the Step 3 screenshot before marking the task complete:

- [ ] Layout matches: spacing, alignment, sizing, element order
- [ ] Typography matches: font, size, weight, letter spacing, alignment
- [ ] Colors match (through tokens, not hardcoded values)
- [ ] Assets render correctly (no stretching artifacts; 9-slice borders correct)
- [ ] Interactive states styled where designed (`:hover`, `:active`, `:disabled`)
- [ ] Behavior verified with representative data (e.g. bar at 0%, 50%, 100%)

If the user can run the Editor, ask them to confirm visually; otherwise list any known deviations and why.

## Rules

- **DO** prefer project tokens over raw Figma values when they conflict.
- **DO** reuse existing components, classes, and custom elements before creating new ones.
- **DO** document any intentional deviation from the Figma design (accessibility, technical constraint) in a short code comment.
- **DON'T** hardcode a color/size/font when a token exists for it.
- **DON'T** invent or placeholder assets when the MCP payload provides a source.
- **DON'T** port Tailwind class names, web-only CSS properties, or React component structure into USS/UXML.

## Additional resources

- Property-by-property translation tables and USS limitations: [figma-to-uss-mapping.md](./figma-to-uss-mapping.md)
- For broader Unity UI Toolkit architecture guidance (design systems, MVP/MVVM, data binding), use the `unity6-aaa-best-practices` skill if available.
