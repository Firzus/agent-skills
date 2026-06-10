---
name: hud-system
description: >-
  Architecture blueprint for in-game HUD systems in action games: event-driven
  read-only UI architecture (MVP/MVVM, zero per-frame polling), HUD layout
  grammar and information hierarchy, dynamic visibility rules (contextual
  show/hide, HUD breathing), pooled damage numbers and floating combat text,
  notification/toast channels, bars and gauges (ghost drain, boss phase pips,
  radial cooldowns), interaction prompts with glyph switching, quest tracker
  and off-screen indicators, accessibility and safe areas. Includes sourced
  numbers (text sizes, timings, performance budgets) and Unity 6 (UITK) /
  UE5 (UMG/CommonUI) mappings. Use when designing or building a HUD, health
  bars, damage numbers, notifications, interaction prompts, or when the HUD
  costs too much frame time or breaks on TVs/ultrawide.
---

# HUD System

Build the in-game HUD layer of an action game. References: Genshin Impact /
Granblue Fantasy: Relink (party action-RPG HUDs), God of War 2018 / Horizon
(dynamic minimalist HUDs). Excluded (separate skills): minimap/world map,
full-screen menus.

## The architecture rule

**The HUD is a read-only, event-driven consumer.** Gameplay never knows the
HUD exists; the HUD never polls per frame and never writes gameplay state.

```
gameplay state → events → view-model layer → widgets
                (push)     (formats data)     (pure presentation)
```

- Combat code emits `DamageDealt`, `CooldownStarted`, `QuestUpdated`; HUD
  systems subscribe. The queue decouples in time: UI can defer, aggregate,
  or drop (the notification manager and damage-number merging both live on
  this property).
- The **view-model layer** turns raw state into display data (HP fraction,
  cooldown 0–1, localized strings). Widgets read view-models only. UI
  artists iterate against a stable view-model contract without touching
  gameplay (the Destiny/Division GDC model).
- Rule of thumb for bindings vs events: **bindings for values that lerp
  (HP, gauges), events for things that happen** (buff icons, toasts, quest
  steps).
- Juice (flash, shake, pulse) lives in the widget layer — never in data.

## Layout grammar (the genre standard)

Edges hold information; **the center stays clear** (keep ~the middle third
free of persistent UI). Player/party status bottom-left or top-left
(Relink: party cards bottom-left); skills/cooldowns bottom-right around the
button cluster; boss bar top-center; quest tracker right side; notification
feed bottom-left; toasts top-center. Combat-critical (HP, cooldowns, boss
bar) > contextual (prompts, tracker) > ambient (XP, currency — show only on
change). Diegetic/spatial elements (world markers, off-screen arrows)
offload density from the 2D layer.

## Build order (4 shippable tiers)

```
Tier 1 — Readable basics
- [ ] HUD root with a single layer enum (HUD < world markers < toasts <
      modal); anchored to a safe-area rect, never raw screen edges
- [ ] Event bus subscription + view-model layer (zero polling from day one)
- [ ] HP/resource bars (instant front + ghost drain back), skill cooldown
      radials, boss bar
Tier 2 — Combat feedback
- [ ] Pooled damage numbers (hard cap + merge window + priority culling)
- [ ] Notification channels (pickup feed / quest / tutorial / system) with
      priorities, aggregation (xN), do-not-disturb states
- [ ] Interaction prompt manager (gameplay-side scoring, one winner,
      action-referenced glyphs)
- [ ] Bar juice: damage flash, low-HP pulse (<3 flashes/s), gauge-full ping
Tier 3 — Dynamic HUD
- [ ] Visibility rules engine: per-element {flags that show it, idle
      timeout, fade durations} + user override (Always On/Off/Dynamic)
- [ ] HUD pulse button (reveal all ~5 s), photo-mode force-hide
- [ ] Quest tracker + off-screen indicators (edge clamp + arrow, behind-
      camera flip)
- [ ] Glyph switching on device change (all live prompts swap instantly)
Tier 4 — Ship quality
- [ ] HUD options menu: scale (80-150%), per-element visibility, opacity,
      text size (to 200%), colorblind palettes, damage numbers off
- [ ] Safe-area calibration screen; resolution matrix (16:9/16:10/21:9/Deck)
- [ ] Localization pass (pseudo-loc, +30-40% text growth)
- [ ] Performance audit: HUD < 0.5-1 ms/frame, pooled everything
```

## Numbers (starting points — tune by UX test)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Min text height (console/TV) | 26 px @1080p, scalable to 200% | Xbox Accessibility Guidelines |
| Min text height (PC) | 18 px @1080p | XAG |
| Contrast | 4.5:1 text, 3:1 large elements | XAG/WCAG |
| Safe area | 90% box (5%/edge) + user slider | SMPTE/cert practice |
| Toast duration | 2–7 s (`50 ms × chars`, clamped); feed lines 3–5 s | UX research |
| Fade in / out | 200–300 ms in, ~200 ms out; never > 400–500 ms | NN/g, Material |
| HUD idle-hide | 5 s combat elements, 8–10 s compass/tracker | Horizon/GoW pattern |
| Damage number lifetime | 0.5–1.5 s; merge window 100–300 ms; ~10–20 visible cap | community convention |
| Ghost-bar drain | hold 0.5–1 s, then drain (snap loss, smooth regen) | fighting-game standard |
| HUD frame budget | < 0.5–1 ms CPU; throttle non-critical to ~10 Hz | profiling case studies |
| HUD scale range | 80–150% shipped | AAA baseline |
| Colorblind-safe pair | danger `#D55E00` / ally `#56B4E9` (Okabe-Ito) | CUD palette |
| Center clearance | middle ~25–33% width free of persistent UI | genre convention |

Full sourced tables in [architecture.md](./architecture.md).

## Engine mapping

| Generic block | Unity 6 (UITK) | UE5 (UMG/CommonUI) |
| --- | --- | --- |
| HUD root + layers | UIDocument(s) + documented `PanelSettings.sortingOrder` table | Single root widget with activatable stacks (Lyra) — never scattered `AddToViewport(ZOrder)` |
| View-model binding | Runtime `DataBinding` + `[CreateProperty]` + `INotifyBindablePropertyChanged` (change-driven, not default polling) | MVVM Viewmodel plugin (FieldNotify); set Property Binding Rule = **Prevent** |
| Pooled transients | Manual `VisualElement` free-list, `visibility` toggle, `translate` moves, `DynamicTransform` hint | `UUserWidgetPool`; **Niagara atlas digits** for high-volume damage numbers |
| World-anchored | Screen-space panel + `WorldToScreenPoint` + pooled labels (world-space panels 6.2+ for low-count nameplates only) | Manual `ProjectWorldLocationToWidgetPosition` (DPI-aware) over pooled slots; WidgetComponent only at low count |
| Custom gauges | `generateVisualContent` (Painter2D) + `MarkDirtyRepaint` | Radial-mask material parameter (event-set, never binding-polled) |
| Glyphs | `PlayerInput.onControlsChanged` → glyph provider | `CommonActionWidget` + per-platform ControllerData |
| Safe area | Custom root from `Screen.safeArea` (Y-flip) | `USafeZone` root + DPI Scale Rule (shortest side) |

## Failure modes

The 12 classic HUD bugs (per-frame polling, layout thrash, damage-number
floods, projection bugs at screen edges, binding leaks on respawn, glyph
desync, safe-area violations, z-order wars, aspect-ratio breaks,
localization overflow, unreadable-over-gameplay, update-order flicker) are
cataloged in [pitfalls.md](./pitfalls.md) with symptom → root cause →
prevention.

## Related skills

- `combat-system` — emits the HitEvents/gauge events this HUD consumes
  (damage numbers, stun gauges, boss states).
- `game-architecture-patterns` — Event Queue and Observer theory behind the
  read-only consumer model.
- `unity6-aaa-best-practices` (UITK + tokens + MVP) /
  `ue5-aaa-best-practices` (CommonUI + MVVM, no-Bind rule) — the engine UI
  doctrines this skill builds on.
