# Architecture patterns — MVVM, binding, performance

The UI architecture engineering for working programmers. Uncertainty flagged `[?]`.

## UI architecture patterns

- **MVC**: Controller mediates input, mutates Model, View reads Model. Rarely used in
  pure form for modern game UI (the "View"/widget tree usually also handles input).
- **MVP (Model-View-Presenter)**: the Presenter holds presentation logic; the View is
  a passive interface (`IView`) the Presenter drives explicitly. Strong fit when there
  is **no data-binding engine** — the historically recommended Unity **UGUI** pattern
  (Unity's e-book). Explicit, testable, no magic — at the cost of glue code.
- **MVVM (Model-View-ViewModel)**: the ViewModel exposes model data formatted for the
  view and notifies on change; the View **binds** declaratively. Requires a binding
  system + change notification. The **officially recommended** pattern for Unity UI
  Toolkit runtime binding (Unity 6) and UE5 UMG via the **Viewmodel plugin** (5.3+).
  The view has zero logic; designers bind in the editor. Binding indirection can hide
  cost/control flow.
- **MVU / Elm (Model-View-Update)**: unidirectional — an immutable `Model`; `View(model)`
  is a pure function; `Update(model, msg) → model'` is the only place state mutates.
  Extreme testability (pure `Update`), single source of truth, replayable message
  history — at the cost of re-render/diff and message boilerplate.
- **The "logic in the screen vs separated" debate**: code-behind is fast to write but
  couples presentation to behavior (the UGUI "god MonoBehaviour"). Consensus: **separate
  for shipping UI** (MVP/MVVM/MVU); **inline for tools/debug** (no state to sync — IMGUI).

| Pattern | State ownership | Needs binding engine? | Testability | Best fit |
| --- | --- | --- | --- | --- |
| MVP | Presenter drives passive View | no (manual) | high | UGUI |
| MVVM | View binds ↔ ViewModel notifies | **yes** | high | UI Toolkit (U6), UE5 UMG Viewmodel |
| MVU/Elm | single immutable Model, unidirectional | no (diff) | very high | functional stacks, complex flows |
| IMGUI | app data only | no (no sync) | low | debug/tools |

## Immediate-mode vs retained-mode

- **Immediate mode (Dear ImGui, Unity `OnGUI`)**: the app re-issues the entire UI every
  frame; the app data is the single source of truth (widgets read/write it directly) →
  **no data binding, no sync bugs**. ("Immediate" refers to the *API* — internally it
  retains optimized vertex buffers.) Best for **debug tools, in-engine editors,
  profilers, content tools, rapid prototyping**.
- **Retained mode (UGUI, UI Toolkit, Slate/UMG)**: a persistent tree of widget objects
  the framework owns; app state must be **synchronized** into widgets (binding/signals/
  callbacks). Best for **shipping player-facing UI** (polish, theming, animation,
  localization, accessibility).
- **The hybrid is common in shipped games**: ImGui for debug + a retained framework for
  HUD/menus + sometimes a web view (RmlUi HTML-in-game, Coherent Gameface, NoesisGUI
  XAML) for store/social.

## Data binding & reactivity

- **One-way** (source → view) is the cheapest, correct for readouts; **two-way** (UI
  writes back) needs more wiring and risks feedback loops.
- **Observable properties / change notification** is the connective tissue:
  - **Unity UI Toolkit (U6)**: implement `INotifyBindablePropertyChanged` (+
    `IDataSourceViewHashProvider`) so the binding stops **polling every frame** and
    updates only on actual change; bind in UI Builder or via `DataBinding`/`Bind()`. Use
    C# *properties* (not fields) for bindables; use the data source as a buffer.
  - **UE5 UMG ViewModels**: inherit `UMVVMViewModelBase`; mark `UPROPERTY(..., FieldNotify)`
    and use `UE_MVVM_SET_PROPERTY_VALUE` in setters to broadcast. `FieldNotify` bindings
    are **event-driven, not per-frame polling** (unlike legacy UMG "property bindings"
    that tick every frame — a perf trap).
- **Virtualization for long lists (recycling)**: never one widget per row. Unity UI
  Toolkit `ListView` (`makeItem`/`bindItem`, FixedHeight/DynamicHeight); UE
  `UListView`/`UTileView`/`UTreeView` with entry-widget recycling. UGUI has no built-in
  recycler.
- **Batch binding updates**: coalesce changes so the UI updates once, not per-mutation
  (the Update Trigger + view-hash provider in UITK; batch UI writes into one function in
  UGUI).

## UI performance

- **The UGUI "split your canvases" rule**: a Canvas batches its child geometry; **any**
  dirtied element marks the **whole Canvas dirty**, forcing a full rebuild (layout →
  vertex buffers → draw calls). Fix: split into multiple Canvases (static vs
  frequently-changing). But don't over-split — batches are not combined *across*
  Canvases. Co-locate elements that change *together*.
- **Dirty-flag granularity**: `SetVerticesDirty`/`SetLayoutDirty`/`SetMaterialDirty` are
  cheaper than `SetAllDirty`. Layout components (`LayoutGroup`, `ContentSizeFitter`)
  cause cascading rebuilds — profile `Canvas.BuildBatch` and `Layout.Rebuild`.
- **UI Toolkit's retained tree** scales more predictably than UGUI (whose degradation is
  non-linear).
- **UE Slate/UMG invalidation**: the **Invalidation Box** caches child geometry (cached
  children aren't ticked/painted while unchanged) — but a **property binding inside**
  ticks every frame and negates it. **Volatile** widgets exclude a frequently-changing
  child. **Global Invalidation** (`Slate.EnableGlobalInvalidation`) is off by default
  `[?, version-specific regressions]`. The **Retainer Box** renders to a render target,
  allowing frequency control (cap UI redraw at 30 Hz). General rule: **prefer
  event-driven updates over property bindings**.
- **Atlasing / overdraw / SDF text**: atlas UI sprites to batch; UI overdraw (overlapping
  transparent quads) is a top GPU cost (use the Overdraw draw mode). **SDF text**
  (TextMeshPro) is crisp at any scale but `TMP_Text.Rebuild()` spikes when text changes
  every frame (isolate dynamic text on its own sub-canvas; avoid Best Fit / Auto-Size).
  UI is a frequent **hidden perf sink**, especially fill-rate-bound on mobile.

## Responsive / adaptive UI

- **Author relationships, not pixels**: layout primitives (anchors, margins, stacks,
  constraints) + content rules + scalable assets (9-slice, SDF, vector).
- **Anchors + scale**: UGUI `RectTransform` anchors + **Canvas Scaler → Scale With Screen
  Size** (reference resolution + Screen Match Mode); UMG anchors with **DPI Scale Rule =
  ShortestSide** (1080 baseline curve). Single-point anchors + large pixel offsets break
  across resolutions — use **stretched anchors** for scaling elements.
- **Aspect 16:9 → 21:9 → mobile**: DPI handles *resolution*, but *aspect* needs layout
  strategy (cap horizontal spread with `SizeBox`/max-width, re-anchor critical elements
  to a 16:9 safe region). **Safe area**: wrap the root in a SafeZone (UE `SafeZone`
  widget / Unity `Screen.safeArea`).
- **Flexbox** (UI Toolkit USS `flex-direction`/`flex-grow`) is far more adaptive than
  UGUI's manual anchoring. **"One UI for TV + handheld + phone"** (Steam Deck, Switch) =
  shortest-side DPI + SafeZone + min hit-targets (≥44 px) + container max-widths; test on
  real density classes and fractional scales (1.25×).

## Tooling

- **Authoring**: UMG Designer (UE), UI Builder (Unity UITK, producing UXML + USS);
  Figma→UI exporters exist `[?, quality varies]`.
- **The designer-programmer handoff**: MVVM/MVP make it clean — designers own the widget
  tree/markup and bind to named ViewModel fields; UXML/USS are text-mergeable (vs opaque
  prefab YAML).
- **Hot-reload**: UXML/USS hot reload in play mode. **Debugging**: the UI Toolkit Debugger
  (Pick Element, live USS); the Slate Widget Reflector (`Ctrl+Shift+W`) + `stat slate`;
  the UGUI Profiler (`Canvas.BuildBatch`, `Layout.Rebuild`) + Overdraw mode.

## Unity ↔ UE5 mapping

| Concern | Unity (UGUI / UITK) | UE5 |
| --- | --- | --- |
| Recommended pattern | MVP / MVVM | CommonUI + MVVM Viewmodel |
| Markup/style | prefabs / **UXML + USS** | UMG tree / Slate brushes |
| Layout engine | anchors + Layout Groups / **flexbox** | anchors + Box/Grid panels |
| Change notification | C# events / `INotifyBindablePropertyChanged` | `FieldNotify` |
| List virtualization | custom recycler / `ListView` | `UListView`/`UTileView` |
| Perf primitive | split canvases / retained tree | Invalidation Box / Volatile / Retainer |
| Resolution scaling | Canvas Scaler | DPI `ShortestSide` + curve |
| Debugger | Profiler / **UI Toolkit Debugger** | **Widget Reflector** + `stat slate` |

## Flagged gaps — do NOT invent

The exact Unity 6.x sub-version where runtime binding matured (reported inconsistently)
· UE Global Invalidation default + 5.5/5.6 regressions are version-specific · Figma-to-
UITK output quality is tool-dependent.

## Sources

Unity Manual (Data binding, Canvas Scaler, Optimizing Unity UI) · Unity e-books (design
patterns + SOLID; UI Toolkit for advanced developers) · TheGamedev.Guru (canvas
rebuilds) · Epic (UMG Viewmodel, Invalidation in Slate and UMG, CommonUI) ·
strayspark.studio (CommonUI + MVVM) · Dear ImGui docs · mikke89/RmlUi · bugnet.io (UMG
anchors/DPI/SafeZone).
