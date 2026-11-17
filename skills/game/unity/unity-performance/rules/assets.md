# Rules: assets

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

### AS01 Texture larger than the size budget
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: The effective max size on a target platform exceeds `max_texture_size` (default 2048). Every texture ships and stays resident at that size, which costs download size, GPU memory, and bandwidth.
- Fix: Lower the max size per platform to what the texture covers on screen, and enforce it at import. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS02 Uncompressed texture
- Level: Critical
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: The texture uses an uncompressed format, or its compression is None, on a target platform. Project Auditor showed the same 2048x2048 texture at 16.0 MB uncompressed against 2.7 MB compressed, about 6 times more memory.
- Fix: Use ASTC on mobile and BC on desktop. Vertex Animation Textures stay uncompressed by design. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Tips 2026: asset bloat and Project Auditor](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-1.html)

### AS03 Read/Write enabled on a texture or model
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: Read/Write keeps a CPU copy next to the GPU copy, doubling the asset's memory. It is required on meshes used by a Particle System Shape, a Terrain Detail Mesh, or a Mesh Collider, and on textures the CPU reads at runtime.
- Fix: Disable it unless the asset is one of those cases. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS04 Mipmaps on a Sprite or Editor GUI texture
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: The mip chain adds about 33% memory, and a sprite or GUI texture drawn near its native size never samples the smaller levels.
- Fix: Disable Generate Mipmaps on Sprite and Editor GUI textures, through the import preset for their folder. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS05 Model over the vertex budget
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: The model's meshes exceed `max_mesh_vertices` (default 65535) in total, which costs vertex processing in every pass that draws them and memory for every vertex attribute.
- Fix: Reduce the mesh at the source, and generate Mesh LOD at import for distant views. See [unity-rendering](../../unity-rendering/SKILL.md#platform-and-performance-levers).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS06 Optimize Mesh Data disabled
- Level: Info
- Scope: any
- When: -
- Files: ProjectSettings.asset
- Code: any
- Check: `stripUnusedMeshComponents:\s*0`
- Reason: Without it, the build keeps normals, tangents, colors, and extra UV sets that no shader in the build reads, which enlarges every vertex.
- Fix: Enable Optimize Mesh Data in Player Settings, and set Normals or Tangents to None on models whose shaders never read them.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS07 Long audio decompressed on load
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: The clip is longer than `long_audio_seconds` (default 10) and uses Decompress On Load, so its whole decoded PCM stays in memory.
- Fix: Stream music and long ambiences, and keep mid-length clips Compressed In Memory. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS08 Long audio stored as PCM
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: The clip is longer than `long_audio_seconds` and stored as PCM, which ships and loads it uncompressed.
- Fix: Use Vorbis (quality around 70 is a common start) or AAC; keep ADPCM for short sounds played often. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS09 Particle System with a high Max Particles
- Level: Warning
- Scope: any
- When: -
- Files: *.prefab, *.unity
- Code: any
- Check: `maxNumParticles:\s*([2-9]\d{3}|\d{5,})`
- Reason: The particle buffer is sized from Max Particles, and a fast-forward with `Simulate` costs more as the count grows. The default 1000 is serialized on every system, so the pattern starts at 2000.
- Fix: Cap Max Particles near what Emission actually produces. See [performance.md](../../unity-core/performance.md#particles).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS10 Particle collision enabled
- Level: Warning
- Scope: any
- When: -
- Files: *.prefab, *.unity
- Code: any
- Check: MANUAL
- Reason: World collision queries physics for each particle every frame. The Collision module is serialized even when disabled, so only reading its `enabled` value under `CollisionModule:` tells.
- Fix: Enable collision only on systems whose particles must visibly react, prefer Planes over World mode, and lower the collision quality.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS11 Animation compression off
- Level: Info
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: The model imports its clips with Anim. Compression Off, which keeps every keyframe and enlarges clip memory.
- Fix: Use Keyframe Reduction or Optimal, and check the motion on the characters that show artifacts. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS12 Addressables content holding reference cycles
- Level: Warning
- Scope: any
- When: addressables
- Files: *AddressableAssetsData/*.asset
- Code: any
- Check: MANUAL
- Reason: A reference cycle between assets loads as one unit, logs a warning, and fails the build beyond 64 MB.
- Fix: Break the cycles listed in `circularrefs.json`. See [assets.md](../../unity-core/assets.md#addressables).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS13 Sprite Atlas that does not match its unit of use
- Level: Warning
- Scope: any
- When: -
- Files: *.spriteatlasv2, *.spriteatlas
- Code: any
- Check: MANUAL
- Reason: Loading one sprite loads its whole atlas texture, so an atlas that packs sprites from several screens keeps all of them resident. Sprites drawn together but left out of an atlas break SpriteRenderer batching.
- Fix: Pack each atlas with the sprites one screen or one scene draws together, and give shared sprites an atlas of their own.
- Source: [Unity Performance Tuning Tips 2026: asset bloat and Project Auditor](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-1.html)

### AS14 Font asset atlas larger than 4096
- Level: Info
- Scope: any
- When: -
- Files: *.asset
- Code: any
- Check: `m_Atlas(Width|Height):\s*(8192|16384)`
- Reason: A font atlas this large takes GPU memory for glyphs most screens never show.
- Fix: Use dynamic font assets with an atlas of 2048 or less, and limit static character sets to the glyphs the game shows. See [unity-ui](../../unity-ui/SKILL.md#text).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS15 multi_compile in a project shader
- Level: Warning
- Scope: any
- When: -
- Files: *.shader, *.hlsl, *.cginc
- Code: any
- Check: `#pragma\s+multi_compile\b`
- Reason: Every `multi_compile` keyword doubles the variants built for the shader, which grows build size and the number of pipeline states to warm up. Fog and pipeline keywords legitimately use it.
- Fix: Use `shader_feature` for keywords a material chooses, declare keywords `_local`, limit stage-only keywords with the `_vertex` or `_fragment` forms, and strip unused variants. See [unity-rendering](../../unity-rendering/SKILL.md#shaders).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### AS16 Shader compile hitches during play
- Level: Critical
- Scope: any
- When: -
- Files: *.shader, *.shadergraph
- Code: any
- Check: MANUAL
- Reason: The first draw of a variant in a new render state compiles a pipeline state object, tens of milliseconds each on Vulkan and Metal. It shows as `Shader.CreateGPUProgram` on the main thread, or as `GpuProgramMetal.GetCachedPipeline` and `CreateGraphicsPipelineImpl` on the render thread.
- Fix: Trace a `GraphicsStateCollection` per Quality Level on the target device and warm it up progressively during loading. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Unity Performance Tuning Tips 2026: shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

### AS17 Shared asset split across Content Directory catalogs
- Level: Critical
- Scope: any
- When: addressables
- Files: *AddressableAssetsData/*.asset
- Code: any
- Check: MANUAL
- Reason: Each Catalog Id builds as one Content Directory and de-duplication works only within it, so two catalogs each carry their own copy of an asset they share, on disk and, loaded together, in memory.
- Fix: Give groups whose content shares dependencies the same Catalog Id. See [assets.md](../../unity-core/assets.md#addressables).
- Source: [Unity Performance Tuning Tips 2026: asset bloat and Project Auditor](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-1.html) for duplication; the per-catalog build comes from `ContentDirectoryGroupSchema.CatalogId` in Addressables 4.1

### AS18 No import automation
- Level: Info
- Scope: any
- When: -
- Files: *.cs, *.preset
- Code: any
- Check: ABSENT `:\s*(UnityEditor\.)?AssetPostprocessor\b|m_TargetType:`
- Reason: The project has no `AssetPostprocessor` and no Preset. Import settings then depend on whoever imported the asset, and wrong compression, oversized textures, and leftover data keep coming back.
- Fix: Add Presets with folder-based preset rules for fixed defaults, and an `AssetPostprocessor` where the setting depends on the asset. See [assets.md](../../unity-core/assets.md#import-settings).
- Source: [Unity Performance Tuning Tips 2026: asset bloat and Project Auditor](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-1.html)

### AS19 No asset check before the build
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: any
- Check: ABSENT `new\s+ProjectAuditor\s*\(|AssetRegulation`
- Reason: No code runs Project Auditor or an asset regulation test. Assets that arrive with their `.meta` skip import-time defaults, and duplication across builds or atlas grouping cannot be judged at import, so only a check before the build catches them.
- Fix: Run Project Auditor in CI, with `com.unity.project-auditor-rules` installed since the bundled core analyzes nothing without it, or add edit-mode tests on texture size, compression, and vertex count. Print the measured values in the build log. See [workflow.md](../../unity-core/workflow.md#testing).
- Source: [Unity Performance Tuning Tips 2026: asset bloat and Project Auditor](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-1.html)

### AS20 Shader warmup through ShaderVariantCollection
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bShaderVariantCollection\b`
- Reason: A `ShaderVariantCollection` records variants without render state, so its warmup cannot create the pipeline state objects that Vulkan and Metal compile on first draw; the hitch remains.
- Fix: Warm up with a `GraphicsStateCollection` traced on the target device. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Unity Performance Tuning Tips 2026: shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)
