# Surface Cache GI: tuning, content, debugging

Read this when tuning Surface Cache GI (SCGI), tiering it, or authoring
meshes, materials, and shaders for a scene it lights. The setup it requires
lives in the [Surface Cache GI](./SKILL.md#surface-cache-gi) section of the
skill. Facts here come from URP 17.7.

## Tune and tier it

The **Surface Cache Global Illumination** Volume override holds every setting.

- Pick a **Quality** preset (Low, Medium, High, Ultra), which writes and overrides its values, then adjust. A new override shows Custom although its unoverridden values match Medium; changing or unticking a preset value turns it back to Custom.
- **State → Disabled** leaves opaque surfaces with no indirect light, with no fallback to baked lighting on devices that can run SCGI. It discards the camera's cache, and once no camera runs SCGI the SCGI world too, so enabling it again rebuilds the world and warms up the cache. To hide SCGI briefly, set **Intensity** to 0, which keeps the cache warm. Intensity and the Rendering Layer Mask below show only with Show Additional Properties.
- Fix **Volume → Resolution** and **Cascade Count** per tier, and do not blend them between Volumes: a change recreates that camera's cache, a hitch then a warm-up. A Quality Level switch to another URP asset recreates the renderer, so the SCGI world and every cache start over. **Size** can change per scene without a hitch.
- Each camera, Scene view cameras included, keeps its own cache, dropped after two frames without rendering. An extra camera that renders the scene, such as a render-texture view, pays its camera passes and cache memory again, and one rendered on an interval warms up each time; render it through a renderer without the SCGI feature when it does not need GI.
- SCGI forces the depth, normals, and motion-vector inputs, so its cost includes those passes on a renderer that did not need them.

## Control what contributes

- Only Mesh Renderers, Terrains, and Entities Graphics instances add to bounce lighting. Skinned meshes and particle systems do not; give a moving light source a Mesh Renderer to carry its emission (see the next section).
- Transparent surfaces are not in the cache and receive only the ambient probe.
- Inside a LOD Group, only the LOD set as the group's global illumination LOD (`LODGroup.globalIlluminationLOD`) contributes.
- The override's **Light Transport → Rendering Layer Mask** keeps a renderer when its Rendering Layer Mask intersects it. To exclude renderers, narrow the override mask to the layers that should contribute, and put excluded renderers on a layer outside it only: a renderer that keeps Default still contributes.
- The same mask filters lights: a light whose Rendering Layer Mask misses it adds no bounce. A light whose contribution a bake stored (`Light.bakingOutput.isBaked`) adds none either: keep SCGI lights Realtime. With several cameras, the world keeps the union of their masks, so a Volume that narrows the mask for one camera excludes nothing while another keeps it wide.
- Each change to a contributing renderer's transform updates the SCGI world. Exclude moving props whose bounce nobody notices, and move a contributing emissive renderer on an interval rather than every frame where its motion allows.

## Author materials and shaders

- SCGI reads albedo through the material's **Meta** pass. A material without one bounces as a mid-grey fallback with no emission, and the Console logs an error naming it: give each custom shader that should bounce its own colour or light a Meta pass.
- Emission counts only when the material's global illumination flag is **Realtime** (`MaterialGlobalIlluminationFlags.RealtimeIndirectEmission`) and `EmissiveIsBlack` is clear. A material with `_EmissionColor` and no texture assigned to `_EmissionMap` is read from `_EmissionColor` directly; otherwise SCGI renders the Meta pass for emission too. Enforce the flag in the shader's custom inspector (`ShaderGUI.ValidateMaterial`) so material edits cannot clear it.
- SCGI evaluates the Meta pass on the material itself and ignores `MaterialPropertyBlock` and per-renderer values. To vary an emitter at runtime, set the property on its material: give each independently varying emitter its own material, and change it on an interval, since each change renders its Meta pass again.
- An invisible light source (a glowing particle cloud, a fake bounce) is a Mesh Renderer whose shader has only a Meta pass: URP never draws that pass, while SCGI reads it. Keep the renderer enabled and the GameObject active, or SCGI drops it.

## Debug

- Open Window → Analysis → Rendering Debugger → **Surface Cache**. Its view modes show cell indices, stable and fast irradiance, variance, drift, update counts, and flat normals. Once a view mode is picked, it also shows the active cache count and the World Rendering Layer Mask, the union of every camera's mask.
- In the Scene view, turn on **Always Refresh** to see SCGI update while editing.
