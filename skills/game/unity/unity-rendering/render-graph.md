# Render Graph: tile memory, pass types, the final blit

Read this when writing or reviewing a custom Render Graph pass. On the
tile-based GPUs of mobile devices, the traffic between on-chip tile memory and
main memory dominates GPU cost, power, and heat. Render Graph removes most of it
only when each pass declares its resource use correctly, because it infers load
and store actions, pass merging, and memoryless storage from those declarations.
[Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/kiyohara-takayuki-1.html)

## Declare attachments for tile memory

Each attachment costs a load when its previous content is read and a store when
its result is used later. At 1080p, one load or store of an RGBA8 target moves
about 8 MB per frame. Work in this order: remove useless loads and stores, merge
passes, read through framebuffer fetch, then let buffers become memoryless.

- Declare a color target that the pass overwrites entirely with `AccessFlags.WriteAll`. Plain `Write` assumes a partial write and loads the previous content.
- Read the same pixel of an earlier pass with `builder.SetInputAttachment(handle, index)` and `LOAD_FRAMEBUFFER_X_INPUT` in the shader, not `UseTexture`, which forces a store and splits the native pass. Effects that read neighbouring pixels (blur, bloom, distortion) cannot use it; decide when designing the effect.
- Keep intermediate textures out of global scope. `SetGlobalTextureAfterPass` hides their use from Render Graph and always stores them.
- Prefer `renderGraph.CreateTexture`. For an imported `RTHandle` regenerated every frame, pass `ImportResourceParams { clearOnFirstUse = true, discardOnLastUse = true }`, or Render Graph loads and stores it conservatively.
- Build intermediate descriptors from `renderGraph.GetTextureDesc(cameraColor)` so resolution and MSAA sample count match: passes merge only with the same attachment size and sample count, at most eight attachments, raster passes only, and no `UseTexture` read of the previous pass's output.
- Mark a buffer meant to live only in tile memory with `desc.memoryless = RenderTextureMemoryless.Color` (or `Depth`). An accidental later read then fails loudly instead of quietly costing memory and bandwidth.
- Turn off the URP Depth Texture when nothing samples `_CameraDepthTexture`: the depth copy stores depth and splits the opaque and transparent passes.
- With MSAA, keep the multisampled color memoryless with a Resolve store and the multisampled depth memoryless with no store. A custom pass that reads the MSAA buffer as a texture breaks that layout.

Verify every change in the **Render Graph Viewer**: intermediate buffers show a
DontCare store, merged passes share one native pass, and Memoryless reads yes.
When passes do not merge, read its Pass Break Reasoning first. Merging happens
only on Vulkan and Metal, so switch the Editor to Vulkan or attach the Viewer to
a device build; framebuffer fetch falls back silently to a texture read where
the platform lacks it, so measure bandwidth on device.

## Choose the pass type

[Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zhang-yubing-1.html)

Use `AddRasterRenderPass` for drawing and `AddComputePass` for compute. Reach
for `AddUnsafePass` only for:

- APIs the raster and compute command buffers lack: `SetRenderTarget` with mip, slice, or explicit load and store, `CopyTexture` on sub-regions, `GenerateMips`, `SetRandomWriteTarget`, `RequestAsyncReadback`;
- code that needs a real `CommandBuffer` whose commands are unknown when recording, such as a third-party SDK;
- a chain of passes that can never merge, such as a ping-pong blur or a bloom mip pyramid, collapsed into one pass to save the per-pass Render Graph CPU cost (about 2 µs each).

An unsafe pass never merges with its neighbours, so placing one between mergeable
raster passes splits the native pass. Inside it:

- Declare every texture it touches, render targets included, with `builder.UseTexture(handle, flags)`. `SetRenderTarget` alone registers no dependency.
- Pass explicit `RenderBufferLoadAction` and `RenderBufferStoreAction` to every `SetRenderTarget`: the short overload loads and stores. DontCare on load when the pass overwrites everything, Store only when a later pass reads the result.

## Skip the final blit

[Chapter](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zhang-yubing-2.html)

A custom pass injected at or after `AfterRenderingPostProcessing` makes URP add
FinalBlitPass, one more full-screen copy to the back buffer. When the custom
pass is the last full-screen step of the last camera
(`cameraData.resolveFinalTarget`), write straight to the back buffer:

1. Read `resourceData.activeColorTexture` as the source.
2. Call `resourceData.SwitchActiveTexturesToBackbuffer()`; `activeColorTexture` now returns the back buffer.
3. Declare `SetRenderAttachment(backBuffer, 0, AccessFlags.WriteAll)` and `UseTexture(source, AccessFlags.Read)`.

The pass then owns what FinalBlitPass did:

- Flip Y when `context.GetTextureUVOrigin(source)` differs from that of the target, inside the render function; `SystemInfo.graphicsUVStartsAtTop` describes the API, not this blit.
- Convert to sRGB when `cameraData.targetTexture == null && Display.main.requiresSrgbBlitToBackbuffer`, through the `_LINEAR_TO_SRGB_CONVERSION` keyword.
- Set the viewport when it is not full screen, and handle HDR output and overlay UI when the game uses them.

No later pass may read `activeColorTexture` or `activeDepthTexture`: the back
buffer is write-only.
