---
name: hud-system
description: >-
  Architecture blueprint for in-game HUD systems: event-driven read-only UI,
  layout hierarchy, dynamic visibility, damage numbers, bars, gauges,
  notifications, prompts, quest trackers, diegetic/spatial HUDs, accessibility,
  nameplates, reticles, and world-space indicators. Use when designing HUDs,
  health bars, prompts, damage text, accessible UI, or when HUDs cost frame time,
  break on TVs/ultrawide, or fail colorblind/low-vision players.
---

# HUD System

Build the in-game HUD layer of an action game — the engineering, the design
craft, the accessibility, and the world-space elements. References: Genshin
Impact / Granblue Fantasy: Relink (party action-RPG HUDs), God of War 2018 /
Horizon (dynamic minimalist HUDs), Dead Space / Metroid Prime (diegetic
HUD), TLOU2 (accessibility). Excluded (separate skills): minimap/world map
(`minimap-worldmap`), full-screen menus (`menu-ui-manager`).

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

## Reference map

| File | Covers |
| --- | --- |
| [elements.md](./elements.md) | The event-driven core + view-models, layout/info hierarchy, dynamic-visibility rules engine, bars & gauges (ghost drain, boss pips, cooldown radials), pooled damage numbers, notification/toast channels, interaction prompts, quest tracker, performance budget |
| [design-genres.md](./design-genres.md) | The diegesis taxonomy (diegetic/spatial/meta/non-diegetic), "what belongs on the HUD at all", diegetic case studies (Dead Space, Metroid Prime, Far Cry 2), genre conventions (FPS/fighting/MMO/survival/looter/RTS/BR), game-feel & juice, readability & the combat-vs-exploration split |
| [accessibility.md](./accessibility.md) | Standards & legal (XAG/GAG/APX, CVAA/EAA), visual (text size, contrast, colorblindness, backplates), subtitles/captions, motor & cognitive, photosensitivity (the three-flash rule), the settings-as-data options registry |
| [world-space.md](./world-space.md) | World-space vs screen-space, nameplate/health-bar systems at scale (pooling, culling, GPU instancing), off-screen indicators & threat/damage direction (edge-clamp math, behind-camera flip), reticle/crosshair tech, the widget-vs-Niagara cost model |
| [pitfalls.md](./pitfalls.md) | 14 failure modes (symptom → cause → prevention) with debugging order and ship checklist |

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

Full sourced tables in [elements.md](./elements.md); accessibility numbers
(text/contrast/subtitle/photosensitivity) in
[accessibility.md](./accessibility.md).

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

The 14 classic HUD bugs (per-frame polling, layout thrash, damage-number
floods, projection bugs at screen edges, binding leaks on respawn, glyph
desync, safe-area violations, z-order wars, aspect-ratio breaks,
localization overflow, unreadable-over-gameplay, update-order flicker,
**color-only/single-channel critical info**, and **world-space HUD that
doesn't scale**) are cataloged in [pitfalls.md](./pitfalls.md) with
symptom → root cause → prevention.
