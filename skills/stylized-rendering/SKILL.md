---
name: stylized-rendering
description: >-
  Architecture blueprint for stylized / non-photoreal (NPR) cel-shaded game
  rendering in the anime lineage of Genshin Impact, Honkai: Star Rail, Guilty
  Gear Xrd, and Zelda BotW. Covers the lighting model (half-lambert + ramp/step
  lighting, the ILM/LightMap channel-packed control map, tinted shadows, fwidth
  terminator AA, light-direction overrides), the line kit (inverted-hull
  outlines with smoothed normals, post-process depth/normal edges, Xrd UV-beam
  inner lines), character shading (SDF face shadow maps driven by light angle,
  eyes-through-hair, anisotropic Kajiya-Kay hair, MatCap), materials and
  post-process (stepped specular, light-masked rim, environment-softer-than-
  hero, neutral tonemap vs ACES, AA/bloom for flat palettes), the art-direction
  calibration dial, and Unity 6 (URP/HDRP) + UE5 mappings. Use when building a
  toon/cel/anime/stylized look, authoring NPR shaders, outlines, ramp lighting,
  face SDF shadows, or when a stylized character "reads flat", "looks uncanny",
  shadows look noisy/blotchy, or outlines break up.
---

# Stylized Rendering (NPR / cel-shaded)

Build the stylized look of a character-action game in the **anime-cel
lineage**. Primary references (all with public tech talks or well-documented
reverse-engineering): **Guilty Gear Xrd** (Arc System Works, GDC 2015 — the
canonical primary source), **Genshin Impact** / **Honkai: Star Rail** (miHoYo,
GDC 2021 + community RE), **Hi-Fi Rush** (Tango, GDC 2024 — documents the SDF
face method), **Zelda BotW** (Nintendo, GDC 2017 — painterly anti-cel),
**Team Fortress 2** (Valve, NPAR 2007 — half-lambert, warm/cool shadows).

A stylized look is **art direction expressed through shading math, then frozen
into authored data**: ramps, channel-packed control maps, smoothed normals,
SDF face maps, hand-edited vertex normals. The renderer is the cheap part — the
look lives in the authored maps. Plan the **art pipeline**, not just the shader.

Excluded (separate skills): web/React screen-space shaders (`shaders`), full-
site palette extraction (`extract-theme`), in-engine VFX/particles, animation.
Engine-wide practice: `unity6-aaa-best-practices` / `ue5-aaa-best-practices`.

## Pick your art-direction pole first

Every threshold, band count, ramp, and outline width descends from one upstream
choice — where you sit on the **flat-graphic ↔ lit-dimensional** dial. Decide
it before writing a line of shader:

| Dial | Flat-graphic (Guilty Gear Xrd) | Lit-dimensional (Genshin, HSR) | Painterly (BotW) |
| --- | --- | --- | --- |
| Bands | 2 (near-binary) | 2–3 + outer shadow | soft wrapped, low contrast |
| Shadow source | vertex-color threshold, hand-edited normals | ILM channel map + ramp + SDF face | mostly baked, gentle |
| Outlines | heavy, per-vertex width (ink) | thin, screen-constant, masked | soft or none |
| Specular | painted/stepped, tint mix | stepped + anisotropic hair + MatCap | diffuse, minimal |
| Lighting | per-character dedicated light vector | world light + overrides | hybrid PBR/painterly |
| Goal | a moving 2D illustration | a readable 3D anime figure | a storybook world |

Pick one column as the spine; borrow from another **deliberately**. Mixing
(PBR specular under a flat ramp, photoreal shadows + ink lines) is the #1 cause
of the "uncanny toon" — see [pitfalls.md](./pitfalls.md) #1. Nintendo
explicitly **rejected** full cel-shading for BotW (it fought systemic gameplay
and read too childish) — your pole is a gameplay/tone decision, not just taste.

## The core model: shading is authored data

The whole family reduces to **a fixed shader fed by hand-authored maps**. The
look is ~80% in the maps, ~20% in the code:

- **Half-lambert + ramp**: never use `NdotL` raw. Wrap it (`NdotL*0.5+0.5`,
  Valve) and use it to **index a ramp texture** (banded gradient, warm "day" /
  cool "night" halves). Bands, not a smooth falloff. → [lighting.md](./lighting.md)
- **ILM / LightMap channel map** (the key authored asset): one RGBA texture
  packs per-pixel shading controls — AO/shadow-threshold offset, specular
  intensity/size mask, metal/MatCap mask, ramp-row selector. Artists *paint
  where shadow falls*, overriding the math. → [lighting.md](./lighting.md)
- **The face is special**: `NdotL` goes blotchy on a face. Use an **SDF face
  shadow map** compared to the light's horizontal angle → one clean terminator
  that sweeps as the light orbits (miHoYo's method, documented by Hi-Fi Rush:
  bake 36 frames at 5°, merge into one distance-field map).
  → [character-shading.md](./character-shading.md)
- **Smoothed normals for outlines**: hard-surface meshes store an *averaged*
  normal in vertex color / a spare UV channel so the inverted-hull outline
  doesn't split at sharp edges. → [outlines.md](./outlines.md)

Artists tune the look by painting maps; the shader stays fixed. That is the
contract — design the authoring channels first.

## Reference map

| File | Covers |
| --- | --- |
| [lighting.md](./lighting.md) | Half-lambert, ramp/step lighting, ILM channel map, tinted shadows + Gooch warm/cool, fwidth terminator AA, stylized received shadows + bias, 2-color ambient, light-direction overrides |
| [outlines.md](./outlines.md) | Inverted-hull (screen-constant width, FOV correction), smoothed-normal baking, post-process depth+normal edges, Xrd UV-beam inner lines, baked ink, per-material width, method trade-offs |
| [character-shading.md](./character-shading.md) | SDF face shadow maps (the bake + the math), eyes/brows through hair, nose/mouth, anisotropic Kajiya-Kay hair + shift maps, MatCap, eye parallax/SDF |
| [materials-post.md](./materials-post.md) | Stepped specular, light-masked + depth rim, environment-softer-than-hero, neutral tonemap vs ACES, bloom/AA for flat palettes, color discipline |
| [engine-mapping.md](./engine-mapping.md) | Unity 6 URP (GetMainLight, Render Graph passes, Forward+), HDRP custom passes, UE5 (post-process vs custom shading model vs light-vector trick, Overlay Material outlines, Nanite/Lumen caveats) |
| [pitfalls.md](./pitfalls.md) | 14 failure modes (symptom → cause → prevention), debugging order, look-dev checklist |

## Build order (4 shippable tiers)

```
Tier 1 - The flat read
- [ ] Half-lambert -> ramp texture lookup (2-3 bands); tinted (not black) shadow
- [ ] Outlines: inverted-hull OR post-process depth+normal - pick ONE primary
- [ ] sRGB/linear correct; ramp imported Clamp + no-mips + linear
- [ ] Thumbnail/silhouette test: it reads at 64 px
Tier 2 - Authored control
- [ ] ILM/LightMap channel map: shadow-threshold offset + spec mask
- [ ] Smoothed normals baked to vColor/UV for crack-free hull outlines
- [ ] Rim light: fresnel masked by light direction (lit side only)
- [ ] Screen-constant outline width (depth/FOV corrected)
Tier 3 - Character fidelity
- [ ] SDF face shadow map driven by head-forward vs light angle (+ L/R flip)
- [ ] Eyes/brows through hair (stencil/depth); anisotropic hair highlight
- [ ] Metal/emission via channel mask; MatCap for sheen/eyes/metal
- [ ] Day/night ramp halves + light-direction override for cinematics
Tier 4 - Cohesion & scale
- [ ] One uber-NPR shader with feature toggles (skin/hair/cloth/metal)
- [ ] Environment NPR softer than heroes (keep world contrast below characters)
- [ ] Neutral tonemap (PBR Neutral / Tony McMapface, not ACES); gentle bloom
- [ ] AA that survives thin lines (SMAA, or TAA + sharpen); LOD fallbacks
```

## Key calibration numbers (starting points — tune by art review)

| Parameter | Starting point | Anchor |
| --- | --- | --- |
| Half-lambert | `(0.5·NdotL+0.5)²` (γ=2; TF2 γ=1 + warp) | Valve SIGGRAPH06 / NPAR07 |
| Ramp bands | 2 (graphic) – 3 (soft) + 1 outer shadow | Xrd / Genshin |
| Terminator softness | smoothstep ±`fwidth`, hardness ~0.1 | Genshin RE / cel-AA tutorials |
| ILM/vertex shadow threshold | 0.5 default (1 lit, 0.25 unlit, <0.1 darkest) | GGXrd (GDC15) / GabrielToon RE |
| Shadow color | base hue, −30..−50% value, shift **cool** | Gooch / TF2 (never black) |
| Inverted-hull width | 1–3 px screen-constant (× `clipPos.w`) | videopoetics / Xrd |
| Outline color | albedo × 0.2–0.4, desaturated | TF2 (rim > black) |
| Rim | fresnel pow 2–8, × `saturate(NdotL)` | rim tutorials |
| SDF face bake | 180° @ 5° = 36 frames, 2K map | Hi-Fi Rush (GDC24) |
| Hair spec exponents | ~16–40 (sharp) / ~4–8 (broad), 1–2 bands | Kajiya-Kay (numbers = seeds) |
| Bloom | threshold ~0, intensity 0.01–0.3 | Silent CSS |
| Tonemap | PBR Neutral / Tony McMapface (not ACES) | Khronos / Godot |

Full sourced tables live in each reference file.

## Engine mapping (summary)

| Generic block | Unity 6 (URP) | UE5 (5.4+) |
| --- | --- | --- |
| Toon lighting | `GetMainLight(shadowCoord)` + ramp sample; mind Forward+ & Render Graph | Post-process ramp on `NdotL`, **or** custom shading model (GBuffer edit) |
| Inverted-hull outline | 2nd pass `Cull Front` + smoothed-normal extrude, or Render Objects | **Overlay Material** (5.1+) `WPO=Normal·Thickness`, `TwoSidedSign·−1→OpacityMask` |
| Post-process edge | Full Screen Pass feature, Sobel on depth/normals | `SceneTexture` `WorldNormal(8)` + `CustomStencil` edge detect |
| SDF face / ramp / ILM | Sample in Shader Graph; control maps sRGB-off, Clamp | `Texture Sample` + `BreakOutFloat4Components` |
| Smoothed normals | bake to vColor / UV3 via `AssetPostprocessor` | bake to vColor, or all-smooth hull mesh |

Full detail, gotchas, and version flags (Forward+, Render Graph 6.1, Nanite
custom-depth, Lumen vs flat) in [engine-mapping.md](./engine-mapping.md).

## Related skills

- `extract-theme` — palette/token extraction for the art-direction target.
- `shaders` — screen-space shader composition (web/React context).
- `camera-system` — framing and the post-process stack the NPR look sits in.
- `hud-system` — UI must share the stylized palette without heavy outlines.
- `game-architecture-patterns` — Type Object (per-material shading data),
  Flyweight (shared ramps/maps), data-driven authoring theory.
- `unity6-aaa-best-practices` / `ue5-aaa-best-practices` — render pipeline,
  asset, and performance practice assumed here.
