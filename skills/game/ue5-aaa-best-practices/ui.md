# UI — UMG/Slate performance, CommonUI, MVVM

## The cardinal rule: no property bindings

- **DO** drive widget updates via events/delegates: explicit
  `SetText`/`SetVisibility` in handlers, or `INotifyFieldValueChanged`
  (FieldNotify, 5.5+).
- **DON'T** use the UMG "Bind" dropdown for widget properties — bound
  properties poll **every frame per property**. Senior teams ban it in style
  guides; it's the #1 UMG performance hog.

## CommonUI for menu systems

- **DO** build AAA menu flows on **CommonUI**: `UCommonActivatableWidget`
  stacks, `GetDesiredFocusTarget`, declarative input configs. CommonUI routes
  input only to the topmost active widget and handles gamepad/platform input
  switching — it's what Lyra and Fortnite ship on.
- **DON'T** hand-roll focus management, input modes, and back-stack logic per
  widget.
- **DON'T** mix raw `SetInputMode...` calls with CommonUI's input routing —
  two systems fighting over input mode causes the classic "controller stops
  working in menus" bug class.

## MVVM with the Viewmodel plugin

- **DO** use **MVVM (UMG Viewmodel plugin)** with FieldNotify properties for
  stateful screens (settings, inventory, HUD state): ViewModels keep widgets
  as stateless views and enable change-only updates. This is Epic's
  recommended pattern and is production-ready.
- **DON'T** stuff game-state queries and logic into widget Blueprints —
  widgets display, ViewModels mediate, gameplay code owns the data.
- **DO** write complex UI logic in C++ base classes and design in Blueprint
  subclasses; Blueprint-only UI systems are undiffable, unmergeable, and hard
  to debug at scale.

## Slate performance discipline

- **DO** set `EWidgetTickFrequency::Auto` or `Never`; require justification
  for `::Always`.
- **DO** wrap static HUD sections in an `InvalidationBox` (with Global
  Invalidation) and flag truly per-frame elements `Is Volatile` — Slate
  prepass/paint dominates UI cost, and invalidation caching makes unchanged
  widgets nearly free.
- **DO** default non-interactive widgets to `SelfHitTestInvisible`; mark
  `Visible` only where input is needed (hit-testable widgets cost
  input-routing cycles every frame).
- **DO** pool list/grid entries (`ListView`,
  `ICommonPoolableWidgetInterface`) — widget construction is expensive.
- **DON'T** Create/Destroy widgets on the fly in scrolling lists.

## UI assets

- **DO** share one master UI material with parameter instances, and pack
  icons into texture atlases/sprite sheets with UI texture-group settings.
- **DON'T** use unique materials per widget or loose full-size textures —
  per-widget custom materials break Slate batching and multiply draw calls.
