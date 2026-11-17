# Rules: shaders

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

## Shader warmup

### SH01 Warmup through ShaderVariantCollection
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: any
- Check: `\bShaderVariantCollection\b|\bWarmupAllShaders\s*\(`
- Reason: A ShaderVariantCollection records no render state, so its warmup only creates GPU programs; on Metal, Vulkan, and Direct3D 12 the driver still compiles a pipeline state object at first draw, observed at tens of milliseconds each on Vulkan Android.
- Fix: Trace and warm up with `GraphicsStateCollection`. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

### SH02 Warmup in one call
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.WarmUp\s*\(`
- Reason: `WarmUp` compiles every recorded state at once, a spike as long as the whole collection.
- Fix: Call `WarmUpProgressively` with a small count per loading frame. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

### SH03 Warmup loop ends on isWarmedUp
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\bisWarmedUp\b`
- Reason: A warmup error can leave `isWarmedUp` false forever, so a loop waiting on it never ends and the loading screen hangs.
- Fix: End the loop when the requested count reaches `totalGraphicsStateCount`. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

### SH04 Collection metadata rewritten
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: any
- Check: `\.(graphicsDeviceType|runtimePlatform|qualityLevelName)\s*=[^=]`
- Reason: Pipeline states differ per graphics API and platform, so a collection traced elsewhere stays wrong after its metadata is rewritten; the warmup then misses states and only logs a mismatch warning.
- Fix: Rewrite metadata only to restore device values an Editor script overwrote, or to rename the Quality Level when no PSO-relevant setting or shader varies by level; otherwise retrace on the target device. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

### SH05 Shader split across Content Directory catalogs on iOS
- Level: Warning
- Scope: any
- When: ios,addressables
- Files: *AssetGroups/*.asset
- Code: any
- Check: MANUAL
- Reason: On Metal, a shader built into separately built content loads as several instances (measured outside Content Directories; confirm it applies to the project's catalogs), and the warmup covers only the one the collection names; the others compile at first draw with no error, showing as `GpuProgramMetal.GetCachedPipeline` without `Shader.CreateGPUProgram`.
- Fix: Keep shared shaders under one Catalog Id, and check the Addressables Report for shaders that appear in several Content Directories. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

### SH06 Subpass shaders on iOS
- Level: Warning
- Scope: any
- When: ios
- Files: *.cs, *.asset
- Code: runtime
- Check: `SetInputAttachment\s*\(|m_RenderingMode:\s*[13]\b`
- Reason: On Metal, warmup produced the wrong pipeline state for shaders drawn inside a merged native pass, such as framebuffer-fetch passes and the URP Deferred G-buffer and lighting passes, so they still compiled during play with no error. Whether a Unity 7 release fixes this is unknown.
- Fix: Look for `GpuProgramMetal.GetCachedPipeline` on the render thread during play; if present, draw those shaders once during loading to fill the pipeline cache, or keep them out of subpasses. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

### SH08 Trace that skips Quality Levels
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: any
- Check: `\.BeginTrace\s*\(`
- Reason: MSAA and HDR change the pipeline state, so a collection traced under one Quality Level misses the states of the others.
- Fix: Trace once per Quality Level on the target device, save one file per level, and load the one matching the current level. See [unity-rendering](../../unity-rendering/SKILL.md#shader-warmup).
- Source: [Shader warmup with GraphicsStateCollection](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/amano-takuro-1.html)

## Shader code

### SH09 Transcendental functions in a mobile fragment shader
- Level: Warning
- Scope: any
- When: android|ios
- Files: *.shader, *.hlsl, *.cginc
- Code: any
- Check: `\b(sin|cos|tan|asin|acos|atan|atan2|exp|exp2|pow|log|log2|log10)\s*\(`
- Reason: Each call expands into many instructions and raises register pressure; `tan` and `atan` cost the most. In a full-screen URP benchmark, the first `sin` added 0.25 ms on iPhone 15 Pro and 0.5 ms on iPhone X and Galaxy S9, and each further call about 0.1 ms on iPhone 15 Pro and about 0.6 ms on iPhone X from the fifth call on.
- Fix: In fragment code, cut the calls, and in hot loops with a bounded input use the `sin` and `tan` approximations. See [unity-rendering](../../unity-rendering/SKILL.md#shaders).
- Source: [Mobile shader optimization: measuring and lightening transcendental functions](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/nagatome-ryouhei-1.html)

### SH12 pow with a property as exponent
- Level: Info
- Scope: any
- When: -
- Files: *.shader, *.hlsl, *.cginc
- Code: any
- Check: `\bpow\s*\(.+,\s*_\w+`
- Reason: An exponent read from a property forces the general `pow` path; a literal exponent lets the compiler fold `pow(x, 2)` into `x * x`.
- Fix: When the exponent never changes at runtime, write it as a literal or as multiplications.
- Source: [Mobile shader optimization: measuring and lightening transcendental functions](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/nagatome-ryouhei-1.html)

### SH13 Global value in UnityPerMaterial
- Level: Warning
- Scope: any
- When: urp
- Files: *.shader, *.hlsl
- Code: any
- Check: `CBUFFER_START\s*\(\s*UnityPerMaterial\s*\)`
- Reason: The SRP Batcher needs `UnityPerMaterial` to hold only per-material values; a value set through `Shader.SetGlobal*` but declared there breaks the shader's SRP Batcher compatibility.
- Fix: Confirm no member of the buffer is set globally, and declare global values outside it. See [unity-rendering](../../unity-rendering/SKILL.md#shaders).
- Source: [Mobile shader optimization: measuring and lightening transcendental functions](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/nagatome-ryouhei-1.html)
