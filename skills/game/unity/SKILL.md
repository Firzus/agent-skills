---
name: unity
description: >-
  Picks the Unity tool for the job and applies it. Routes each need to one
  chosen default (UI Toolkit, Awaitable, Addressables, Input System, URP,
  Localization, Netcode for GameObjects, Multiplayer Services, Dedicated
  Server, Unity CLI) and writes for the Unity 7 CoreCLR runtime.
  Use when writing, reviewing, or architecting Unity code, when building a
  custom Editor tool or inspector, when driving the Unity Editor from an
  agent, when choosing between two Unity tools that do the same job, or when
  the user mentions Unity, Unity 7, UI Toolkit, UGUI, Addressables, Content
  Directories, URP, HDRP, DOTS, ECS, netcode, custom inspector,
  SerializeReference, CoreCLR, IL2CPP, Unity CLI, Unity MCP, or Unity build
  and performance questions.
---

# Unity

Ship on the **default stack** below. Each row names the one tool to reach for,
so the choice is already made — spend the thinking on the feature instead.

Baseline: **Unity 7.0** (7000.0, in alpha). It continues the Unity 6
architecture on CoreCLR: the Editor and desktop players run on CoreCLR, every
other platform on IL2CPP. Code targets C# 9 and .NET Standard 2.1 until Unity
ships .NET 10 and C# 14 within the 7.0 cycle; [runtime.md](./runtime.md) owns
what the runtime changes for your code.

7.0 aims at parity with 6.7 LTS and is not itself an LTS: the next LTS stream
starts towards the end of 2027, so a project that must ship on long-term
support stays on 6.7 LTS.

For what a 7.0 build actually ships, read its release notes and Unity's
Discussions posts: the 7000.0 manual still carries pages written for 6.7.

## The default stack

| Need | Reach for | Instead of |
| --- | --- | --- |
| Any new UI | **UI Toolkit** — [ui.md](./ui.md) | UGUI |
| World-space / diegetic UI | **Panel Renderer** (6.5) | UGUI world canvas, render texture |
| Text | **Advanced Text Generator** (default 6.5) | hand-rolled layout |
| Player-facing text in several languages | **Localization module** + Smart Strings (6.7), see [ui.md](./ui.md#localization) | the Localization package, hand-rolled string tables |
| Authoring UI for a custom tool | **UI Toolkit** — [editor-tools.md](./editor-tools.md) | Odin, IMGUI, a node canvas |
| Heterogeneous items in one authored list | **`[SerializeReference]`** + `AdvancedDropdown` | one list per type |
| Tool icons | **Built-in Editor icons**, then `painter2D` | shipping PNG variants per state |
| Async | **`Awaitable`** + `CancellationToken` | coroutines, raw `Task` |
| Static state across Play Mode entries | **`[AutoStaticsCleanup]`**, see [runtime.md](./runtime.md#static-state) | expecting a reload to reset it |
| Runtime loading | **Addressables** + `AssetReference`; Content Directory groups for installed content, AssetBundle groups for remote content until Unity ships remote Content Directories, see [assets.md](./assets.md#addressables) | `Resources/`, `Loadable<T>` without Addressables |
| Input | **Input System** action maps | legacy Input Manager |
| Audio | **built-in AudioMixer** — [workflow.md](./workflow.md) | FMOD/Wwise |
| Render pipeline | **URP** — [rendering.md](./rendering.md) | Built-In, HDRP |
| Custom render passes | **Render Graph** | `ScriptableRenderPass.Execute` |
| Lighting, static scenes | **Adaptive Probe Volumes** + baked lightmaps | Light Probe Groups |
| Light baking | **Unity Compute Light Baker**, set as the Default Light Baker | every other light-baking backend |
| Lighting, dynamic scenes | **Surface Cache GI** (6.7) | baking a scene that moves |
| Draw-call reduction and occlusion | **GPU Resident Drawer** + GPU occlusion culling | static batching |
| Pooling | **`UnityEngine.Pool`** | hand-rolled pools |
| Object identity | **`EntityId`** (64-bit) | `GetInstanceID()`, `int` ids |
| Hot paths | **Jobs + Burst** | a full ECS rewrite |
| Netcode | **Netcode for GameObjects** | Netcode for Entities |
| Authority | **client-server** | distributed authority |
| Sessions, matchmaking, relay | **Multiplayer Services** | Lobby + Matchmaker + Relay separately |
| Server builds | **Dedicated Server** + Multiplayer Roles | a hand-stripped client build |
| Testing multiple peers | **Multiplayer Play Mode** | several Editor installs |
| Per-platform build config | **Build Profiles** | hand-edited global Build Settings |
| Build-time scene processing | **`AssetPostprocessor.OnProcessScene`** | `IProcessSceneWithReport`, `[PostProcessScene]` |
| Tests | **Unity Test Framework**, edit-mode first | play-mode by default |
| Release builds | **IL2CPP** | the CoreCLR player in shipping builds |
| Driving the Editor from an agent | **Unity CLI** — [cli.md](./cli.md) | asking the user to click through the Editor |

Leave a default only where the linked reference gives that row an escape hatch.
Say which row you left and what made it worth leaving.

## Reference

| Topic | File |
| --- | --- |
| CoreCLR runtime, static state, serialization, `EntityId` | [runtime.md](./runtime.md) |
| Unity CLI, driving the Editor from an agent, screen captures, why not MCP | [cli.md](./cli.md) |
| UI Toolkit, design tokens, data binding, MVP, localization | [ui.md](./ui.md) |
| Custom Editor tools, inspectors, `[SerializeReference]` | [editor-tools.md](./editor-tools.md) |
| Composition, asmdefs, `Awaitable`, Jobs/Burst/ECS, profiling, allocations | [architecture.md](./architecture.md) |
| Exceptions, nullability, `async void`, the `UnityEngine.Object` null trap | [code-standards.md](./code-standards.md) |
| Folder layout, naming, GUID-safe renames | [project-structure.md](./project-structure.md) |
| Addressables, Content Directories, import settings, scenes, prefabs | [assets.md](./assets.md) |
| Pipeline, lighting, GPU-driven rendering | [rendering.md](./rendering.md) |
| Input, audio, version control, CI, builds, testing | [workflow.md](./workflow.md) |
| Netcode, authority, sessions, dedicated server | [multiplayer.md](./multiplayer.md) |

For Figma designs as UI Toolkit interfaces, use the `figma-to-unity` skill. For
engine-agnostic replication theory, use `coop-session`.

## Review pass

Read changed code against every row of the default stack, then account for each
line below — name the file and line where it holds, or fix it:

Several rows are conditional: they bind only when the change performs the
operation they describe. "Not applicable, this change does not do that" is a
complete answer, and the right one. Test the condition, never the presence of a
token — and never infer the rule from how many neighbouring files show the same
pattern, since copy-paste propagates a mistake as reliably as a convention.

```
- [ ] Statics reset through `[AutoStaticsCleanup]` or a lifecycle hook, so entering Play Mode twice behaves identically
- [ ] Every Awaitable carries a CancellationToken scoped to its component
- [ ] Assets load through Addressables, and every handle is released or bound to a lifetime token
- [ ] Update() free of allocation, GetComponent, Find*, and LINQ
- [ ] Runtime spawns come from a pool
- [ ] Object identity flows through EntityId
- [ ] Player-facing strings come from Localization tables
- [ ] [SerializeField] on fields only ([field: SerializeField] for properties)
- [ ] Logic sits in plain C# in its own asmdef, covered by edit-mode tests
- [ ] Renamed assets moved with their .meta, via git mv
- [ ] Networked state gated on HasAuthority
- [ ] Editor code under an Editor asmdef, runtime types in runtime assemblies
- [ ] Any rename or move of a [SerializeReference] type in this change lands with [MovedFrom] naming its real former address (no former address, no attribute)
- [ ] Custom inspectors built on UI Toolkit, with IMGUIContainer only where named
```

When the user asks for something off the default stack, name the row, state what
it costs, and follow their call.
