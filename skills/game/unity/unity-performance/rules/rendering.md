# Rules: rendering

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

## Render Graph passes

### RP01 SetRenderTarget without load and store actions
- Level: Warning
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `SetRenderTarget\(\s*[^,)]+\s*\)\s*;`
- Reason: The one-argument overload loads and stores the target; on a tile-based GPU that moves the whole target between tile memory and main memory for nothing when the pass overwrites it or nobody reads it later.
- Fix: Pass explicit `RenderBufferLoadAction` and `RenderBufferStoreAction`. See [render-graph.md](../../unity-rendering/render-graph.md#choose-the-pass-type).
- Source: [When to use UnsafePass in Render Graph](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zhang-yubing-1.html)

### RP02 Unsafe pass
- Level: Critical
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `AddUnsafePass\s*[<(]`
- Reason: `SetRenderTarget` inside an unsafe pass registers no dependency, so a texture not declared with `UseTexture` gets a wrong lifetime and no synchronization. An unsafe pass also never merges, so one placed between raster passes splits the native render pass.
- Fix: Confirm the pass needs an API the raster and compute command buffers lack, a real `CommandBuffer`, or collapses a chain that can never merge; then declare every texture it touches, render targets included, with `builder.UseTexture`. See [render-graph.md](../../unity-rendering/render-graph.md#choose-the-pass-type).
- Source: [When to use UnsafePass in Render Graph](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zhang-yubing-1.html)

### RP03 Raster pass per step of a chain that never merges
- Level: Info
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `AddRasterRenderPass\s*[<(]`
- Reason: Each raster pass costs fixed Render Graph CPU time. A 100-step ping-pong blur took 1080.7 µs as raster passes against 898.5 µs as one unsafe pass, about 1.8 µs per pass (Editor, Apple M4 Max, 256x256 target); GPU time does not change.
- Fix: When the call sits in a loop building a ping-pong blur or mip pyramid, record the chain as one unsafe pass that switches targets in its render function. See [render-graph.md](../../unity-rendering/render-graph.md#choose-the-pass-type).
- Source: [When to use UnsafePass in Render Graph](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zhang-yubing-1.html)

### RP05 Custom pass after post-processing adds the final blit
- Level: Info
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `RenderPassEvent\.(AfterRenderingPostProcessing|AfterRendering)\b`
- Reason: A custom pass at or after `AfterRenderingPostProcessing` makes URP add FinalBlitPass, one more full-screen copy to the back buffer, which costs bandwidth at high resolution on mobile.
- Fix: When the pass is the last full-screen step of the last camera, write straight to the back buffer. See [render-graph.md](../../unity-rendering/render-graph.md#skip-the-final-blit).
- Source: [How to omit URP's FinalBlitPass](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zhang-yubing-2.html)

### RP06 Back buffer switch without FinalBlitPass's duties
- Level: Critical
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `SwitchActiveTexturesToBackbuffer\s*\(`
- Reason: The back buffer is write-only, and the pass now replaces FinalBlitPass. Called before the last camera, overlay cameras lose their output; a later read of `activeColorTexture` breaks; a missing Y flip or sRGB conversion renders the image upside down or with wrong colours.
- Fix: Confirm the call is guarded by `cameraData.resolveFinalTarget`, no later pass reads the active textures, and the pass flips Y through `GetTextureUVOrigin` and converts to sRGB through `_LINEAR_TO_SRGB_CONVERSION`. See [render-graph.md](../../unity-rendering/render-graph.md#skip-the-final-blit).
- Source: [How to omit URP's FinalBlitPass](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zhang-yubing-2.html)

### RP07 Blit flip decided from graphicsUVStartsAtTop
- Level: Warning
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `SystemInfo\.graphicsUVStartsAtTop`
- Reason: The property describes the graphics API's convention, not whether the source and target of one blit differ in UV origin, so a flip decided from it is wrong on some targets.
- Fix: Compare `context.GetTextureUVOrigin(source)` with that of the target inside the render function. See [render-graph.md](../../unity-rendering/render-graph.md#skip-the-final-blit).
- Source: [How to omit URP's FinalBlitPass](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zhang-yubing-2.html)

## Per-renderer variation

### RP09 Material duplicated per renderer
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `new Material\s*\(|\.materials?\s*[.\[;]`
- Reason: Reading `renderer.material` or creating a material per renderer duplicates it, and every edit uploads the whole material. On an iPhone 12 with 10,000 spheres (URP, SRP Batcher on), per-renderer materials took 15.79 MB against 1.66 KB for the shader user value, and ran at 11.1 FPS (8.1 with GPU Resident Drawer) when edited every frame, against 48.0 and 60.0.
- Fix: Share one material and vary it with `SetShaderUserValue`, except on a Surface Cache GI emitter whose emission varies at runtime: SCGI ignores the user value, so that emitter keeps its own material. See [unity-rendering](../../unity-rendering/SKILL.md#gpu-driven-drawing).
- Source: [Graphics optimization with Renderer Shader User Value](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/seto-noboru-1.html)

### RP10 MaterialPropertyBlock on SRP Batcher content
- Level: Warning
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `\bMaterialPropertyBlock\b|SetPropertyBlock\s*\(`
- Reason: A renderer with a property block drops out of the SRP Batcher and GPU Resident Drawer paths. In the same iPhone 12 test, property blocks ran at 28.9 FPS with static values and 26.1 FPS (25.2 with GPU Resident Drawer) with per-frame edits, against 49.9 and 48.0 FPS for the shader user value (59.8 and 60.0 with GPU Resident Drawer).
- Fix: Replace the block with `SetShaderUserValue`, or a `GraphicsBuffer` index past 32 bits. On a Surface Cache GI emitter, SCGI ignores both the block and the user value: give it its own material. See [unity-rendering](../../unity-rendering/SKILL.md#gpu-driven-drawing).
- Source: [Graphics optimization with Renderer Shader User Value](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/seto-noboru-1.html)

### RP11 GraphicsBuffer created on a hot path
- Level: Info
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `new GraphicsBuffer\s*\(`
- Reason: Every buffer allocates GPU memory and every `SetData` uploads it; a buffer recreated or fully rewritten each frame pays that cost each frame, and one never disposed leaks.
- Fix: Create the buffer once, upload only changed ranges, and `Dispose` it with its owner.
- Source: [Graphics optimization with Renderer Shader User Value](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/seto-noboru-1.html)

## Device tiers

### RP12 One Quality Level on a mobile target
- Level: Warning
- Scope: any
- When: android|ios
- Code: any
- Check: EDITOR
- Reason: The project targets Android or iOS with a single Quality Level, so every phone gets the same rendering configuration: the low end crashes or overheats and the high end wastes its headroom.
- Fix: Add a Quality Level per device tier, each bound to its own URP asset, and pick one at startup. See [unity-rendering](../../unity-rendering/SKILL.md#device-tiers).
- Source: [Switching rendering settings per device](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/sakuma-naoki-1.html)

### RP13 Android tier chosen from model strings
- Level: Warning
- Scope: any
- When: android
- Files: *.cs
- Code: runtime
- Check: `SystemInfo\.(deviceModel|graphicsDeviceName)`
- Reason: Android vendors name models and GPUs inconsistently, so string comparison misclassifies devices; the strings are reliable only on iOS.
- Fix: On Android, tier by `SystemInfo.systemMemorySize`, a table of known models, or a startup benchmark. See [unity-rendering](../../unity-rendering/SKILL.md#device-tiers).
- Source: [Switching rendering settings per device](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/sakuma-naoki-1.html)

### RP14 Renderer feature without a low-tier path
- Level: Info
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `:\s*ScriptableRendererFeature\b`
- Reason: A custom feature that costs the same on every tier limits how far low-end devices can be lightened.
- Fix: Give the feature a cheaper setting per tier. See [unity-rendering](../../unity-rendering/SKILL.md#device-tiers).
- Source: [Switching rendering settings per device](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/sakuma-naoki-1.html)

## Tile memory

Bandwidth figures in this section are computed for 1080p, not measured.

### RP15 Full-screen pass declared as a partial write
- Level: Warning
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `SetRenderAttachment\([^)]*AccessFlags\.Write\b`
- Reason: `AccessFlags.Write` tells Render Graph that some pixels may keep their old value, so it loads the target: about 8 MB per frame for RGBA8, about 475 MB/s at 60 FPS, for an identical image.
- Fix: Declare `AccessFlags.WriteAll` when the pass overwrites every pixel. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

### RP16 Same-pixel read through UseTexture
- Level: Warning
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `\.UseTexture\s*\(`
- Reason: `UseTexture` forces the earlier pass to store its output and splits the native pass. For a pass that reads only the pixel it shades (tonemapping, compositing, deferred lighting), framebuffer fetch keeps the data in tile memory: on deferred with three RGBA8 G-buffer targets that removes about 24 MB of stores per frame, about 1.4 GB/s at 60 FPS.
- Fix: Read same-pixel inputs with `SetInputAttachment`; keep `UseTexture` for blur, bloom, distortion, and unsafe passes. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

### RP17 Intermediate texture made global
- Level: Warning
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `SetGlobalTextureAfterPass\s*\(`
- Reason: A global texture hides its readers from Render Graph, so it is always stored, never memoryless, and blocks merging: about 7.9 MB per store for RGBA8, about 475 MB/s at 60 FPS.
- Fix: Declare each reader with `UseTexture` or `SetInputAttachment` instead. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

### RP18 Imported texture without import parameters
- Level: Warning
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `ImportTexture\(\s*[^,)]+\s*\)`
- Reason: Render Graph cannot see uses of an imported texture outside the graph, so it loads it on first use and stores it after the last: about 16 MB per frame for an RGBA8 round trip, about 950 MB/s at 60 FPS, when the content is regenerated anyway.
- Fix: Use `renderGraph.CreateTexture`, or pass `ImportResourceParams` with `clearOnFirstUse` and `discardOnLastUse` for a texture regenerated each frame. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

### RP19 Hand-built texture descriptor
- Level: Warning
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `new\s+TextureDesc\s*\(`
- Reason: Passes merge only when attachments share resolution and MSAA sample count. A descriptor that drifts from the camera colour, often in sample count, splits the native pass and disables framebuffer fetch: about 16 MB per frame for an RGBA8 round trip.
- Fix: Copy the descriptor from `renderGraph.GetTextureDesc(cameraColor)` and change only what the pass needs. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

### RP20 Depth Texture enabled on a URP asset
- Level: Warning
- Scope: any
- When: urp
- Code: any
- Check: EDITOR
- Reason: A URP asset has Depth Texture enabled, which adds a depth copy that stores depth (about 7.9 MB per frame) and splits the opaque and transparent passes; the reviewer confirms whether any shader, effect, or script samples `_CameraDepthTexture`.
- Fix: When nothing samples it, turn Depth Texture off on the asset and on camera overrides. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

### RP21 MSAA buffer read as a texture
- Level: Warning
- Scope: any
- When: urp
- Files: *Pass.cs, *Feature.cs
- Code: runtime
- Check: MANUAL
- Reason: With MSAA, URP keeps the multisampled colour and depth memoryless and stores only the resolved colour. A pass that reads the multisampled buffer forces it into memory: at 4x, about 31.7 MB each for colour and depth, and four samples stored per pixel.
- Fix: Read the resolved target, then confirm in the Render Graph Viewer that the MSAA colour stores with Resolve and shows Memoryless. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

### RP22 Tile-only buffer not marked memoryless
- Level: Info
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `SetInputAttachment\s*\(`
- Reason: A buffer passed only through framebuffer fetch becomes memoryless automatically, but a later stray `UseTexture` silently undoes it and costs memory and bandwidth again (about 7.9 MB per RGBA8 buffer).
- Fix: Create the input's texture with `desc.memoryless` set, so a stray read fails loudly. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

### RP23 Compute pass between raster passes
- Level: Info
- Scope: any
- When: urp
- Files: *.cs
- Code: runtime
- Check: `AddComputePass\s*[<(]`
- Reason: Only consecutive raster passes merge; a compute pass recorded between them ends the native pass, with a store and load of the intermediates at the break (about 16 MB per frame for RGBA8).
- Fix: Record compute work before or after the raster chain, then read Pass Break Reasoning in the Render Graph Viewer. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity 6 Render Graph tile memory optimization](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

## Pipeline settings and scene content

### GR01 No resolution scaling on mobile
- Level: Warning
- Scope: any
- When: android|ios
- Files: *.asset, *.cs
- Code: any
- Check: ABSENT `m_RenderScale:\s*0\.|\.renderScale\s*=|Screen\.SetResolution\s*\(`
- Reason: Fill rate is the usual GPU bottleneck on phones, and native resolution on a high-density screen spends it on pixels the player cannot tell apart.
- Fix: Lower Render Scale on the URP asset of each mobile tier and upscale through the Upscaler Priority List. See [unity-rendering](../../unity-rendering/SKILL.md#platform-and-performance-levers).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR03 Shader properties outside UnityPerMaterial
- Level: Warning
- Scope: any
- When: urp
- Files: *.shader
- Code: any
- Check: `^\s*Properties\s*(\{|$)`
- Reason: A hand-written shader whose material properties are not all in `CBUFFER_START(UnityPerMaterial)` is not SRP Batcher-compatible, which also keeps its renderers off the GPU Resident Drawer path.
- Fix: Declare every property of the block in one `UnityPerMaterial` buffer with the same layout in every pass, and check compatibility in the shader inspector. See [unity-rendering](../../unity-rendering/SKILL.md#gpu-driven-drawing).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR04 Overdraw
- Level: Warning
- Scope: any
- When: -
- Files: *.prefab, *.unity, *.mat
- Code: any
- Check: MANUAL
- Reason: Overlapping transparent surfaces and dense particles shade each pixel several times, which dominates fill rate on mobile.
- Fix: Inspect the overdraw view of the Rendering Debugger, then cut transparent layers, particle counts and sizes, and sort opaque geometry front to back.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR05 Shadow settings too costly for mobile
- Level: Warning
- Scope: any
- When: urp
- Code: any
- Check: EDITOR
- Reason: On a mobile target, a URP asset uses a 4096 main light shadow map, a shadow distance above 100, or 4 cascades. A 4096 map holds four times the texels of 2048, and each cascade renders the shadow casters again.
- Fix: On mobile tiers, use a 1024 or 2048 map, a shadow distance near 20 to 30, and one or two cascades. See [unity-rendering](../../unity-rendering/SKILL.md#device-tiers).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR06 Many realtime lights
- Level: Warning
- Scope: any
- When: -
- Files: *.unity, *.prefab
- Code: any
- Check: MANUAL
- Reason: Forward+ lifts the per-object light limit, but every realtime point and spot light still adds shading work on each pixel it covers, and shadowed ones add shadow passes.
- Fix: Count the realtime point and spot lights per view; bake static lighting or move dynamic scenes to Surface Cache GI. See [unity-rendering](../../unity-rendering/SKILL.md#lighting).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR07 Costly post-processing effects
- Level: Warning
- Scope: any
- When: urp
- Files: *.asset
- Code: any
- Check: `m_Name:\s*(Bloom|DepthOfField|MotionBlur|ScreenSpaceLensFlare)\b`
- Reason: Each of these effects adds full-screen passes and intermediate targets that leave tile memory, unlike the colour effects that on-tile post-processing runs in one pass.
- Fix: Confirm the effect is active on mobile tiers and worth its cost; keep mobile post-processing to the effects on-tile post-processing covers. See [unity-rendering](../../unity-rendering/SKILL.md#platform-and-performance-levers).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR08 8x MSAA
- Level: Warning
- Scope: any
- When: urp
- Code: any
- Check: EDITOR
- Reason: A URP asset uses 8x MSAA, twice the samples per pixel of 4x for little visible gain; on desktop GPUs the cost is bandwidth and memory, and on tile-based GPUs, where 4x resolves in tile memory, it costs tile capacity.
- Fix: Use 4x or 2x, measured on the target GPU, and confirm the MSAA buffers stay memoryless in the Render Graph Viewer. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR09 Extra camera
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `AddComponent<Camera>|\.cameraStack\.Add\s*\(|[Cc]amera\w*\.enabled\s*=\s*true`
- Reason: Every enabled camera, overlay cameras included, runs its own culling and render passes even when its output is hidden.
- Fix: Disable a camera while its output is not visible, and keep the camera stack to the overlays the frame needs.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR10 Reflection probe refreshed every frame
- Level: Critical
- Scope: any
- When: -
- Files: *.unity, *.prefab, *.cs
- Code: any
- Check: `m_RefreshMode:\s*1\b|ReflectionProbeRefreshMode\.EveryFrame`
- Reason: A realtime probe refreshed every frame renders the scene six times, once per cube face, on top of the frame.
- Fix: Bake the probe, or set Via Scripting and render it on demand with time slicing; use SSR for moving specular. See [unity-rendering](../../unity-rendering/SKILL.md#lighting).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR11 High anisotropic filtering on mobile
- Level: Info
- Scope: any
- When: android|ios
- Files: *.meta
- Code: any
- Check: `^\s*aniso:\s*([5-9]|1[0-6])\b`
- Reason: Each anisotropy level adds texture samples per lookup, a bandwidth cost on mobile GPUs.
- Fix: Keep Aniso Level at 2 to 4 on mobile textures, higher only for surfaces seen at grazing angles. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR14 RenderTexture allocated in code
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `new\s+RenderTexture\s*\(|RenderTexture\.GetTemporary\s*\(`
- Reason: A render texture sized to the screen or larger than its use needs costs video memory and fill rate, and one allocated each frame adds allocation cost.
- Fix: Size it to what the effect shows, allocate it once, and inside a render pass create it with `renderGraph.CreateTexture`. See [render-graph.md](../../unity-rendering/render-graph.md#declare-attachments-for-tile-memory).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### GR15 Many texture samples per fragment
- Level: Warning
- Scope: any
- When: android|ios
- Files: *.shader, *.hlsl
- Code: any
- Check: MANUAL
- Reason: Texture fetches are the usual bandwidth bottleneck of mobile fragment shaders; more than about five per fragment deserves a look.
- Fix: Count the samples in each fragment function; pack channels into fewer textures and give low tiers a variant with fewer samples. See [unity-rendering](../../unity-rendering/SKILL.md#device-tiers).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)
