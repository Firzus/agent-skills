---
name: ue5-aaa-best-practices
description: >-
  Senior Unreal Engine 5 developer guidance: DO/DON'T best practices for
  building production-quality (AAA-level) games with UE5 (5.4/5.5/5.6+).
  Covers the C++ foundation / Blueprint leaf doctrine, Gameplay Ability
  System, Subsystems, GameFeatures, CommonUI and MVVM Viewmodel, Enhanced
  Input, MetaSounds, soft references and Asset Manager, World Partition,
  Nanite/Lumen decisions, tick discipline, Perforce/DDC/Horde CI, and the
  automation/Gauntlet test stack. Use when developing, reviewing, or
  architecting an Unreal Engine project, or when the user mentions Unreal,
  UE5, Blueprints, UMG, GAS, Nanite, Lumen, World Partition, or
  Unreal-specific performance and build questions.
---

# UE5 AAA Best Practices

Act as a senior Unreal Engine 5 developer shipping a production game. Apply
the DO/DON'T rules below by default; deviate only with an explicit, stated
reason. These practices target the UE5 era (5.4/5.5/5.6+). Many UE4 defaults
are now wrong: the **unlearn list** below corrects them.

For engine-agnostic architecture patterns (State, Object Pool, Event Queue,
ECS theory...), use the `game-architecture-patterns` skill; this skill covers
what is Unreal-specific.

## Unlearn list (UE4 habits that are now wrong)

| UE4 habit | Do instead | Since |
| --- | --- | --- |
| Legacy input (`BindAxis`/`BindAction`, DefaultInput.ini) | **Enhanced Input** (Input Actions, Mapping Contexts) | 5.1 |
| SoundCues for new content | **MetaSounds** | 5.0 |
| SoundClass/SoundMix runtime mixing | **Audio Modulation** (control buses) | 5.0+ |
| Manual sublevel streaming for open worlds | **World Partition** + Data Layers + HLOD | 5.0 |
| Level-file lock contention | **OFPA** (One File Per Actor) | 5.0 |
| Cascade VFX | **Niagara** | 5.0 |
| Singletons / manager actors placed in levels | **Subsystems** (GameInstance/World/LocalPlayer) | standard in UE5 |
| Hand-rolled menus, focus and input-mode management | **CommonUI** + **UMG Viewmodel (MVVM)** | 5.0/5.1+ |
| `PlayerMappableInputConfig` remapping | **`UEnhancedInputUserSettings`** | 5.3 |
| Local-only DDC, homebrew CI scripts | **Zen shared DDC**, **BuildGraph + Horde/UGS** | 5.4/5.5 |
| "Everything Nanite, everything Lumen" | Deliberate per-target choices (see performance) | — |

## Golden rules

1. **C++ foundation, Blueprint leaf logic.** Core systems, base classes, and
   loop-heavy code in C++; designer-facing tuning, content wiring, and
   one-shot scripting in Blueprint subclasses. Blueprint-only cores are slow
   and unmergeable; C++-only projects lock designers out. See
   [architecture.md](./architecture.md).
2. **UI = CommonUI + MVVM, event-driven, never property bindings.** Menu
   flows on `UCommonActivatableWidget` stacks; data via the UMG Viewmodel
   plugin with FieldNotify; the UMG "Bind" dropdown is banned (polls every
   frame). See [ui.md](./ui.md).
3. **References are soft, content is data, worlds are partitioned.**
   `TSoftObjectPtr` + async loading, Asset Manager primary assets, Data
   Assets/Tables for definitions, World Partition + OFPA for open worlds.
   See [assets.md](./assets.md).
4. **Performance = bracket the bottleneck, then tick/Nanite/Lumen
   discipline.** Insights + `stat unit` on target hardware first; tick off by
   default; Nanite and Lumen are deliberate choices, not defaults; pool
   spawned actors; significance-scale distant agents. See
   [performance.md](./performance.md).
5. **Server-authoritative from day one; pipeline as code.** Validate on the
   server, replicate state down. Perforce + shared DDC + BuildGraph CI +
   continuous cooking; automation tests and validators gate merges. See
   [architecture.md](./architecture.md) and [workflow.md](./workflow.md).

## Domain index

| Domain | Reference |
| --- | --- |
| C++/BP split, GAS, Subsystems, GameFeatures, framework classes, networking | [architecture.md](./architecture.md) |
| UMG/Slate performance, CommonUI, MVVM Viewmodel, widget pooling | [ui.md](./ui.md) |
| Naming, folders, soft refs, Asset Manager, Data Assets, World Partition | [assets.md](./assets.md) |
| Insights profiling, Nanite/Lumen/VSM, tick discipline, pooling, significance | [performance.md](./performance.md) |
| Enhanced Input, MetaSounds/audio, Perforce/DDC/CI, testing & validation | [workflow.md](./workflow.md) |

## How to apply

When writing or reviewing Unreal code:

```
- [ ] Core logic creeping into Blueprint graphs? -> move to C++ base, expose leaves
- [ ] Any UMG property binding (Bind dropdown)? -> event-driven or Viewmodel
- [ ] Any hard reference chain pulling content at load? -> TSoftObjectPtr + async
- [ ] Any actor ticking without justification? -> tick off, timers/events
- [ ] Any SpawnActor/DestroyActor churn (projectiles, VFX)? -> pool
- [ ] Any legacy input, SoundCue, or manager-actor singleton? -> unlearn table
- [ ] Replicated gameplay trusting the client? -> server-authoritative redesign
- [ ] New pure-logic module without low-level tests? -> add LLT/spec tests
```

When the user's choice conflicts with these rules, state the rule, the cost of
deviating, and proceed only if they confirm.
