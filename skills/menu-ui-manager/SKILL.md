---
name: menu-ui-manager
description: >-
  Architecture blueprint for game menus and screen frameworks: central routers,
  layered screen stacks, declarative contracts, hub navigation, multi-input focus,
  pause, transitions, settings, rebinding, modal APIs, UI architecture,
  performance, accessibility, and menu feel. Use when designing menus, pause
  screens, settings, UI navigation, screen stacks, or when gamepad focus dies,
  back buttons misbehave, menus leak input, or UI hurts frame rate.
---

# Menu / UI Manager

Build the menu framework of a game: screens, navigation, focus, pause, settings,
modals — plus the UI architecture, accessibility, and feel that surround them.
References: Genshin (Paimon hub, shortcut wheel), Lyra/CommonUI (the layer-stack
reference), Persona 5 (motion identity), Dead Space (diegetic UI), TLOU2/GoW
Ragnarök (accessibility). Excluded (separate skills): the HUD layer (`hud-system`),
screen business logic (inventory systems, quest data).

## The architecture rule

**One central router owns layered screen stacks; screens declare contracts and
never navigate or touch global state themselves.**

```
Router: Push / Pop / Replace / PopTo / Clear   ← the ONLY navigation API
Layers (priority order): Game(HUD) < GameMenu < Menu < Modal
Input rule: the highest layer with an active screen gets input; else gameplay.
Back rule:  B/Esc pops the top of the highest active stack. One implementation.

ScreenContract { inputConfig, pausesGame, hidesHUD, backdrop, initialFocus,
                 cachePolicy }   // applied by the router on push, reverted on pop
```

Screen lifecycle: **Create → Activate → Deactivate → Destroy** — a covered screen
is deactivated, not destroyed; its state (scroll, focus) survives until popped back.

## Reference map

| File | Covers |
| --- | --- |
| [router-focus.md](./router-focus.md) | The router (push/pop, layers, back, the contract diff), multi-input focus management (the always-focused invariant, focus memory, mouse+pad hybrid), refcounted pause and audio ducking, transitions and motion identity, hub-and-spoke + shortcuts |
| [settings-screens.md](./settings-screens.md) | Settings-as-data (apply/revert, the display-confirm timeout, rebinding, the persistence split), the screens (pause, inventory navigation, journal), the promise-style modal API, loading/attract, localization and cert basics |
| [architecture-patterns.md](./architecture-patterns.md) | UI architecture patterns (MVC/MVP/MVVM/MVU), immediate vs retained mode, data binding and reactivity, UI performance (the canvas-rebuild rule, invalidation, SDF text, virtualization), responsive/adaptive scaling, tooling |
| [accessibility.md](./accessibility.md) | The standards and legal landscape (GAG/XAG/CVAA/EAA/AGI), screen readers and the parallel accessibility node tree, visual/motor/cognitive/hearing accessibility, building it in from day one |
| [juice-diegetic.md](./juice-diegetic.md) | UI juice and micro-interactions, diegetic vs non-diegetic UI (the 4-quadrant model), spatial/3D menus, menu art direction and identity, loading screens and transitions, the boot-to-gameplay flow |
| [pitfalls.md](./pitfalls.md) | 16 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

## Hub-and-spoke + shortcuts (the Genshin model)

One hub screen (Paimon menu) radiating to feature screens — pad/touch friendly,
scales by adding tiles, back is always predictable (pop within the spoke → hub →
close). Layer accelerators on top: a **shortcut wheel** (hold trigger → radial, ≤8
segments) and PC hotkeys. All three paths call the same `Push(Screen)` — the router
doesn't care how you arrived. Decide once whether back from a shortcut-opened screen
returns to the hub or to game, and keep it consistent.

## Build order (4 shippable tiers)

```
Tier 1 — The stack works
- [ ] Router + layer stacks + screen contracts; back = pop, one consumer
- [ ] Pause service (REFCOUNTED handles, never a boolean) + audio duck
- [ ] Pause menu + a settings stub; transitions with router-level input lockout
Tier 2 — Multi-input
- [ ] Focus service: per-screen default focus + memory, re-resolve on device switch
- [ ] Input context switching bound to push/pop; modal API (promise-style, focus trap)
- [ ] Glyph service reacting to device changes
Tier 3 — The screens
- [ ] Hub + spokes; shortcut wheel + hotkeys hitting the same router API
- [ ] Settings registry (data-driven, apply/revert, display confirm-with-timeout)
- [ ] Rebind flow; grid/list navigation with focus memory
- [ ] Architecture pattern chosen (MVVM/MVP); UI perf budgeted
Tier 4 — Ship quality
- [ ] Accessibility from day one: node tree, label everything, presets, boot screen
- [ ] Controller disconnect → pause + modal (cert); safe-area root; localization
- [ ] Cache policies measured; skeleton states; motion identity (the P5 lesson)
```

## Key numbers (starting points — tune by UX test)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Screen enter / exit | 200–300 ms / ~25% faster | NN/g, Material |
| Held-nav repeat | ~250–500 ms initial, then 50–150 ms/item | OS conventions |
| Display confirm timeout | 15 s auto-revert | Windows OS standard |
| Menu text minimum | 26 px @1080p console, scalable 200% | XAG 101 |
| Pause audio duck | −3 to −6 dB + lowpass, 0.2–0.5 s fade | tool defaults |
| Contrast | 4.5:1 text / 3:1 large; High-Contrast ≥7:1 | WCAG/XAG |
| Three-flash rule | ≤3 general or red flashes/s; Harding/PEAT test | WCAG 2.3.1 |
| UI juice timing | hover/press ~100–200 ms; transitions 200–400 ms | Gamine/GDC 2012 |
| Canvas perf | split static vs dynamic canvases (a dirty child rebuilds the whole canvas) | Unity Learn |

Full sourced tables (with the "undocumented — don't invent" list and legal/cert
flags) in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 (UITK) | UE5 (CommonUI/Lyra) |
| --- | --- | --- |
| Router / stacks | plain C# service + UIDocument per layer | `UPrimaryGameLayout` + `CommonActivatableWidgetStack` per `UI.Layer.*` |
| Screen contract | C# interface (OnPush/OnPop) | `UCommonActivatableWidget` (`GetDesiredFocusTarget`) |
| Pattern | MVP (UGUI) / MVVM (UITK runtime binding) | CommonUI + MVVM Viewmodel plugin |
| Input switching | action maps per context, router-owned | `GetDesiredInputConfig` (`SetInputMode` forbidden with CommonUI) |
| Settings registry | custom registry | **Lyra GameSettings plugin** (the reference) |
| Accessibility | Unity Accessibility module (Narrator/VoiceOver bridge) | `SlateAccessibility`; AccessKit |
| Perf | split canvases / UITK retained tree | Invalidation Box / Volatile / Retainer |

Full detail in [architecture-patterns.md](./architecture-patterns.md).

## Related skills

- `hud-system` — the Game layer below these stacks; shares the glyph service and
  safe-area root.
- `adaptive-audio` — the pause mix snapshot and audio-duck contract.
- `scene-flow-manager` — boot → title → game context switches; this skill owns
  in-context screens.
- `dialogue-system` — subtitle config UI shares the accessibility standards.
- `save-persistence` — the settings split (machine config local, preferences synced).
- `unity6-aaa-best-practices` / `ue5-aaa-best-practices` — engine UI doctrines.
- `game-architecture-patterns` — State (screen lifecycle), Command (navigation),
  Service Locator trade-offs.
