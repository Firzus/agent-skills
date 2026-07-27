---
name: unity
description: >-
  Picks the Unity tool for the job and applies it. Routes each need to one
  chosen default — UI Toolkit, Awaitable, Addressables, Input System, URP,
  Netcode for GameObjects, Multiplayer Services, Dedicated Server, Unity
  CLI — and keeps the project CoreCLR-ready for the Mono removal in 6.8.
  Use when writing, reviewing, or architecting Unity code, when building a
  custom Editor tool or inspector, when driving the Unity Editor from an
  agent, when choosing between two Unity tools that do the same job, or when
  the user mentions Unity, UI Toolkit, UGUI, Addressables, URP, HDRP, DOTS,
  ECS, netcode, custom inspector, SerializeReference, CoreCLR, IL2CPP, Unity
  CLI, Unity MCP, or Unity build and performance questions.
---

# Unity

Ship on the **default stack** below. Each row names the one tool to reach for,
so the choice is already made — spend the thinking on the feature instead.

Baseline: **6.7 LTS**, written **CoreCLR-ready**. 6.7 LTS is the last Mono
release; 6.8 removes Mono and moves the Editor and desktop player to CoreCLR on
.NET 10 / C# 14. Unity 7 (Q1 2027) continues that line rather than breaking it —
a CoreCLR-ready project reaches it with little extra work, which is what the
discipline in [runtime.md](./runtime.md) buys.

## The default stack

| Need | Reach for | Instead of |
| --- | --- | --- |
| Any new UI | **UI Toolkit** — [ui.md](./ui.md) | UGUI |
| World-space / diegetic UI | **Panel Renderer** (6.5) | UGUI world canvas, render texture |
| Text | **Advanced Text Generator** (default 6.5) | hand-rolled layout |
| Authoring UI for a custom tool | **UI Toolkit** — [editor-tools.md](./editor-tools.md) | Odin, IMGUI, a node canvas |
| Heterogeneous items in one authored list | **`[SerializeReference]`** + `AdvancedDropdown` | one list per type |
| Tool icons | **Built-in Editor icons**, then `painter2D` | shipping PNG variants per state |
| Async | **`Awaitable`** + `CancellationToken` | coroutines, raw `Task` |
| Runtime loading | **Addressables** + `AssetReference` | `Resources/` |
| Input | **Input System** action maps | legacy Input Manager |
| Audio | **built-in AudioMixer** — [workflow.md](./workflow.md) | FMOD/Wwise |
| Render pipeline | **URP** — [rendering.md](./rendering.md) | Built-In, HDRP |
| Custom render passes | **Render Graph** | `ScriptableRenderPass.Execute` |
| Lighting, static scenes | **Adaptive Probe Volumes** + baked lightmaps | Light Probe Groups |
| Lighting, dynamic scenes | **Surface Cache GI** (6.7) | baking a scene that moves |
| Draw-call reduction | **GPU Resident Drawer** + GPU occlusion | static and dynamic batching |
| Pooling | **`UnityEngine.Pool`** | hand-rolled pools |
| Object identity | **`EntityId`** (64-bit) | `GetInstanceID()`, `int` ids |
| Hot paths | **Jobs + Burst** | a full ECS rewrite |
| Netcode | **Netcode for GameObjects** 2.13.1 | Netcode for Entities |
| Authority | **client-server** | distributed authority |
| Sessions, matchmaking, relay | **Multiplayer Services** 2.1.1 | Lobby + Matchmaker + Relay separately |
| Server builds | **Dedicated Server** 3.0.0 + Multiplayer Roles | a hand-stripped client build |
| Testing multiple peers | **Multiplayer Play Mode** 2.0.2 | several Editor installs |
| Per-platform build config | **Build Profiles** | hand-edited global Build Settings |
| Tests | **Unity Test Framework**, edit-mode first | play-mode by default |
| Release builds | **IL2CPP** | Mono in shipping builds |
| Driving the Editor from an agent | **Unity CLI** — [cli.md](./cli.md) | asking the user to click through the Editor |

Leave a default only where the linked reference gives that row an escape hatch.
Say which row you left and what made it worth leaving.

## Reference

| Topic | File |
| --- | --- |
| CoreCLR readiness, static state, serialization, `EntityId` | [runtime.md](./runtime.md) |
| Unity CLI, MCP mode, driving the Editor from an agent | [cli.md](./cli.md) |
| UI Toolkit, design tokens, data binding, MVP | [ui.md](./ui.md) |
| Custom Editor tools, inspectors, `[SerializeReference]` | [editor-tools.md](./editor-tools.md) |
| Composition, asmdefs, `Awaitable`, Jobs/Burst/ECS | [architecture.md](./architecture.md) |
| Folder layout, naming, GUID-safe renames | [project-structure.md](./project-structure.md) |
| Addressables, import presets, scenes, prefabs | [assets.md](./assets.md) |
| Pipeline, lighting, GPU-driven rendering | [rendering.md](./rendering.md) |
| Profiling and allocation discipline | [performance.md](./performance.md) |
| Input, audio, version control, CI, builds, testing | [workflow.md](./workflow.md) |
| Netcode, authority, sessions, dedicated server | [multiplayer.md](./multiplayer.md) |

For Figma designs as UI Toolkit interfaces, use the `figma-to-unity` skill. For
engine-agnostic replication theory, use `coop-session`.

## Review pass

Read changed code against every row of the default stack, then account for each
line below — name the file and line where it holds, or fix it:

```
- [ ] Statics reset explicitly, so entering Play Mode twice behaves identically
- [ ] Every Awaitable carries a CancellationToken scoped to its component
- [ ] Assets load through Addressables, and every handle is released
- [ ] Update() free of allocation, GetComponent, Find*, and LINQ
- [ ] Runtime spawns come from a pool
- [ ] Object identity flows through EntityId
- [ ] [SerializeField] on fields only ([field: SerializeField] for properties)
- [ ] Logic sits in plain C# in its own asmdef, covered by edit-mode tests
- [ ] Renamed assets moved with their .meta, via git mv
- [ ] Networked state gated on HasAuthority
```

When the user asks for something off the default stack, name the row, state what
it costs, and follow their call.
