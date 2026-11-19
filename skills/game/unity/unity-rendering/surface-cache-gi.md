# Surface Cache GI: tuning, content, debugging

Read this when tuning Surface Cache GI (SCGI), tiering it, or authoring
meshes, materials, and shaders for a scene it lights. The setup it requires
lives in the [Surface Cache GI](./SKILL.md#surface-cache-gi) section of the
skill. Facts here come from URP 17.7.

## Tune and tier it

The **Surface Cache Global Illumination** Volume override holds every setting except **Focus Target**, the GameObject the cascades center on (the active camera when unset), which the Volume component stores rather than its profile.

- Pick a **Quality** preset (Low, Medium, High, Ultra), which writes and overrides its values, then adjust. A new override shows Custom although its unoverridden values match Medium; changing or unticking a preset value turns it back to Custom.
- **State → Disabled** leaves opaque surfaces with no indirect light, with no fallback to baked lighting on devices that can run SCGI. It discards the camera's cache, and the SCGI world once no other camera still holds a cache, so enabling it again rebuilds the world and warms up the cache. To hide SCGI briefly, set **Intensity** to 0, which keeps the cache warm. Intensity and the Rendering Layer Mask below show only with Show Additional Properties.
- Fix **Volume → Resolution** and **Cascade Count** per tier, and set them only in the tier's profile: a scene Volume that ticks them, including through a Quality preset, which ticks Resolution, applies over the tier's value. Do not blend them between Volumes either: a change recreates that camera's cache, a hitch then a warm-up. A Quality Level switch to another URP asset recreates the renderer, so the SCGI world and every cache start over. **Size** can change per scene without a hitch.
- Each camera, Scene view cameras included, keeps its own cache, dropped when another camera runs SCGI two frames after its last render. An extra camera that renders the scene, such as a render-texture view, pays its camera passes and cache memory again, and one rendered on an interval warms up each time; render it through a renderer without the SCGI feature when it does not need GI.
- SCGI forces the depth, normals, and motion-vector inputs, so its cost includes those passes on a renderer that did not need them.

## Control what contributes

- Only Mesh Renderers, Terrains, and Entities Graphics instances add to bounce lighting. Skinned meshes and particle systems do not; give a moving light source a Mesh Renderer to carry its emission (see the next section).
- Transparent surfaces receive only the ambient probe, not SCGI.
- Inside a LOD Group, only the LOD set as the group's global illumination LOD (`LODGroup.globalIlluminationLOD`) contributes.
- The override's **Light Transport → Rendering Layer Mask** keeps a renderer when its Rendering Layer Mask intersects it. To exclude a renderer, leave it no layer that the override mask includes: a renderer that keeps Default still contributes while the mask includes Default.
- The same mask filters lights: a light whose Rendering Layers (its Shadow Layers when Custom Shadow Layers is on) miss it adds no bounce, so a mask narrowed off Default also drops lights left on Default. A light whose contribution a bake stored (`Light.bakingOutput.isBaked`) adds none either: keep SCGI lights Realtime. With several cameras, the world keeps the union of their masks, so a Volume that narrows the mask for one camera excludes nothing while another keeps it wide.
- Each change to a contributing renderer's transform updates the SCGI world. Exclude moving props whose bounce nobody notices, and move a contributing emissive renderer on an interval rather than every frame where its motion allows.

## Author materials and shaders

- SCGI reads albedo through the shader pass named `Meta`, which it finds by name rather than by its `LightMode` tag. A material without one bounces as a mid-grey fallback with no emission, and the Console logs an error naming it: give each custom shader that should bounce its own colour or light a pass named `Meta`.
- Emission counts only when the material's Global Illumination option includes **Realtime Indirect Emission** (`MaterialGlobalIlluminationFlags.RealtimeIndirectEmission`) and `EmissiveIsBlack` is clear; Realtime Direct Emission alone adds no bounce. A material with `_EmissionColor` and no texture in `_EmissionMap` (or a `_UseEmissiveMap` other than 1) is read from `_EmissionColor` directly; otherwise SCGI renders the Meta pass for emission too. Enforce the flag in the shader's custom inspector (`ShaderGUI.ValidateMaterial`) so material edits cannot clear it.
- SCGI evaluates the Meta pass on the material itself and ignores `MaterialPropertyBlock` and per-renderer values: a contributing renderer bounces the albedo and emission of its material, not its per-renderer variation. To vary an emitter at runtime, set the property on its material: give each independently varying emitter its own material, and change it on an interval, since each change renders its Meta pass again.
- A hand-written lit shader receives SCGI only when its forward and GBuffer passes declare `#pragma multi_compile_fragment _ _SCREEN_SPACE_IRRADIANCE` and take indirect light from `InitializeBakedGI`, filling `GIParams` as URP's `LitForwardPass.hlsl` does: `positionSS` (`positionCS.xy`) and `isSurfaceTypeTransparent` drive SCGI, and the normal, position, view direction, lightmap UVs, and vertex SH keep transparent surfaces and devices without SCGI correct. Otherwise it keeps sampling lightmaps, APV, or the ambient probe. URP's Lit, Simple Lit, and Shader Graph Lit shaders already do.
- An invisible light source (a glowing particle cloud, a fake bounce) is a Mesh Renderer whose shader has only a `Meta` pass: URP never draws that pass, while SCGI reads it. Keep the renderer enabled and the GameObject active, or SCGI drops it.

## Debug

- Open Window → Analysis → Rendering Debugger → **Surface Cache**. Its view modes show cell indices, stable and fast irradiance, coefficient of variation, standard deviation, drift, update counts, and flat normals. Once a view mode is picked, it also shows the active cache count and the World Rendering Layer Mask, the union of every camera's mask.
- In the Scene view, turn on **Always Refresh** to see SCGI update while editing.
