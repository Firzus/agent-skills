# Outlines — hull, smoothed normals, post-process, ink

The line kit. All numbers are **starting points — tune by art review**. Pick a
**primary** method; combine only with justification (each pass costs). Tagged
**[DOC]** documented / **[RE]** reverse-engineering / **[?]** uncertain.

## Method 1 — inverted-hull (back-face extrude)

Render a second copy of the mesh, enlarged along the normal, with **front-face
culling** (keep back-faces). The part that pokes out behind the main mesh forms
the line. Very cheap (one extra draw), mobile-friendly. **[DOC — Xrd GDC 2015]**

### Screen-constant width (the important part)

Extruding by a constant **world** distance makes the line balloon up close and
vanish far away. Extrude in clip space and multiply by `clipPos.w` to cancel the
perspective divide, giving a width in **pixels**:

```hlsl
float2 offset = normalize(clipNormal.xy) / _ScreenParams.xy
              * _OutlineWidth * clipPos.w * 2.0;   // *2 = clip range [-w,+w]
clipPos.xy += offset;                              // _OutlineWidth = 1 -> ~1 px
```

- **FOV correction**: at fixed distance, *narrowing* the FOV (zoom) thickens the
  line because extrusion ignores it. Arc System Works multiply width by a
  `tan(FOV/2)`-style term to stay stable across distance **and** zoom. (Exact
  combined formula not transcribed in the slide — **[?]**.)
- **Hiding interior lines**: push the back-face shell **backward** in view-space
  z (or via vertex color) so the line disappears behind the main mesh where
  unwanted. Too much push → the line sinks under other objects in close-ups.
- **Starting widths**: 1–3 px in screen-constant mode; 0.001–0.01 world units in
  raw 3D mode; clamp close-up width with `min(pos.w * _OutlineWidth, _OutlineWidth)`.

### Smoothed normals (anti-split at hard edges)

On meshes with **hard edges / UV seams**, vertices are duplicated and their
normals diverge → extrusion opens **gaps/spikes** in the line. Fix: compute
**averaged normals** (each shared position gets the mean of coincident normals)
and store them **outside the normal channel** (which must stay hard for flat
lighting). Extrude along the smoothed normal; shade with the hard normal.

- **Where to store**:
  - **Vertex color RGB**: `color = smoothedNormal * 0.5 + 0.5`. Export **linear**,
    not sRGB, or values are wrong.
  - **UV channel (UV3/UV8)**: a normal is 3 components but FBX UVs are Vector2 →
    store tangent-space (2 comp, reconstruct z) or split across two UV channels.
  - **Tangent channel**: best for **skinned meshes** — Unity recalculates
    tangents during skinning so the normal stays correct after bone animation.
    Conflicts with normal mapping (also wants the tangent) → drop the normal map
    or recompute the tangent procedurally. This is exactly Xrd's approach
    ("Tangent" used as a second normal set). **[DOC]**
- **How to bake**: Blender Geometry Nodes (capture vertex normal → Store Named
  Attribute as Color) or a bmesh script; Unity `AssetPostprocessor` on import
  (dedup coincident verts, recompute, write to UV3); Houdini PolyFrame +
  attribute transfer. Tools: AquaSmoothNormals (UV8), OutlineNormalSmoother
  (`_Outline.fbx` → vColor), danbaidong1111/SmoothNormal.

## Method 2 — post-process depth + normal edges

A fullscreen filter detecting discontinuities in the G-buffers. **Depth** =
good silhouettes; **normals** = good interior creases. Combine both. No mesh
change, but a uniform cost over the whole screen. **[DOC]**

- **Operators**: **Sobel** (5–9 taps, smoother) or **Roberts Cross** (4 taps,
  finer/sharper). Sample center + neighbors, sum `|differences|`, threshold.
- **Per-object masking**: UE Custom Depth + **Custom Stencil** (a byte ID per
  mesh) → line only on tagged objects, color by stencil value. Compare
  `CustomDepth` vs `SceneDepth` so stenciled objects still occlude correctly.
- **Grazing artifact** (line too thick at glancing angles): modulate the depth
  threshold by a **Fresnel** term (relax when normal ⟂ view).
- **Distance fade / anti-shimmer**: divide depth by a distance param and `lerp`
  thickness toward 0 — thin distant lines. Community fade start ~15–30 m, end
  ~60–100 m (per-scene — **[?]**).

## Method 3 — authored / geometry ink

- **Painted ink in the texture (Borderlands)**: outlines + cross-hatching drawn
  by hand (tapered brushes) — "graphic novel" look, often combined with a Sobel
  pass for silhouettes. Limit: pixelation in close-ups, doesn't follow dynamic
  silhouettes. **[DOC — Scott Kester]**
- **Xrd UV-beam inner lines [DOC]**: inverted-hull can't draw surface lines. ASW
  draws inner lines as **axis-aligned beams on the texture** and aligns the UVs
  onto them; the UV/beam overlap sets line thickness. Because pixels are axis-
  aligned, there are **zero jaggies even at extreme zoom**. Cost: heavily
  distorted UVs (fine — no fine texture detail there) and manual authoring.
- **Baked outline mask**: a mask channel telling the shader where to draw/thicken
  lines.
- **SDF / decal lines**: resolution-independent, good for fixed detail; little
  production NPR documentation — mostly community practice. **[?]**

## Color & per-material width

- **Color**: pure black (Borderlands, strict cartoon) **vs tinted** — common
  practice tints toward a darkened/desaturated version of the local albedo (Xrd
  generates "darker polygons") to avoid dead black and keep depth.
- **Per-material width**: override the outline material per mesh (Unity Render
  Objects shader override) → thin skin, thick hair, etc.
- **Variable width along the silhouette (Xrd) [DOC]**: controlled per-vertex via
  **vertex-color alpha** — default 0.5 (so it can go thinner OR thicker),
  0.0 = minimal line, 1.0 = double. The RGBA channels are saturated: **R =
  lighting threshold**, **GBA = outline control**. This is documented (the
  official talk) — the Genshin equivalents are community RE.

## Trade-offs

| Method | GPU cost | Art control | Fails / limits |
| --- | --- | --- | --- |
| Inverted hull (3D extrude) | very low (1 draw/mesh) | medium | hard edges → gaps; no interior lines; world-width balloons |
| Hull + smoothed normals | low (+ offline bake) | good (per-vertex width/alpha) | bake step; tangent/normal-map conflict on skinned |
| Post-process Sobel/Roberts | medium (fullscreen, uniform) | low–medium (global; stencil per object) | shimmer/aliasing; misses same-depth coplanar edges |
| Painted ink (Borderlands) | ~nil (texture) | very high (hand-drawn) | close-up pixelation; static, doesn't track silhouette |
| UV-beam inner lines (Xrd) | low | very high, crisp | heavily distorted UVs; manual authoring |
| SDF / decal lines | low–med | high (fixed lines) | little prod docs; weak for dynamic silhouettes |

## Sources

- **Arc System Works — Guilty Gear Xrd, GDC 2015** (Motomura): inverted hull,
  tangent-as-normals, vertex-color RGBA width, UV-beam inner lines. **[DOC]**
- **ASW "Toon Line Control Techniques" (ASW Academy / Docswell, ENG)**: FOV
  `tan` correction, vertex-color alpha width default 0.5, back-face push. **[DOC]**
- **videopoetics "Pixel-Perfect Outline Shaders for Unity"**: clip-space pixel
  width math. **[DOC]**
- **Delt06/toon-rp wiki**, **Duncan Readle "Smooth Mesh Outlines"**, **ameye.dev
  "5 ways to draw an outline"**; tools **AquaSmoothNormals**,
  **OutlineNormalSmoother**, **danbaidong1111/SmoothNormal**. **[DOC / project]**
- **vertexfragment.com Sobel Outline**, **neenaw.com UE5 Outline**, **UE forums
  CustomStencil**. **[DOC-secondary]**
- **Cook&Becker / Gearbox (Scott Kester)** — Borderlands ink + Sobel. **[DOC]**

**Uncertainty**: ASW's exact combined FOV+distance width formula isn't
transcribed in public slides; fade distances and post-process thresholds are
community defaults to tune per project; Genshin/HSR outline specifics are
**[RE]**, not studio-confirmed.
