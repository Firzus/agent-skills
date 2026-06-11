# Engine mapping — Unity 6 (URP/HDRP) & UE5

Concrete node/pass/API names and gotchas for shipping the NPR look. Version
flags inline. Engine-wide practice: `unity6-aaa-best-practices` /
`ue5-aaa-best-practices`.

## Unity 6 — URP

### Toon lighting

- Two routes: a **Custom Function node** (File mode → `.hlsl`) inside a
  Lit/Unlit Shader Graph, or a **handwritten HLSL** shader with `HLSLPROGRAM`.
  Custom Function gives graph authoring; handwritten gives full pass/keyword
  control.
- Include `.../ShaderLibrary/Lighting.hlsl`. Main light:
  `Light GetMainLight(float4 shadowCoord)` → `.direction`, `.color`,
  `.distanceAttenuation`, `.shadowAttenuation`. For toon: `NdotL = dot(N,
  light.direction)` → remap through ramp/step → `× light.color × shadowAttenuation`.
- **Shadow coord**: `TransformWorldToShadowCoord(positionWS)`; under
  `SHADOWS_SCREEN`, use `ComputeScreenPos(...)`.
- **Keywords (declare or no shadows in builds)**: `_MAIN_LIGHT_SHADOWS`,
  `_MAIN_LIGHT_SHADOWS_CASCADE`, `_MAIN_LIGHT_SHADOWS_SCREEN`,
  `_ADDITIONAL_LIGHT_SHADOWS`.
- **Forward+ gotcha**: `GetAdditionalLightsCount()` returns **0** under Forward+
  (Unity 6's default lean) — iterate via the Forward+ light loop macros
  (`LIGHT_LOOP_BEGIN`/`END`) instead.
- **Preview gotcha**: guard `SHADERGRAPH_PREVIEW` (no light data in preview);
  provide both `_float` and `_half` variants.

### Inverted-hull outline

- **Per-material second pass**: `Pass { Name "Outline" Cull Front ZWrite On
  ZTest LEqual }` before the forward pass; vertex extrudes
  `positionOS += normal * _OutlineThickness` (or scale by `clipPos.w` for screen-
  constant width); fragment outputs flat color.
- **Renderer Feature route**: **Render Objects** with an Override Material + layer
  mask at `RenderPassEvent.AfterRenderingOpaques`; selection by `ShaderTagId`.
- **Render Graph (version flag)**: Unity 6.0 supports it; **6.1 makes it the only
  way** (Compatibility Mode removed by default). Build renderer lists with
  `renderGraph.CreateRendererList(...)`, `builder.UseRendererList(...)`, draw via
  `cmd.DrawRendererList(...)` in `RecordRenderGraph`/`SetRenderFunc`. Can't swap
  attachments mid-pass.

### Post-process edge

- **Full Screen Pass Renderer Feature** + a Fullscreen Shader Graph doing Sobel
  on depth + normals (enable the Depth/DepthNormals prepass → `_CameraDepthTexture`,
  `_CameraNormalsTexture`).
- **Gotcha**: Render Graph unbinds global textures at frame end; objects sampling
  them must render in a later event, or you get artifacts.

### Control maps & smoothed normals

- Sample ramp/ILM/face-SDF in Shader Graph; set control maps **sRGB off, Clamp,
  no mips, Point/Bilinear**.
- Bake **angle-weighted averaged normals** (merge-by-distance first) into vColor
  RGB (`*0.5+0.5`, **linear** export), tangent, or UV3/UV8 via an
  `AssetPostprocessor`/`OnPostprocessModel`. Shader Graph only exposes UV0–UV3 →
  vColor or UV3 is most graph-friendly.
- Tools (name only): `danbaidong1111/SmoothNormal`, `DumoeDss/AquaSmoothNormals`
  (UV8), `JasonMa0012/OutlineNormalSmoother` (vColor), `Teeinn0730/AnimeToonShader`
  (UV4 + Face SDF).

## Unity 6 — HDRP

- No clean shading-model hook like URP; toon is done via the **Custom Pass**
  framework on a Custom Pass Volume (built-in **FullScreen**, **DrawRenderers**,
  **ObjectID**, plus scripted `CustomPass`).
- Typical toon-outline = a **DrawRenderers** pass into a custom `outlineBuffer`,
  then a **FullScreen** pass edge-detecting and `CoreUtils.DrawFullScreen`.
- **Why toon is harder in HDRP**:
  - Can't read+write the same target → ping-pong through a secondary buffer.
  - Injection-point pitfalls: at *Before Post Process* the color pyramid lacks
    later effects; `CustomPassSampleCameraColor` returns black at *Before
    Rendering*.
  - Depth buffer is **jittered under TAA** → wobble for after-post objects.
  - Dynamic resolution: scale UVs by `_RTHandleScale.xy` when sampling RTHandles.
  - PBR deferred + GI fights flat banding — most teams accept the heavier
    custom-pass plumbing or modify HDRP source.

## Unreal Engine 5 (5.4+)

### Three NPR routes

**A) Unlit + Post-Process Material (no engine build)**
- Material Domain = Post Process; **Blendable Location** matters: *Before
  Tonemapping* for color-correct work, *After/Replacing Tonemapper* for exact
  final pixels. Read GBuffer via **SceneTexture**: `SceneDepth`, `WorldNormal`
  (index **8**), `CustomDepth`, `CustomStencil`, `PostProcessInput0`.
- **Custom Depth/Stencil**: *Project Settings → Rendering → Custom Depth-Stencil
  Pass = Enabled with Stencil*; per-component Render CustomDepth + a Stencil
  Value; mask by comparing stencil to a `StencilID` param.
- **Banding**: `NdotL = dot(WorldNormal, LightDir)` → quantize with step/floor or
  a 1D ramp lookup (256×1, NdotL as UV).
- **Outline**: Sobel on `SceneDepth` (silhouettes) + `WorldNormal` (creases).

**B) True custom shading model (engine source)**
- Add an enum to `EMaterialShadingModel` (`EngineTypes.h`), register
  (`MaterialExpressionShadingModel.h`), wire `HLSLMaterialTranslator::
  GetMaterialEnvironment()`. **UE5-specific**: GBuffer encode/decode is
  code-generated in `ShaderGenerationUtil.cpp` — add `FETCH_COMPILE_BOOL(...)` in
  `ApplyFetchEnvironment` and register slots in `DetermineUsedMaterialSlots`.
  Shading logic in `ShadingModelsMaterial.ush`. CustomData pins carry Cel Bands /
  Outline Thickness.
- **Pro**: works for point/spot lights automatically; banded **received** shadows
  possible. **Con**: maintain a fork; UE5 GBuffer codegen broke many UE4 ports.

**C) Post-process light-vector trick (unlit)**
- Feed the light direction into the material: a **Material Parameter Collection**
  set from a Blueprint reading `DirectionalLight→GetForwardVector`, **or** the
  `SkyAtmosphereLightDirection` node (the legacy `AtmosphericLightVector` is
  deprecated). Then `dot(LightVector, VertexNormalWS)` → contrast/clamp → lerp
  into **Emissive**.

### Inverted-hull outline

- **Overlay Material (5.1+)**: assign an outline material to a MeshComponent's
  **Overlay Material** slot → renders the mesh a second time, no duplicate
  actor/AnimBP. Material: **Two Sided**, **Masked**, **Unlit**;
  `VertexNormalWS * Thickness → World Position Offset`;
  `TwoSidedSign * −1 → Opacity Mask` to discard front faces (leave the back
  shell). Emissive = outline color.
- **Gotchas**: `TwoSidedSign` adds pixel cost; **skeletal meshes can't reverse-
  cull in-engine** (must flip normals in DCC; Static Mesh has Reverse Culling).
  Use smoothed/all-smooth normals to avoid hard-edge gaps. May need WPO + Pixel
  Depth Offset to avoid z-fighting. Output **velocity** for TSR.

### Toon shadow, ShadowTerminator, Lumen/Nanite

- **Banded received light** needs real lighting → only the **custom shading
  model** path can quantize *cast* shadows; a material-graph cel only bands the
  material's own `NdotL`.
- **Shadow Terminator artifact**: harsh diagonal self-shadow on low-poly/
  interpolated normals — mitigate with smoother normals, more tessellation,
  `r.Shadow.NormalOffset` tuning, or transmission-based self-shadow suppression
  (a "virtual shell" around convex faces, used by `UE_CelLit` for faces).
- **Contact Shadows**: per-light Contact Shadow Length > 0 ray-marches depth for
  crisp contact lines.
- **Lumen**: GI/reflections reintroduce smooth gradients fighting flat cels —
  cut indirect intensity, or use a Lumen-aware approach (MooaToon exposes GI/
  reflection blend controls and works with Lumen + Virtual Shadow Maps).
- **Nanite (version caveat)**: Nanite historically **doesn't write Custom Depth/
  Stencil**, breaking stencil/post outlines on Nanite meshes — workaround:
  encode edge IDs in the specular channel (per-face pseudo-random) for ID-based
  edge detection. Support is improving across 5.x — **verify on your exact build**.

### Notable projects (factual, no install commands)

- `miltoncandelero/ue5-toon-shader-plugin` — Lumen+Nanite-compatible unlit
  approach; documents the Nanite custom-depth limitation.
- `JasonMa0012/MooaToon` — large engine-integrated plugin; Lumen/VSM/RT aware,
  ramp/face-SDF, back-face + screen-space outlines, smooth-normal baker.
- `realAYAYA/UnrealEngine-ToonLit` — engine fork adding a `ToonLit` model.
- `ashtonland/Unreal-Engine-Cel-Shading`, `shjh3117/UE_CelLit` — source forks /
  shading models with cel bands, self-shadow, face SDF.

## Mapping table

| Concern | Unity 6 URP | Unity 6 HDRP | UE5 (5.4+) |
| --- | --- | --- | --- |
| Main light dir/color | `GetMainLight()` | custom pass buffers | `SkyAtmosphereLightDirection` / DirLight→MPC |
| Shadow attenuation | `GetMainLight(shadowCoord).shadowAttenuation` + `_MAIN_LIGHT_SHADOWS*` | custom pass (TAA-jittered) | engine shadows (shading-model path) |
| Additional lights | `GetAdditionalLight()` (Forward+ loop; count=0) | HDRP lighting | auto in custom shading model |
| Flat banding | ramp/SDF sample in Shader Graph/HLSL | fullscreen custom pass | ramp/step in material, or CustomData bands |
| Inverted-hull outline | 2nd pass `Cull Front` + smoothed-normal extrude / Render Objects | DrawRenderers custom pass | **Overlay Material** + `WPO=Normal·Thickness` + `TwoSidedSign·−1→OpacityMask` |
| Post-process outline | Full Screen Pass, Sobel on depth/normals | FullScreen pass + `_RTHandleScale` | `SceneDepth`/`WorldNormal(8)`/`CustomStencil` edge detect |
| Smoothed normals | bake to vColor / UV3(/UV8) via AssetPostprocessor | same | bake to vColor, or all-smooth hull mesh |
| Deep customization | URP source mod | HDRP custom pass / source | custom **shading model** (GBuffer codegen) |
| GI fights cels | URP easy to flatten | hardest (PBR deferred) | Lumen/Nanite caveats; cut indirect or Lumen-aware plugin |

## Version-specific / uncertain flags

- **URP Render Graph mandatory in Unity 6.1** (Compatibility Mode removed); 6.0
  still allows the old path.
- **Forward+** → `GetAdditionalLightsCount()` returns 0; use the Forward+ loop.
- **UE Overlay Material** is **5.1+**; custom-shading-model pins shifted
  (Tangent = Shadow Color since 5.5, ClearCoat before).
- **UE `AtmosphericLightVector`** deprecated → use `SkyAtmosphereLightDirection`.
- **Nanite Custom Depth/Stencil** historically unsupported → outline workarounds;
  evolving across 5.x — **verify per exact version**.
- **HDRP** depth jitter under TAA and read/write-same-target are persistent.

## Sources

- **Unity Manual (6000.x)**: custom lighting intro, *Use lighting / Use shadows
  in a custom URP shader*, *Draw objects in the render graph*; **HDRP Custom
  Pass** (Creating / Scripting / FullScreen).
- **Unity-Technologies/ShaderGraph-Custom-Lighting**; **Cyanilux** *Custom
  Renderer Features*; **NedMakesGames**; **Duncan Readle** *Smooth Mesh Outlines*.
- **Epic Dev Community**: *New shading models / changing the GBuffer*, *Custom
  Stencil bypass postprocessing*, *Overlay Materials for Outlines*, *Contact
  Shadows*; **Epic Games Japan — "Stylized Rendering Insights from Japan,"
  Unreal Fest 2023** (Overlay Material, smooth-normal & reverse-cull caveats).
- **markjg.com** *Porting custom shading models to UE5*; UE forums *Edge
  Detection via World Normals*, *UE5 Anime/Toon Shading Model*.
- Projects: miltoncandelero, MooaToon, realAYAYA/UnrealEngine-ToonLit,
  ashtonland, UE_CelLit; SmoothNormal / AquaSmoothNormals / OutlineNormalSmoother
  / AnimeToonShader.
