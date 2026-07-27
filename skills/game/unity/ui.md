# UI — UI Toolkit, design tokens, data binding, MVP

UI Toolkit is the default for all new UI: menus, HUD, data-heavy screens, and
world-space. It is retained-mode, renders textureless through a dynamic atlas,
and receives Unity's UI investment.

UGUI is supported, not deprecated — only the standalone `com.unity.textmeshpro`
package is (TextMeshPro merged into UGUI). From 6.5 a project must declare
`com.unity.ugui` explicitly rather than inheriting it. Keep UGUI on screens that
already ship it, and on UI driven by Animator or Timeline keyframes, which is
its one remaining capability gap. Mixing both per-view is supported; migrating
working UGUI screens mid-project buys nothing.

## Panel Renderer

Panel Renderer (6.5) binds a UXML document to a GameObject and is what makes
world-space UI native. `UIDocument` remains valid for screen-space overlays.

- Add via `GameObject → UI Toolkit → Panel Renderer`; configure Panel Settings, Source Asset, Sort Order, and World-Space Dimensions.
- World-space needs `Render Mode → World Space` on the Panel Settings asset, plus Pixels Per Unit (100 by default).
- Size modes: **Dynamic** derives size from explicitly sized content; **Fixed** takes a manual container size and suits content that flexes.
- Interaction requires a Panel Input Configuration — event cameras, interaction layers, maximum interaction distance.
- World-space root panels sort by camera distance first; Sort Order breaks ties among nested and sibling panels.
- 2D sorting layers do not apply to world-space panels in 6.5. Order diegetic UI by camera distance.

## Design tokens

- Declare every visual constant as a USS variable in one tokens file: `--color-primary`, `--space-2`, `--font-size-body`.
- Compose tokens into theme style sheets: import the default theme (`@import url("unity-theme://default")`), override per theme, and swap the TSS at runtime to change themes.
- Reference tokens from element styles, so a value changes in one place.
- Let UI authors own UXML and USS in UI Builder; keep layout out of C#.
- Reach for USS filters (blur, grayscale, sepia, tint, invert, opacity — 6.3, URP) and UI Shader Graph materials for visual effects, over pre-rendered textures or per-frame C# tinting.

## Showing data

Structure UI as **MVP**: UXML and USS are a passive view, a presenter queries
elements and subscribes to model changes, and models are plain C# or
ScriptableObjects holding no UI references.

- Bind through runtime data binding — `DataBinding`, `[CreateProperty]` on model properties, binding paths set in UI Builder, `ListView` item binding for collections. Bindings sync both ways and replace per-frame assignment in `Update()`.
- Keep game logic out of `VisualElement` subclasses, and let gameplay talk to the model rather than querying the visual tree.

## Text

Advanced Text Generator is the default from 6.5 (manually enabled in 6.4) and
cuts text CPU cost. Let it own line-breaking and fitting. Migrate static font
assets to dynamic, which is what it expects. Where a screen needs the old
behaviour, opt that screen out with `-unity-text-generator: standard`.

## Performance

- Virtualize long lists with `ListView` rather than instantiating thousands of elements.
- Toggle USS classes and let transitions animate, rather than writing `style.*` per frame — direct style writes trigger layout and repaint.
- Keep hierarchies shallow and selectors simple on large screens; `:hover`-heavy selectors over long lists are costly. The USS Stats Profiler (Project Settings → UI Toolkit, 6.5) shows per-panel selector cost.
- Route UI input through the Input System UI module, and keep a single input backend active so events fire once.
