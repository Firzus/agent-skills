# Rendering tech — virtual geometry, virtual texturing, GPU-driven, IO

The sub-cell streaming frontier. The core overview treats the **cell** as the
streaming atom; this layer operates *below* it, streaming **clusters,
texture tiles, and geometry pages** driven by GPU feedback. It attacks the
same three cost terms in the core invariant —
`lookahead ≥ speed × (t_io + t_decompress + t_activate) + margin` — but
pushes the residency decision onto the GPU. Think of it as a second, finer
streaming loop nested inside each resident cell. `[?]` = version-specific/
verify against primary sources.

## Virtualized geometry (Nanite & lineage)

Nanite is a **virtual-memory system for triangles** — the geometry analog
of virtual texturing, GPU-driven end-to-end:

- **Clusters (meshlets)**: meshes split into ~128-triangle clusters (the
  unit of culling, LOD, and rasterization), grouped and decimated into a
  **DAG/BVH** per mesh (parents = simplified children, with locked group
  boundaries so adjacent LODs never crack).
- **Per-cluster LOD (runtime)**: traverse the BVH on GPU, test HZB
  visibility + screen-space projected error, pick a **"cut" of the DAG** so
  every drawn triangle is ~pixel-sized (different parts of one mesh at
  different LODs).
- **Culling**: two-pass frustum + **occlusion against last frame's Hi-Z**,
  in a GPU persistent-threads job system.
- **Rasterization (hybrid)**: large triangles → hardware; sub-pixel
  triangles → a **software rasterizer in compute** (avoids the 2×2-quad
  inefficiency that kills HW rasterizers on tiny triangles). Writes a
  **visibility buffer** (64-bit/pixel: depth + cluster ID + triangle ID);
  material shading is **deferred**, only on visible pixels → near-zero
  overdraw, all opaque geometry in **1 DrawIndirect**.
- **Streaming the geometry ("geometry pages")**: clusters packed into
  **fixed-size 128 KB pages** by locality + LOD; the **streaming unit is a
  cluster *group*** (replaced exactly by its parents — finer is incorrect,
  it cracks the mesh). **Root pages** (~32 KB/mesh) are always resident; the
  rest stream on demand from feedback (the same pattern as virtual
  texturing). A **fixed streaming pool** (`r.Nanite.Streaming.StreamingPoolSize`
  default 512 MB, 2 GB DX12 buffer cap) — too many unique meshes forces a
  smaller pool and risks **cache thrashing where streaming never settles
  even for a static view** (the sub-cell analog of unload-thrash). `[?]`
- **Cost model**: helps with huge triangle counts, many instances, small
  triangles, high draw-call scenes (the visibility pass is near-fixed GPU
  cost regardless of source tri count). Hurts with masked/alpha-tested
  materials (force the HW path + overdraw), WPO, translucency (unsupported →
  non-Nanite fallback), and tiny scenes (fixed overhead). Enabling Nanite
  adds overhead even to non-Nanite meshes → make most meshes Nanite or none.

→ Nanite is a per-cell **t_activate eliminator** (GPU visibility pass,
minimal CPU/actor cost — directly attacking the "~500 raw actors = hitch"
problem) *plus* its own nested IO loop with its own fixed memory budget.

## Virtual texturing

The texture-streaming frontier — one giant virtual address space mapped to
a small fixed **physical page cache** (id Tech 5 / Rage MegaTexture, up to
128k×128k):

- **Three parts**: a **page table / indirection texture** (virtual page →
  physical cache location + resident mip); a **feedback buffer** (the scene
  rendered to a low-res target recording *which virtual pages + mips* were
  sampled — the GPU telling the CPU what it needs); a **page manager**
  (reads feedback, streams missing tiles into the fixed cache). GPU memory
  stays **bounded regardless of world size**.
- **UE flavors**: **Runtime Virtual Texturing (RVT)** caches GPU-generated
  texel data (composited landscape/decal shader output — evaluate the
  expensive material once over an area); **Streaming Virtual Texturing
  (SVT)** streams cooked texels from disk (large artist textures, VT
  lightmaps). The GPU feedback loop has **several frames of latency**
  (request fed back → CPU loads → uploaded for *subsequent* frames).
- **Hardware substrate**: DX12 **reserved resources** / Vulkan **sparse
  residency** — a resource decoupled from backing memory with partial mip
  residency; the shader can query a **residency code** to know if a fetch
  hit resident data.
- **Failure — "blurry textures forever"**: feedback never requests / the
  pool is too small / uploads are throttled → high mips never arrive. The
  texture analog of pop-in; **prestreaming** (record desired page IDs per
  frame, pre-feed them) is the fix — velocity prediction for tiles.

→ VT is the **texture-memory budget** as a fixed physical cache, paralleling
the cell memory budget; feedback latency is a hidden term in `t_activate`.

## GPU-driven rendering & culling

"Draw everything, let the GPU cull" — the CPU stops issuing per-object
draws:

- **Indirect draw** (`ExecuteIndirect` / `MultiDrawIndexedInstancedIndirect`)
  consumes draw args from a GPU buffer a compute shader wrote (cull per
  object, append survivors) → ~O(1) CPU draw cost.
- **GPU culling stack**: frustum + **two-phase occlusion via a Hi-Z depth
  pyramid** (Aaltonen, AC Unity, SIGGRAPH 2015 — no separate proxy pass,
  reprojected from last frame's depth).
- **Mesh shaders** (amplification + mesh emitting meshlets, per-meshlet cull
  in the workgroup) are the HW-native cousin of Nanite's cluster model;
  **bindless resources** (global descriptor arrays) are the prerequisite for
  merging everything into a few mega-draws (Doom Eternal).
- **Interaction with streaming (critical)**: GPU-driven rendering can
  **only draw what's resident** — the GPU must *know* residency. Drawing a
  non-resident handle = corruption. So GPU culling and the streaming
  feedback systems are coupled: the same pass that requests Nanite pages /
  VT tiles also gates what the indirect draw can legally reference.

→ This drives `t_activate → ~0` at the rendering layer (draw submission
stops being per-actor CPU work) — but *requires* the residency truth to live
on the GPU, which is exactly what the sub-cell loops above feed.

## IO & storage (the DirectStorage era)

The `t_io / t_decompress` tier — extends the core overview's IO throughput
table:

- **DirectStorage** (PC/Xbox): bypasses the kernel IO stack (batched IO via
  IORing, tens of thousands of IOPS) and adds **GPU decompression with
  GDeflate** (a DEFLATE variant split into 64 KiB tiles, each decompressed
  by a GPU wave → "bandwidth amplification", CPU stays free). Caveat:
  GDeflate is *slow* on CPU — use LZ4/ZSTD for CPU-only resources.
- **PS5 IO complex**: 5.5 GB/s raw (~8–9 GB/s compressed), **dedicated
  hardware decompression** (Kraken/Oodle ≈ 9 Zen 2 cores offloaded), **six
  priority levels** (a hardware version of the per-cell priority queue), and
  **cache scrubbers** (pinpoint GPU cache evictions when the SSD overwrites
  memory — the hardware answer to "don't flush everything when one cell
  changes"). `[?]` 17.38 GB/s is a marketing peak; 8–9 GB/s is realistic.
- **NVMe kills the seek penalty** — a 2 GB load goes ~40 s (HDD) → ~0.27 s
  (5.5 GB/s), obsoleting the old data-duplication-to-kill-seeks packaging
  trick. **Packaging**: pack files in load order (`.ucas`/`.utoc` IoStore),
  loose for dev / packed for ship, chunked for modular install/patching.
- **The decompression bottleneck moved to the GPU** — the CPU is no longer
  the streaming wall; the new walls are GPU decompress time + residency-
  feedback latency.

→ Extends the IO tiers (HDD 25 MB/s → SATA 0.5 GB/s → **NVMe 5.5+ GB/s raw,
8–17 GB/s effective**); the IO term collapsed and decompression moved to the
GPU.

## World-scale rendering

- **Float precision at scale** — 32-bit float (24-bit mantissa) jitters far
  from origin; it bites the *renderer* hardest. **Large World Coordinates**
  (UE5: double-precision positions, ~88M km radius) but **GPUs still run
  float**, so **camera-relative (translated-world) rendering** moves the
  origin to the camera each frame (highest precision where the camera
  looks) — the render-side twin of the core overview's floating-origin shift.
- **Terrain at scale** — **geometry clipmaps** (nested viewer-centered grids,
  toroidally updated, per-vertex morphing) or **CDLOD** (heightmap quadtree,
  per-vertex geomorphing, no T-junctions, with a StreamingCDLOD variant) —
  a sub-cell stream paged independently of actor cells.
- **GI at scale** — Lumen's **Surface Cache** works far better with Nanite;
  **Far Field** traces against **HLOD1** out to ~1 km. So GI *does* work on
  streamed/HLOD geometry, but it reuses the same HLOD proxies the streaming
  system already builds. `[?]` evolves fast across 5.4→5.7.

## Streaming–rendering integration (HLOD, impostors, transitions)

- **HLOD/proxy generation** — beyond loading range, merge a cell's meshes
  into one proxy (combined geometry + atlas'd material → one draw for the
  distant cell). The cell-level analog of Nanite's per-mesh LOD.
- **Impostors** — **octahedral impostors** (pre-render from viewpoints on an
  octahedron into a texture atlas; a shader blends the nearest captured
  views on a quad → a whole tree as ~12 triangles).
- **Transitions** — **dithered LOD** (ramp a screen-space dither threshold;
  the outgoing mesh dithers out, the incoming inverts it → a water-tight
  stitch) made cheap by **TAA** (`DitherTemporalAA` turns per-frame dither
  into a Monte-Carlo cross-fade). The concrete mechanism behind the core
  overview's "cross-fade transitions" bullet.
- **Does Nanite remove manual HLOD?** *Within view range*, largely yes for
  per-mesh LOD. *Across cells / at distance*, **no** — many instances still
  want HLOD/impostors to collapse instance count + draw cost, and Lumen Far
  Field needs HLOD1. Nanite **repurposes** HLOD (from "fake the detail" to
  "collapse instance/overhead count beyond the streamed region") — so the
  Tier 3 HLOD work stays mandatory for large worlds.

## Synthesis for the corpus

- **Two nested streaming loops** — cell-level (CPU, distance/velocity-driven
  — the core overview) and sub-cell (GPU feedback-driven — Nanite pages, VT
  tiles, terrain clipmaps), each with its own fixed pools and its own thrash
  failure mode ("never settles on a static view").
- **The activation bottleneck migrates to the GPU** — GPU-driven rendering
  drives `t_activate → ~0` for draw submission, but only if residency is
  known on the GPU.
- **The IO term collapsed; decompression moved to the GPU.**
- **HLOD is now multi-purpose** — visual distant rep + occlusion proxy +
  Lumen Far Field GI — not removed by Nanite.

## Sources

Karis *A Deep Dive into Nanite Virtualized Geometry* (SIGGRAPH 2021) + UE
*Nanite Technical Details* docs · id Tech 5 MegaTexture + shlom.dev *How
Virtual Textures Really Work* + UE *Runtime/Streaming Virtual Texturing*
docs · DX12 Reserved/Tiled Resources + Vulkan Sparse Resources spec ·
Aaltonen & Haar *GPU-Driven Rendering Pipelines* (SIGGRAPH 2015) · MS
DirectStorage 1.1 blog + NVIDIA GDeflate + Digital Foundry *Inside PS5*
(Cerny) · UE *Large World Coordinates* + Losasso & Hoppe *Geometry
Clipmaps* + Strugar *CDLOD* + UE Lumen docs · Brucks octahedral impostors +
Cesium *Dithered Opacity LOD*. Flags: Nanite numbers (128 KB pages, 512 MB
pool, 2 GB cap) are community/doc-echoed — verify against the Karis deck and
current `r.Nanite.*`; PS5 17.38 GB/s is a peak; Lumen/Nanite-skinning
details evolve fast (keep version-specific notes in dated reference records).
