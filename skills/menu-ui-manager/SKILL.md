---
name: menu-ui-manager
description: >-
  Architecture blueprint for game menu and screen management frameworks: a
  central router owning layered screen stacks with declarative screen
  contracts (input config, pause, backdrop), hub-and-spoke navigation with
  shortcut wheels and hotkeys, multi-input focus management (gamepad focus
  memory, mouse/pad hybrid, focus trapping), refcounted pause with audio
  ducking, screen transitions with input lockout, data-driven settings
  screens (apply/revert, confirm-with-timeout, rebinding), a promise-style
  modal API, and localization/cert basics. References: Genshin Impact
  (Paimon hub + shortcut wheel), Lyra/CommonUI (the layer-stack reference),
  Persona 5 (motion identity), God of War (settings). Use when designing or
  building menus, pause screens, settings, UI navigation, screen stacks, or
  when gamepad focus dies, back buttons misbehave, or menus leak input to
  gameplay.
---

# Menu / UI Manager

Build the menu framework of a game: screens, navigation, focus, pause,
settings, modals. References: Genshin Impact (Paimon hub, controller
shortcut wheel, 3 input layouts), Lyra/CommonUI (the layer-stack reference
implementation), Persona 5 (motion identity), God of War (modern settings).
Excluded (separate skills): the HUD layer (`hud-system`), screen business
logic (inventory systems, quest data).

## The architecture rule

**One central router owns layered screen stacks; screens declare contracts
and never navigate or touch global state themselves.**

```
Router: Push / Pop / Replace / PopTo / Clear   ← the ONLY navigation API
Layers (priority order): Game(HUD) < GameMenu < Menu < Modal
Input rule: the highest layer with an active screen gets input;
            otherwise input flows to gameplay.
Back rule:  B/Esc pops the top of the highest active stack. One
            implementation, every screen gets it free.
```

**Screen contract** (declarative data, applied by the router on push,
reverted on pop):

```
ScreenContract {
  inputConfig:   Game | Menu | GameAndMenu
  pausesGame:    bool          // acquires a pause handle (refcounted)
  hidesHUD:      bool
  backdrop:      None | Dim | Blur | Showcase3D
  initialFocus:  element ref   // re-resolved on activation + device switch
  cachePolicy:   KeepAlive | DestroyOnPop
}
```

Screen lifecycle: **Create → Activate → Deactivate → Destroy** — a covered
screen is deactivated, not destroyed; its state (scroll, focus) survives
until popped back.

## Hub-and-spoke + shortcuts (the Genshin model)

One hub screen (Paimon menu) radiating to feature screens — pad/touch
friendly, scales by adding tiles, back is always predictable (pop within
the spoke → hub → close). Layer accelerators on top: a **shortcut wheel**
(hold trigger → radial, ≤8 segments, direction = selection) and PC hotkeys.
All three paths call the same `Push(Screen)` — the router doesn't care how
you arrived. Decide once whether back from a shortcut-opened screen returns
to the never-visited hub or straight to game, and keep it consistent.

## Build order (4 shippable tiers)

```
Tier 1 — The stack works
- [ ] Router + layer stacks + screen contracts; back = pop, one consumer
- [ ] Pause service (REFCOUNTED handles, never a boolean) + audio duck
      (lowpass + ~-6 dB on gameplay bus; UI on unscaled-time buses)
- [ ] Pause menu + a settings stub; transitions (enter 200-300 ms, exit
      faster) with router-level input lockout during transitions
Tier 2 — Multi-input
- [ ] Focus service: per-screen default focus + focus memory, re-resolve
      on activation AND device switch; something focusable is ALWAYS
      focused under pad/keyboard
- [ ] Input context switching bound to push/pop (action maps / input
      configs), one-frame grace on close (no bleed-through)
- [ ] Modal API (promise-style, focus trap, Back = Cancel, resolves
      exactly once — default Cancelled on teardown)
- [ ] Glyph service reacting to device changes (all visible glyphs swap)
Tier 3 — The screens
- [ ] Hub + spokes; shortcut wheel + hotkeys hitting the same router API
- [ ] Settings registry: settings as data {type, range, default, apply
      policy, platform visibility}; pending vs live values; apply/revert;
      display changes = confirm-with-timeout (15 s auto-revert)
- [ ] Rebind flow: listening overlay (5 s timeout), conflict check,
      UI-reserved keys non-rebindable
- [ ] Grid/list navigation: auto directional nav + explicit edges, focus
      memory on index, detail panel follows focus
Tier 4 — Ship quality
- [ ] Controller disconnect → pause + modal on the top layer (cert)
- [ ] Safe-area root, text minimums (26 px @1080p console), localization
      pass (+30-40% expansion, CJK font fallback chain)
- [ ] Cache policies per screen measured; skeleton states for async data
      (show only if >300 ms pending; then hold ≥300-500 ms)
- [ ] Motion identity (the P5 lesson): typed enter/exit hooks per screen,
      animated selection — style over a strict information hierarchy
```

## Numbers (starting points — tune by UX test)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Screen enter / exit | 200–300 ms / ~25% faster | NN/g, Material |
| Input lockout | the transition duration (~150–300 ms), buffer don't drop | CommonUI softlock reports + convention |
| Held-nav repeat | ~250–500 ms initial delay, then 50–150 ms/item | OS conventions |
| Radial wheel | ≤8 segments, direction-select, center dead zone | radial menu research |
| Display confirm timeout | 15 s auto-revert | Windows OS standard, mirrored by games |
| Rebind listening window | ~5 s timeout, Esc/B cancels | Unity default convention |
| Menu text minimum | 26 px @1080p console, scalable 200% | XAG 101 |
| Interactive size (TV) | ≥32 epx; touch 44–48 px | Microsoft 10-foot, HIG/Material |
| Pause audio duck | −3 to −6 dB + lowpass ~300 Hz–2 kHz, 0.2–0.5 s fade | tool defaults + tutorials |
| Skeleton threshold | show after 300–500 ms pending; hold ≥300 ms once shown | UX research |
| Tab bar | 3–5 tabs before overflow; shoulder-button cycling on pad | HIG + console convention |

Full sourced tables (with the explicit "undocumented — don't invent" list:
exact lockout durations, scroll margins, items-per-page caps, attract-mode
timeouts, NDA'd cert timings) in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 (UITK) | UE5 (CommonUI/Lyra) |
| --- | --- | --- |
| Router / stacks | Plain C# service (nothing engine-provided — the blueprint supplies the contract); one UIDocument + UXML templates per layer | `UPrimaryGameLayout` + `CommonActivatableWidgetStack` per `UI.Layer.*` tag (Lyra sample code — copy/adapt, not engine) |
| Screen contract | C# interface (OnPush/OnPop, CanHandleBack...) | `UCommonActivatableWidget` (Activate/Deactivate, BackHandler, `GetDesiredFocusTarget`) |
| Focus | `FocusController` + manual `NavigationMoveEvent` rerouting — **gamepad nav still immature in UITK**; production teams reroute explicitly or go full-manual; UGUI EventSystem remains the mature option for menus | Activatable tree resolves focus automatically; pitfalls: null/non-focusable `GetDesiredFocusTarget` |
| Input switching | Action maps per context, switched by the router only | `GetDesiredInputConfig` → `FUIInputConfig`; **`SetInputMode` is forbidden with CommonUI**; default root widget restores Game config |
| Modal | Overlay + manual focus trap + custom promise | `UI.Layer.Modal` + `CommonGameDialog`/MessagingSubsystem |
| Settings registry | Runtime data binding + custom registry | **Lyra GameSettings plugin** — the reference: registry, edit conditions, change tracker apply/revert |
| Action legend | Build it (read active bindings) | `CommonBoundActionBar` — automatic |
| Transitions | USS class transitions (inherently unscaled — pause-proof) | Widget anims on (de)activation; wait for exit anim before pop |

## Failure modes

The 14 classic menu bugs (focus loss, back-action chaos, input
bleed-through, double-activation, pause-stack bugs, modal leaks, stale
screen data, settings apply bugs, rebind traps, glyph mismatch, cache
extremes, localization overflow, safe-area violations, controller
disconnect) are cataloged in [pitfalls.md](./pitfalls.md) with symptom →
root cause → prevention.

## Related skills

- `hud-system` — the Game layer below these stacks; shares the glyph
  service and safe-area root.
- `scene-flow-manager` (future) — boot → title → game context switches;
  this skill owns in-context screens.
- `unity6-aaa-best-practices` / `ue5-aaa-best-practices` — engine UI
  doctrines (UITK+MVP, CommonUI+MVVM) assumed here.
- `game-architecture-patterns` — State (screen lifecycle), Command
  (navigation requests), Service Locator trade-offs.
