# Character shading — face SDF, eyes, hair, MatCap

Face and hair are the parts where generic toon lighting breaks and the anime
look is won or lost. All numbers are **starting points**. Tagged **[DOC]** /
**[RE]** / **[?]**.

## SDF face shadow maps (the core trick)

**Why `NdotL` fails on faces [DOC — ASW GDC 2015]**: cel shading is a hard
`step(threshold, NdotL)` — binary, no midtones. Tiny normal variation flips a
whole region → **blotches**; as the head rotates the terminator **crawls** over
nose, cheeks, eye sockets. Motomura: "the slightest difference in the surface
normal may end up as a huge blotch." Xrd's first answer was *hand-editing vertex
normals* on every facial feature — labor-heavy, doesn't generalize.

**The SDF / threshold-map solution [DOC — miHoYo Unity Seoul 2018; re-documented
by Hi-Fi Rush GDC 2024]**: replace the per-pixel normal with a UV-mapped
grayscale map. The light's *horizontal* angle (in head-bone space) becomes a
scalar threshold; compare it to the map to decide lit/shadow. The terminator
becomes a single clean curve that **sweeps horizontally** as the light orbits —
shape authored by an artist, not derived from geometry.

```hlsl
// project light onto the head's horizontal plane, get angle, normalize 0..1
float3 lightDirH = normalize(lightDir - dot(lightDir, headUp) * headUp);
float  angle     = acos(dot(lightDirH, headForward));
float  threshold = angle / PI;                 // 0..1
// pixel shader
float height = tex2D(faceSDF, uv).r;
return (height > threshold) ? baseColor : shadowColor;
```

**Genshin/HSR variant — FdotL + RdotL [RE]**: the map stores shadow coverage for
**one side, 0°–180°** on the XZ plane. Light from the other side → **flip the
map horizontally** (mirrored UV or an L/R map), selected by the sign of
`RdotL` (face-right · light):

```hlsl
float FdotL = dot(faceForwardXZ, lightDirXZ);  // [-1,1]
float RdotL = dot(faceRightXZ,   lightDirXZ);  // chooses side
float map   = (RdotL > 0) ? faceSDF_R.r : faceSDF_L.r;
float lit   = step((-FdotL + 1) * 0.5, map);   // remap FdotL to [0,1]
```

- **"Nose slightly lit" bias [RE/DOC]**: because coverage spans the full 0–180°
  (not 0–90°), the nose tip stays lit even when the face turns slightly away — a
  deliberate flattering bias. A `_FaceDirectionOffset` (~3 in NoiRC's repo)
  nudges the forward vector to tune where the terminator sits.

**How the SDF map is authored [DOC — Hi-Fi Rush GDC 2024]**:
1. Bake vertex-normal face shadows while rotating a directional light **180°
   around the head in 5° steps → 36 grayscale frames**.
2. Artists **manually retouch** each frame (remove unwanted shadows, smooth
   shapes).
3. **Merge all frames into one map** via distance-field-like interpolation
   (in-house tool): grayscale = "this texel falls into shadow once the light
   passes angle X." That's the "signed-distance" character — smooth
   interpolation between angles, graceful at low res. Hi-Fi Rush shipped **2K**
   maps to stay sharp on zoom.

> It's "SDF-*like*", not a true mathematical SDF — the map encodes a per-texel
> *angle threshold* that behaves like a distance field under interpolation.
> Color the terminator band with a small smoothstep/feather or a ramp instead
> of pure binary. **[DOC clarification]**

## Anime face conventions

- **Eyes/brows drawn *over* hair [RE]**: in 2D, brows read through the bangs. In
  3D, defeat depth sorting:
  - **Stencil / render-order**: front hair in a separate pass; eyes+brows drawn
    after with relaxed depth test or via stencil so they punch through. HSR
    shaders ship a "transparent front hair" pass + a Hair DepthPrepass for
    exactly this; some clones expose "Eye Through Hair" / "Depth Hair Caster"
    toggles.
  - **Depth/Z-bias**: bangs written with a depth offset (or eyes with negative
    depth bias) so the eye material wins the depth test in the brow region.
- **Outlines suppressed on eyes/brows [DOC — ASW]**: inverse-hull width is driven
  per-vertex by vertex-color alpha; eyelids/lashes set ~0 so no contour appears.
- **Nose & mouth [DOC + RE]**: the nose is *not* geometry-shaded — usually a
  small painted highlight/line (HSR has a view-dependent `_NoseLinePower` that
  fades by angle). Mouth/eyes live largely in the albedo + an expression map
  (`_ExpressionMap` drives blush/cheek emissive). Faces are kept deliberately
  flat; ASW even "holds" the face/mouth like 2D animators.

## Hair — anisotropic Kajiya-Kay highlight

**Model [DOC — Kajiya-Kay 1989]**: replace normal `N` with the strand **tangent
`T`** (along UV-U) in the specular term: `spec ≈ sqrt(1 - dot(T,H)²)` — the sin
of the angle between tangent and half-vector, producing the banded sweep that
moves with view + light.

**Tangent shift [RE]**: slide the highlight along the strand by perturbing the
tangent with a **shift map** (grayscale noise along the strand):
`T' = normalize(T + shift * N)`. The noise gives the **jagged/broken-strand**
look instead of a clean ring.

**Dual-specular ("two-layer") look [RE]**: two highlight bands — a **primary
colored** spec and a **secondary white/sharper** one, offset (different shift +
exponents) → the characteristic anime double-streak. Typically 1–2 bands per
hair section; widths from a spec ramp + a spec mask marking where highlights are
allowed.

- Starting numbers **[?, community-typical, not canon]**: second-layer shift
  offset ~0.05–0.2; two exponents ~16–40 (sharp white) vs ~4–8 (broad colored).
  Tuning seeds only.
- **MooaToon "Tangent Transfer" [RE/tool]**: for topology-independent control,
  bake custom tangents from an ellipsoid onto the hair (Houdini), stored in
  UV2/UV3, so the highlight shape is artist-defined rather than mesh-driven.

## MatCap (sphere mapping)

Sample a pre-lit sphere texture by the **view-space normal** — the sphere bakes
lighting + material + highlight from one angle:

```hlsl
float2 uv = N_viewSpace.xy * 0.5 + 0.5;   // variants mix in view-dir
float3 matcap = SAMPLE(matcapTex, uv).rgb;
```

- **+** Cheap, **view-stable**, instant metal/gem/skin-sheen "anime halo"; great
  on low-poly where Kajiya-Kay breaks down. The hair "angel-ring" that looks the
  same from any angle is the MatCap projection look.
- **−** Does **not react to world light direction** (only the camera); shape
  still limited by topology/normals; effectively single-light; ugly on messy
  normals.
- **Blend with the ramp [RE]**: lightmaps reserve a channel for a metal/MatCap
  mask + intensity (`_Metal`). Pipeline: compute the cel base via ramp, then
  add/lerp the MatCap on top, masked. MatCap supplies the sheen; the ramp
  supplies the base tones. For hero assets, blend rather than replace so it
  still reacts a little to world light.

## Eyes

- **Parallax iris [RE/DOC — Jimenez SIGGRAPH 2013]**: offset iris UVs by view
  direction × a height to fake corneal depth. The known anti-grazing trick is
  `v.z += 0.42` (Unity `ParallaxOffset`) so high parallax scale doesn't glitch
  at glancing angles. The physically-correct Snell refraction version is usually
  *too* realistic for anime and skipped.
- **SDF iris [RE]**: iris ring, pupil, limbal edge as 2D SDFs → resolution-
  independent sharp edges and smooth pupil dilation. HSR uses a separate
  EyeShadow material to drop a soft upper-lid shadow on the eyeball.
- **Fixed highlights [RE]**: catch-light dots are painted/emissive and view-
  stabilized (offset along the normal to simulate cornea curvature) so the
  sparkle stays put as the head turns — deliberately *not* physically lit,
  mirroring 2D fixed eye-shine; often a MatCap or screen-aligned quad.

## Numbers table (starting points)

| Feature | Technique | Numbers | Status |
| --- | --- | --- | --- |
| Face shadow | UV threshold/SDF vs light horizontal angle | bake 180° @ 5° = 36 frames, 2K | DOC (miHoYo/Hi-Fi Rush) |
| L/R symmetry | flip map by sign of `RdotL` | `step((-FdotL+1)/2, map)` | RE (Genshin) |
| Nose-lit bias | coverage 0–180° not 0–90° | `_FaceDirectionOffset ≈ 3` | RE |
| Hair spec | Kajiya-Kay, tangent along UV-U | exponents ~16–40 / 4–8 | DOC model / [?] numbers |
| Tangent shift | `T + shift·N`, noise map | 2nd-layer offset ~0.05–0.2 | RE / [?] |
| MatCap | view-space normal → pre-lit sphere | `uv = N.xy·0.5 + 0.5` | RE |
| Eye parallax | UV offset by view-dir | `v.z += 0.42` anti-grazing | RE/DOC (Jimenez) |

## Sources

- **Motomura — Guilty Gear Xrd, GDC 2015** (blotch problem, hand-edited normals,
  per-vertex outline suppression). **[DOC]**
- **Haoyu Cai (miHoYo) — "Genshin Impact: Crafting an Anime-Style Open World,"
  GDC 2021** (dynamic hand-painted face shadow masks by light direction). **[DOC]**
- **Tanaka & Komada (Tango) — "3D Toon Rendering in Hi-Fi RUSH," GDC 2024**
  (explicitly reproduces miHoYo's threshold-map method: math, 36-frame 5° bake,
  artist retouch, distance-field merge, horizontal flip). **[DOC]**
- **miHoYo Unity Seoul 2018** — original threshold-map method (cited by Hi-Fi
  Rush). **[DOC ref]**
- **Kajiya & Kay, SIGGRAPH 1989** — anisotropic hair model. **[DOC]**
- **Jimenez et al. — "Next-Generation Character Rendering," SIGGRAPH 2013** —
  eye parallax/refraction, `v.z += 0.42`. **[DOC]**
- **NoiRC256/URPSimpleGenshinShaders**, **kaze-mio/UnityGenshinToonShader**,
  **stalomeow/StarRailNPRShader**, **Teeinn0730/AnimeToonShader**, **MooaToon
  docs**, **Go1c/Next-Generation-Character-Rendering**, **Adrian Mendez** — face
  SDF math, channel packing, hair tangent shift, MatCap, eye shaders. **[RE]**

**Uncertainty**: hair exponents/shift offsets/band counts are community-typical
seeds, not published canon. "SDF" is used loosely (angle-threshold map with
distance-field-like interpolation). Eye-shader internals for Genshin/HSR are
inferred from ripped shaders + general anime-eye practice, not an official talk.
