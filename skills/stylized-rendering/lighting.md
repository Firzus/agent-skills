# Lighting — half-lambert, ramps, ILM, shadows, ambient

The stylized lighting model. All numbers are **starting points — tune by art
review**. Tagged where useful: **[DOC]** primary/documented, **[RE]** community
reverse-engineering (no studio confirmation).

## Half-lambert / wrapped diffuse

Never feed raw `NdotL` to the ramp — the back hemisphere collapses to flat dark
and self-terminators go harsh. Wrap it first (Valve, shipping since Half-Life):

```hlsl
half hl = 0.5 * dot(N, L) + 0.5;   // [-1,1] -> [0,1]
half hlShaped = hl * hl;           // gamma=2 (Valve); TF2 uses gamma=1 + warp
```

- Origin: Valve, formalized as scale α=0.5, bias β=0.5, exponent γ=2
  (SIGGRAPH 2006 / NPAR 2007). **[DOC]**
- "Completely non-physical but the perceptual benefit is enormous" — it gives a
  smooth `[0,1]` coefficient that's ideal to index a toon ramp and avoids hard
  dark-side terminators. **[DOC]**

## Ramp / step lighting

Use the wrapped coefficient as the **U coordinate into a ramp texture** instead
of multiplying albedo by it. The ramp encodes the lit→shadow transition as an
art-authored gradient — hard terminators with a controlled color shift.

```hlsl
half u = hlShaped;                          // or apply ILM threshold offset first
half2 rampUV = half2(u, rampRow);           // rampRow picks per-material gradient
half3 shadowTone = SAMPLE(rampTex, rampUV).rgb;
half3 col = albedo * lerp(shadowTone, 1.0, litMask);
```

- **Band count**: "cel" proper = 2–3 tones (base / shadow / optional highlight).
  2 bands reads graphic (Xrd); 3 adds a soft mid (Genshin skin). >4 reads as a
  smooth gradient — you've lost the cel look. A texture-free alternative is
  quantization: `intensity = ceil(hl * bands) / bands` with an ambient floor
  (`max(intensity, 0.12)`). **[DOC]**
- **Genshin ramp layout [RE]**: a 2D ramp, ~10 rows = 5 warm "day" + 5 cool
  "night"; rows within a half are material types selected per-pixel by the ILM
  alpha channel; day/night chosen by a uniform/`shader_feature`. Two ramps
  (body + hair). The terminator sits near the right edge of the ramp so a short
  shadow-color transition remains while the edge stays hard.
- **Outer shadow [RE]**: Genshin adds a *second* `NdotL` with a small offset and
  a harder transition, tinted slightly differently — this is the saturated/
  reddened terminator band (see color, below).

### Terminator anti-aliasing

A pure `step()` crawls with jaggies. Soften by ~1 pixel using screen-space
derivatives — feed `fwidth` the **value you threshold**, not the coordinate:

```hlsl
half d = hlShaped;
half w = fwidth(d);                          // |dFdx| + |dFdy|
half cel = smoothstep(thr - w, thr + w, d);
```

Genshin keeps this very narrow (hardness ~0.1 is "enough"). Strict cel can
point-sample the ramp to forbid smoothing; soft cel blurs the ramp. **[DOC]**

## The ILM / LightMap channel-packed control map

The key authored asset (Genshin). One RGBA texture drives the stylized
branches. Reverse-engineered consensus layout (exact thresholds vary by
reimplementation) — **[RE]**:

```
ILM / LightMap {
  R  // specular / highlight TYPE layer (incl. metal/MatCap masking)
  G  // AO / constant shadow + shadow-threshold offset
     //   1.0 = always lit, 0.5 = default (let lambert decide),
     //   0.25 = forced shadow, <0.1 = darkest shadow color
  B  // specular intensity / size mask (or metal flag) — interpretations diverge
  A  // ramp-row selector (which material gradient to sample) — "very important"
}
```

- **G is the artistry**: painted like an AO/threshold map to bias *where the
  terminator lands* per-texel — darker under the chin, inside folds — so the cel
  line falls where an illustrator would draw it, independent of geometry.
- **Guilty Gear Xrd parallel [DOC, primary — Motomura GDC 2015]**: instead of a
  packed texture, Xrd stores a **threshold 0..1 in a vertex-color channel**
  (0 = always shaded, 1 = always lit) compared against `dot(N,L)`. Default 0.5,
  then darken cavities — "looks a lot like an AO map". Shaded color =
  `BaseTex × TintTex` (a tint texture sets the shadow hue, e.g. red under skin
  for a fake-SSS feel).

## Tinted shadows — never black

- **Rule [DOC, TF2/Gooch]**: shadows shift **warm→cool**, never toward black.
  Keep the base hue, drop value 30–50%, push cool (violet/navy/teal) — or warm
  toward bounce where it reads better.
- **Gooch model [DOC]**: lerp a cool and a warm tone by `NdotL` with no falloff
  to black — fakes bounce/GI cheaply (`kcool = kblue + kd`, `kwarm = kyellow + kd`).
- **Saturation rises at the terminator** and is often slightly reddened (TF2).
  Genshin's outer-shadow band reproduces this.
- **Ramp import discipline [RE]**: control/ramp textures must be **Clamp wrap,
  sRGB off, no mipmaps, no compression, linear color space** — otherwise
  boundary sampling and precision artifacts wreck the bands.

## Received / cast shadows stylization

- **Fold shadow attenuation into the band logic**, don't let it darken linearly.
  Push the pixel below the terminator threshold so cast shadows share the flat
  self-shadow color: `cel = min(cel, shadowAtten)` or remap-then-re-threshold.
  TF2/Ronja-style toon passes `shadowAttenuation` into the stepped function.
  **[DOC pattern]**
- **Faces special-cased [RE]**: an SDF map (not `NdotL`) drives face self-shadow;
  received cast shadows on the face are suppressed via a receive-shadow position
  offset so "dirty" shadows don't appear (can break at very close camera).
- **Bias on cel terminators [DOC]**: hard meshes + shadow-map bias create
  acne/artifacts right on the flat cel boundary (the hard step amplifies wobble).
  Mitigate: use **smoothed vertex normals for shadow receiving** (decoupled from
  shading normals), small/negative depth+normal bias (HSR self-shadow caster
  ≈ −0.01), and URP `UNITY_USE_RECEIVER_PLANE_BIAS`. Excess normal bias →
  light-leaking / peter-panning.

## Ambient — lift shadows without washing the lit side

Add ambient **separately and non-uniformly** so the dark side isn't pure black,
without flattening the lit zones:

- **Hemisphere (2-color)**: `hemi = 0.5*N.y + 0.5; ambient = lerp(ground, sky, hemi)`. **[DOC]**
- **Floor, not add**: raise only sub-ambient regions to the ambient brightness,
  rather than adding over everything (which washes the whole model). Or scale
  ambient by `(1 - toonDiffuse·k)` so it only fills shadows. **[DOC]**
- **Valve ambient cube**: 6 directional ambient colors sampled by normal, added
  to the warped diffuse. **[DOC]**
- **Drop IBL on characters**: full image-based lighting reintroduces smooth
  view/normal-varying gradients across the "flat" zones the cel look depends on,
  re-adding the falloff the ramp removed. Stylized shaders drop metallic/
  roughness/IBL and replace environment response with the 2-color term or
  MatCaps. **[DOC]**

## Light-direction overrides (cinematics)

- **Dedicated character light vector [DOC, primary — Motomura GDC 2015]**: GG Xrd
  has *no* global lighting on characters — each carries a dedicated light vector
  authored to flatter the idle pose. In cutscenes the light is **animated
  per-frame** to keep the most flattering shading every frame.
- **Reimplementation hooks [RE]**: Genshin/HSR community shaders expose a face/
  light-direction offset (`_FaceDirectionOffset`) and shadow-color/light-
  direction overrides so the key can be forced independent of scene lights.

## Numbers table (starting points)

| Quantity | Value | Status | Source |
| --- | --- | --- | --- |
| Half-lambert | `(0.5·NdotL+0.5)²` (γ=2) | DOC | Valve SIGGRAPH06 / NPAR07 |
| TF2 half-lambert | γ=1, shaping → warp texture | DOC | NPAR07 |
| Terminator hardness | ~0.1 | RE | Genshin breakdowns |
| Terminator AA width | ±`fwidth(d)` (~1 px) | DOC | prideout / Ronja / Ilett |
| Band-quantize floor | `max(intensity, 0.12)` | DOC | community |
| ILM/vertex threshold | 0.5 default (1 lit / 0.25 unlit / <0.1 darkest) | DOC/RE | GGXrd / GabrielToon |
| Genshin ramp rows | 10 (5 warm day / 5 cool night) ×2 | RE | GenshinCelShaderURP |
| Hemisphere ambient | `0.5·N.y + 0.5` | DOC | ShaderStory |
| HSR self-shadow bias | ≈ −0.01 depth/normal | DOC* | StarRailNPRShader |
| Ramp import | Clamp, sRGB off, no mips, linear | DOC/RE | PrimoToon / URP docs |

\*Authoritative for that open-source shader, not a HoYo primary source.

## Sources

- **Valve — "Shading in Valve's Source Engine," SIGGRAPH 2006** (half-lambert,
  ambient cube). **[DOC]**
- **Valve — "Illustrative Rendering in Team Fortress 2," NPAR 2007** (half-
  lambert α/β/γ, diffuse warp w(), ambient cube, warm/cool shadows, reddened
  terminator, rim > dark outline). **[DOC]**
- **Motomura (Arc System Works) — "Guilty Gear Xrd's Art Style," GDC 2015**
  (dedicated light vector, cutscene-animated light, vertex-color threshold,
  base×tint shadow, hand-edited normals). **[DOC, primary]**
- **Gooch et al. — "A Non-Photorealistic Lighting Model," SIGGRAPH 1998**
  (cool-to-warm tone model). **[DOC]**
- **Panthavma — "Toon Shading Fundamentals"**; **Ronja "Single Step Toon"**;
  **Daniel Ilett "Cel-shaded Lighting"**; **prideout "Antialiased Cel Shading"**
  (ramp = coefficient→color, half-lambert remap, `fwidth` AA). **[DOC-secondary]**
- **Gaolingx/GenshinCelShaderURP**, **GabrielToonShader manual**, **Adrian
  Mendez Genshin breakdown**, **NoiRC256/URPSimpleGenshinShaders**,
  **stalomeow/StarRailNPRShader**, **Flat Kit (Dustyroom)** — ramp layout, ILM
  channels, outer shadow, self-shadow bias, drop-PBR ambient. **[RE / project-DOC]**

**Uncertainty**: ILM **B** meaning (spec intensity vs metal flag) and **A**
band boundaries differ between reimplementations — all **[RE]**, no miHoYo
primary source. "Albedo independent of light" in Genshin is hedged by the RE
authors. Treat Genshin/HSR specifics as plausible, not canon.
