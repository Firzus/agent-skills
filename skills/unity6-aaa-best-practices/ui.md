# UI — UI Toolkit, design tokens, MVP/MVVM

Default for new UI in Unity 6: **UI Toolkit (UITK)** for screen-space AND
world-space, structured as a design system, with data shown through MVP/MVVM
and runtime bindings. This assumes a current Unity 6 version (6.2+); stay on
the latest Unity 6 release unless the project is locked.

## Choosing the system

- **DO** default to UITK for all new UI: menus, HUDs, data-heavy and
  multi-resolution interfaces, and world-space UI (Panel Settings →
  world-space render mode, since 6.2). UITK is retained-mode, renders
  textureless with a dynamic atlas, and gets all new Unity UI investment
  (world-space, SVG, custom materials/shaders all landed in the 6.x cycle).
- **DO** keep UGUI only where its remaining gaps bite: UI that needs
  Animator/Timeline keyframed animation, or a team shipping imminently on
  existing UGUI screens.
- **DON'T** migrate working UGUI screens mid-project. Mixing both systems
  per-view is supported and fine.
- **DON'T** apply pre-6.2 limitations to current versions: "UITK can't do
  world space / custom shaders" is only true on 6.0/6.1. Only if the project
  is locked on 6.0/6.1 do world-space UITK workarounds (render texture) or
  UGUI world canvases apply.

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
  screens (`:hover`-heavy selectors on large lists are costly).

## Input wiring

- **DO** route UI input through the Input System UI module (and the UITK panel
  input configuration in 6.x).
- **DON'T** leave the legacy Standalone Input Module on EventSystems — mixed
  input backends cause dead UI or double events.
