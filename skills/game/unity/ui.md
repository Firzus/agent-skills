# UI: UI Toolkit, design tokens, data binding, MVP, localization

UI Toolkit is the UI system: menus, HUD, data-heavy screens, and world-space.
It is retained-mode, renders textureless through a dynamic atlas, and receives
Unity's UI investment.

## Animated UI

Animate state changes with **USS transitions**, and anything keyframed with
**Animation clips** (6.7) played on a `VisualElement`, without an Animator
component.

- Author clips in the Animation window; one clip can animate visual elements and GameObjects together.
- Apply a clip from USS with `animation-name` or the `animation` shorthand, alongside `animation-duration`, `-delay`, `-direction`, `-iteration-count`, and `-play-state`, or start it from script.
- A duration of 0 plays the clip at its own length. `animation-iteration-count` decides looping; the clip's loop flag is ignored.
- Design animated UI around clips and USS transitions rather than an Animator state machine.

## Panel Renderer

Panel Renderer (6.5) binds a UXML document to a GameObject and is what makes
world-space UI native. `UIDocument` remains valid for screen-space overlays.

- Add via `GameObject → UI Toolkit → Panel Renderer`; configure Panel Settings, Source Asset, Sort Order, and World-Space Dimensions.
- World-space needs `Render Mode → World Space` on the Panel Settings asset, plus Pixels Per Unit (100 by default).
- Size modes: **Dynamic** derives size from explicitly sized content; **Fixed** takes a manual container size and suits content that flexes.
- Interaction requires a Panel Input Configuration — event cameras, interaction layers, maximum interaction distance.
- World-space root panels sort by camera distance first; Sort Order breaks ties among nested and sibling panels.
- 2D sorting layers do not apply to world-space panels in 6.5. Order diegetic UI by camera distance.
- Pin a screen-space element to a 3D target with **Track Screen Space Position** (6.7) rather than projecting its position from script every frame.

## Stacking order

Order overlapping elements with **`z-index`** (7.0), in USS or through
`style.zIndex`, rather than reordering the hierarchy.

- Set it on the overlapping siblings themselves: the popup, tooltip, or overlay that must sit on top, as a child of the parent it shares with what it covers.
- An element with `z-index` forms a stacking context: its descendants never draw above its later siblings, whatever their own `z-index`.
- A descendant's `z-index` set under an ancestor without one draws above that ancestor's later siblings, but hit-testing (`panel.Pick`) does not follow it: the element shows on top and the click reaches the sibling underneath.

## Design tokens

- Declare every visual constant as a USS variable in one tokens file: `--color-primary`, `--space-2`, `--font-size-body`.
- Compose tokens into theme style sheets: import the default theme (`@import url("unity-theme://default")`), override per theme, and swap the TSS at runtime to change themes.
- Theme style sheets rank above Unity's built-in styles regardless of selector specificity (7.0). Import a theme only from another theme style sheet: imported into a regular USS, it loses that priority.
- Reference tokens from element styles, so a value changes in one place.
- Let UI authors own UXML and USS in UI Builder; keep layout out of C#.
- Reach for USS filters (blur, grayscale, sepia, tint, invert, opacity — 6.3, URP) and UI Shader Graph materials for visual effects, over pre-rendered textures or per-frame C# tinting.

## Showing data

Structure UI as **MVP**: UXML and USS are a passive view, a presenter queries
elements and subscribes to model changes, and models are plain C# or
ScriptableObjects holding no UI references.

- Bind through runtime data binding — `DataBinding`, `[CreateProperty]` on model properties, binding paths set in UI Builder, `ListView` item binding for collections. Bindings sync both ways and replace per-frame assignment in `Update()`.
- Set `dataSource` once on the root element; it propagates to every child, and a child overrides it locally where a subtree binds to different data. Screens that reuse one model type declare the data source *type* and paths in UXML, leaving code a single job: assigning the instance when it changes.
- Pick the narrowest binding mode per control: `ToTarget` for display, `TwoWay` only where the UI writes back, `ToTargetOnce` for set-and-forget values. Reference properties with `nameof(...)` so renames refactor the path.
- Implement `IDataSourceViewHashProvider` and `INotifyBindablePropertyChanged` on every bound model — setters guard on change, bump a version, and raise `propertyChanged`. Without them the binding system re-syncs every frame and boxes every value-type property it copies.
- Keep game logic out of `VisualElement` subclasses, and let gameplay talk to the model rather than querying the visual tree.

## Text

Advanced Text Generator is the text generator and cuts text CPU cost. Let it
own line-breaking and fitting, and give it the dynamic font assets it expects.

## Localization

Localize through the **Localization module** (built in since 6.7), with string
and asset tables edited in its table editor, rather than the Localization
package or hand-rolled tables.

- Format pluralized and parameterized strings with the **Smart Strings** module rather than concatenation in code.
- Load localized assets through the module's asset provider that matches the project's loading: Addressables, direct references, or `Resources`.
- Switch fonts with the locale through `LocalizedFontAsset` (7.0).

## Performance

- Virtualize long lists with `ListView` rather than instantiating thousands of elements.
- Update changing text with the non-allocating `TextElement.SetText` overloads (`ReadOnlySpan<char>`, `StringBuilder`, numbers with a format) rather than assigning a new string each frame.
- Toggle USS classes and let transitions animate, rather than writing `style.*` per frame — direct style writes trigger layout and repaint.
- Keep hierarchies shallow and selectors simple on large screens; `:hover`-heavy selectors over long lists are costly. The USS Stats Profiler (Project Settings → UI Toolkit, 6.5) shows per-panel selector cost.
- Route UI input through the Input System UI module, and keep a single input backend active so events fire once.
