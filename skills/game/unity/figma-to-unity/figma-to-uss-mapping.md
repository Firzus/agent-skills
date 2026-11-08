# Figma → USS mapping reference

Property-by-property translation from Figma design data (or the Figma MCP React + Tailwind output) to Unity UI Toolkit USS. UI Toolkit layout is **Yoga flexbox**: every `VisualElement` is a flex container with `flex-direction: column` by default (the web defaults to `row` — invert your assumptions).

## Layout (Auto Layout → flexbox)

| Figma | USS |
| --- | --- |
| Auto Layout: vertical | `flex-direction: column;` (default) |
| Auto Layout: horizontal | `flex-direction: row;` |
| Auto Layout: wrap | `flex-wrap: wrap;` |
| Alignment (primary axis) | `justify-content: flex-start / center / flex-end / space-between / space-around;` |
| Alignment (counter axis) | `align-items: flex-start / center / flex-end / stretch;` |
| Item spacing (gap) | Margins on children (e.g. `margin-right` on all but last), or a `.row > *` utility class. USS has no `gap` property in most Unity versions — check before using it. |
| Padding | `padding: <top> <right> <bottom> <left>;` |
| Sizing: Fixed | explicit `width` / `height` in `px` |
| Sizing: Hug contents | `width: auto;` / `height: auto;` (default behavior) |
| Sizing: Fill container | `flex-grow: 1;` (+ `flex-basis: 0;` to share evenly between siblings) |
| Min/max constraints | `min-width`, `max-width`, `min-height`, `max-height` |

### Constraints (non-Auto-Layout frames)

Figma constraints on absolutely positioned children map to `position: absolute` plus offsets:

| Figma constraint | USS |
| --- | --- |
| Left / Top | `position: absolute; left: Xpx; top: Ypx;` |
| Right / Bottom | `position: absolute; right: Xpx; bottom: Ypx;` |
| Left & Right (stretch) | `position: absolute; left: Xpx; right: Ypx;` |
| Center | `position: absolute; left: 50%;` + `translate: -50% 0;` |
| Scale | percentage-based `width`/`height` on the child |

Percentages in USS are relative to the **parent's size**. `translate`, `rotate`, `scale`, and `transform-origin` exist as standalone USS properties.

## Fills, strokes, effects

| Figma | USS |
| --- | --- |
| Solid fill (shape) | `background-color: #RRGGBB;` or `rgba(...)` — prefer `var(--token)` |
| Solid fill (text) | `color: ...;` |
| Image fill | `background-image: url("path/to/sprite.png");` + `-unity-background-scale-mode: scale-and-crop / scale-to-fit / stretch-to-fill;` |
| Linear/radial gradient | No gradient syntax in USS. Options: export a small gradient sprite, tint a white sprite via `-unity-background-image-tint-color`, or draw with a custom `VisualElement` using `generateVisualContent` (mesh API). |
| Stroke | `border-width: Xpx; border-color: ...;` (per-side variants exist: `border-left-width`, ...). Borders are always **inside** the box in UI Toolkit; Figma's center/outside strokes need size compensation. |
| Corner radius | `border-radius: Xpx;` (per-corner: `border-top-left-radius`, ...) |
| Drop shadow / inner shadow | No `box-shadow` in USS. Options: bake the shadow into a 9-sliced sprite, add a dedicated shadow element behind, or use `text-shadow` (text only, supported). |
| Layer opacity | `opacity: 0.0–1.0;` |
| Blur / background blur | Not supported. Bake into an asset or skip; note the deviation. |
| Blend modes | Not supported. Bake into the asset. |

## Typography

| Figma | USS |
| --- | --- |
| Font family + weight | `-unity-font-definition: url("path/to/FontAsset.asset");` — each weight (Regular, Bold...) is usually a separate FontDefinition; there is no `font-weight`. Use `-unity-font-style: bold / italic / bold-and-italic;` only for synthetic styling. |
| Font size | `font-size: Xpx;` |
| Line height | Limited support; UI Toolkit text uses font metrics. For paragraph text, test and adjust with `padding`/`margin` if needed. |
| Letter spacing | `letter-spacing: Xpx;` |
| Horizontal/vertical alignment | `-unity-text-align: upper-left / middle-center / lower-right / ...;` (one property covers both axes) |
| Text color | `color: ...;` |
| Text case / decoration | No `text-transform`. Write the text as designed in UXML, or transform it in C#. |
| Truncation / wrapping | `text-overflow: ellipsis;` + `overflow: hidden;` + `white-space: nowrap;` |

## USS vs web CSS — key differences

- No `gap` (in most versions), no `grid`, no `float`, no `box-shadow`, no gradients, no `filter`, no `calc()`.
- No `z-index`: paint order = child order in the hierarchy. Reorder children or use `BringToFront()`/`SendToBack()` in C#.
- Default `flex-direction` is `column`, default `align-items` is `stretch`, and `position: relative` is the default positioning.
- Selectors: classes, names (`#Name`), type selectors (`Button`), descendant/child combinators, and a limited pseudo-class set: `:hover`, `:active`, `:focus`, `:disabled`, `:enabled`, `:checked`, `:root`. No `:nth-child`, no `::before`/`::after`.
- USS variables work like CSS custom properties: define `--token: value;` (typically on `:root` or a theme class), consume with `var(--token)`.
- `transition` is supported (`transition: width 0.2s ease-out;`) — use it for bar fills, hover states, fades instead of per-frame C# lerps when the curve is simple.
- Unity-specific properties are prefixed `-unity-*` (`-unity-font-definition`, `-unity-background-scale-mode`, `-unity-slice-left/-top/-right/-bottom`, `-unity-background-image-tint-color`, `-unity-text-align`, `-unity-text-outline-*`).

## Common UI patterns

### Stat bar (health, stamina, mana)

Structure: a fixed-size track with an absolutely positioned fill whose `width` is a percentage.

```xml
<ui:VisualElement class="stat-bar stat-bar--health">
    <ui:VisualElement class="stat-bar__delayed-fill" />
    <ui:VisualElement name="HealthFill" class="stat-bar__fill" />
</ui:VisualElement>
```

```css
.stat-bar {
    height: 12px;
    background-color: var(--bar-track);
    border-radius: 6px;
    overflow: hidden;
}
.stat-bar__fill {
    position: absolute;
    top: 0; bottom: 0; left: 0;
    background-color: var(--bar-fill-health);
    transition: width 0.15s ease-out;
}
.stat-bar__delayed-fill {
    position: absolute;
    top: 0; bottom: 0; left: 0;
    background-color: var(--bar-fill-delayed);
    transition: width 0.6s ease-out;
}
```

C# sets `fill.style.width = Length.Percent(current / max * 100f);`. The delayed fill (damage ghost) uses the same value with a slower transition. For decorated bars (borders, caps, glow), layer a 9-sliced frame sprite on top of the fill.

### Button with states

One USS class per variant; style states with pseudo-classes:

```css
.btn-primary { background-color: var(--accent); transition: background-color 0.1s; }
.btn-primary:hover { background-color: var(--accent-hover); }
.btn-primary:active { background-color: var(--accent-pressed); }
.btn-primary:disabled { opacity: 0.4; }
```

Map Figma component variants (Default/Hover/Pressed/Disabled) to these pseudo-classes rather than exporting one asset per state, unless the art actually changes (then swap `background-image` per state).

### 9-slice panel

For frames/panels with ornate borders that stretch: export the sprite once, set border values in the Sprite Editor, then:

```css
.panel {
    background-image: url("project://database/Assets/Art/UI/Common/panel-frame.png");
    -unity-slice-left: 24; -unity-slice-top: 24;
    -unity-slice-right: 24; -unity-slice-bottom: 24;
}
```

Alternatively set the slice values on the sprite import settings and let UI Toolkit pick them up.

### Icons

- **SVG** (Unity 6.2+ / com.unity.vectorgraphics): best for flat icons that scale across resolutions.
- **PNG at 2x** with Texture Type Sprite: safe default; set the PanelSettings reference resolution accordingly.
- Tint monochrome icons with `-unity-background-image-tint-color: var(--icon-color);` instead of exporting color variants.
