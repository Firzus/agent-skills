# UI — UI Toolkit, design tokens, MVP/MVVM

Default for new UI in Unity 6: **UI Toolkit (UITK)** for screen-space AND
world-space, structured as a design system, with data shown through MVP/MVVM
and runtime bindings. World-space UITK shipped in 6.2; custom shaders and USS
filters in 6.3. Stay on the latest Unity 6 release unless the project is locked.

## Choosing the system

- **DO** default to UITK for all new UI: menus, HUDs, data-heavy and
  multi-resolution interfaces, and world-space UI (Panel Settings →
  world-space render mode, since 6.2). UITK is retained-mode, renders
  textureless with a dynamic atlas, and gets all new Unity UI investment
  (world-space in 6.2; UI Shader Graph, USS filters, SVG-as-core all in 6.3).
- **DO** keep UGUI only where its remaining gaps bite: UI that needs
  Animator/Timeline keyframed animation, or a team shipping imminently on
  existing UGUI screens.
- **DON'T** migrate working UGUI screens mid-project. Mixing both systems
  per-view is supported and fine.
- **DON'T** mis-attribute capabilities by version: world-space UITK is **6.2**;
  **custom shaders (UI Shader Graph) and USS filters are 6.3** (not 6.0/6.1/6.2).
  On a project locked below the capability's version, the old workaround
  (render texture, UGUI world canvas) still applies.
- **DO** add UITK content to scenes with the **Panel Renderer** component on
  6.5+ (it replaces UI Document and improves world-space UI); UI Document still
  works but is the legacy path.

## Design system (tokens)

- **DO** define design tokens as USS variables: colors, spacing, radii, type
  scale (`--color-primary`, `--space-2`, `--font-size-body`...), in a single
  tokens USS file.
- **DO** compose tokens into **theme style sheets (TSS)**: import the default
  theme (`@import url("unity-theme://default")`) then override tokens per theme
  (dark/light, platform, seasonal). Switch themes at runtime by swapping TSS.
- **DON'T** hardcode colors/sizes inline on elements or duplicate values across
  USS files — every visual constant goes through a token.
- **DO** let UI artists own UXML/USS in UI Builder; keep C# out of layout.
- **DO** reach for **USS filters** (blur, grayscale, sepia, tint, invert,
  opacity — 6.3, URP) and **UI Shader Graph** custom materials (6.3) for visual
  effects instead of pre-rendered textures or per-frame C# tinting.
- **DON'T** assume these exist below 6.3 — gate any shader/filter-based design
  on the project's Unity version.

## Showing data: MVP / MVVM

- **DO** structure UI as **MVP**: UXML/USS = passive View; a Presenter class
  queries elements (`UQueryExtensions`), subscribes to model changes, and
  updates the view; Models are plain C# / ScriptableObjects with no UI
  references.
- **DO** use Unity 6 **runtime data binding** to remove boilerplate:
  `DataBinding`, `[CreateProperty]` on model properties, binding paths in
  UXML/UI Builder, `ListView` item binding for collections. Bindings auto-sync
  both ways.
- **DON'T** write per-frame `label.text = ...` sync code in `Update()`.
- **DON'T** put game logic in `VisualElement` subclasses, and don't query the
  visual tree from gameplay code — gameplay talks to the model only.

## UITK performance

- **DO** use `ListView`/virtualization for long lists.
- **DON'T** instantiate thousands of `VisualElement`s for scrollable content.
- **DON'T** write `style.*` properties per frame (triggers layout/repaint);
  prefer USS class toggling and transitions.
- **DO** keep hierarchies shallow and selector complexity bounded on huge
  screens (`:hover`-heavy selectors on large lists are costly). On 6.5+, the
  **USS Stats Profiler** (Project Settings → UI Toolkit) surfaces per-panel
  selector cost.
- **DO** rely on the **Advanced Text Generator** (default in 6.5, 10–40% text
  CPU win) and let it own line-breaking/Best Fit; don't hand-roll text layout.

## Input wiring

- **DO** route UI input through the Input System UI module (and the UITK panel
  input configuration in 6.x).
- **DON'T** leave the legacy Standalone Input Module on EventSystems — mixed
  input backends cause dead UI or double events.
