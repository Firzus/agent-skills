# Materials & post — specular, rim, environment, tonemap, AA

Specular, rim, the environment-vs-hero contrast budget, and the full-screen
stack a flat palette needs. All numbers are **starting points — recalibrate to
your art-direction pole** (see [overview.md](./overview.md) dial). Tagged **[DOC]** /
**[RE]** / **[?]**.

## Stylized specular (no raw PBR spec)

- **Core rule**: never let a physical GGX/Blinn-Phong term out raw. **Step** or
  clamp it into bands matching the diffuse band count.
- **Guilty Gear Xrd [DOC]**: no dedicated specular texture — specular = base
  color mixed with a tint; its **size and intensity** are driven by texture
  channels (spec-intensity + spec-size maps). The shading itself is a binary
  `step` lit/shadow.
- **Genshin [RE]**: metal / anisotropic hair via a gradient/ramp sampled by a dot
  product (`N · (V+L)`), UVs optionally distorted by a normal map → the hair
  "angel ring". Emission and metal isolated by lightmap channels.
- **Pattern**: a single RGBA control texture encodes shadow-threshold offset,
  spec intensity, spec size, and metal/emission mask — keeping the material flat
  and art-directable.
- **Starting form**: `spec = step(threshold, pow(NdotH, gloss))` then `× step(0.5,
  diffuseBand)` (spec only on the lit side). Gloss exponent high (32–128) for a
  crisp dot, not a gradient.

## Rim light (a readability tool)

```hlsl
half rim = pow(1.0 - saturate(dot(N, V)), fresnelPower);   // 2..8
rim = smoothstep(rimMin, rimMax, rim);                     // harden the falloff
rim *= saturate(dot(N, L));                                // KEY: lit side only
```

- **Power range**: 2–8. Higher = thin line hugging the silhouette; lower = wide
  wrap.
- **Light-direction mask (the key step) [DOC]**: multiply by `saturate(NdotL)`
  (or the diffuse band / attenuation) so the rim glows **only on the lit side**.
  Unmasked, it wraps the whole object and a glow appears on the shadow side —
  the dead giveaway of a beginner toon shader (pitfalls #7).
- **Depth-based rim [DOC]**: sample the depth buffer and compare a pixel's depth
  to a screen-space-offset neighbor → a **constant-width** rim that hugs the
  silhouette (vs fresnel, which fattens at grazing angles). Needs the depth
  texture (overhead).
- **Note [RE]**: Genshin's in-game "rim" is closer to a constant-width screen-
  space outline (appears both sides, doesn't follow the mesh) than a true
  fresnel rim — don't confuse the two. TF2 [DOC] deliberately accents silhouettes
  with **rim highlights instead of dark outlines**.

## Environment NPR — softer than the heroes

- **BotW model [DOC]**: Nintendo **rejected full cel-shading** — it fought the
  physics/chemistry systems and read too childish for the audience. Choice =
  **painterly + PBR hybrid** ("a hybrid of realism and playability").
- **Distance legibility [DOC]**: a 3-tier structure (close/mid/far); ~200 params
  reduced to ~50 essentials (far = particle FX, mid = Y-axis fog, near =
  obstructed particles), all real-time.
- **Principle**: keep **world contrast below hero contrast**. Banded foliage
  translucency, stylized water, softer environment shadows → the characters stay
  the highest-contrast/most-saturated elements and read first. TF2 [DOC] omits
  high-frequency environment detail and picks interior character detail to
  **echo the silhouette**.

## Post-process for flat palettes

- **The ACES/filmic problem [DOC]**: too contrasty for NPR — it darkens the
  scene, **desaturates** vivid colors, and shifts **blue→purple**, reserving
  range for highlights so paper-white doesn't read white.
- **Neutral alternatives [DOC]**:
  - **Khronos PBR Neutral** — 1:1 on base colors up to a threshold, compresses
    headroom above, no hue shift. Explicitly recommended for mixing **anime
    characters + PBR environments** (`F90=0.04`, `Ks=0.8−F90`, `Kd=0.15`).
  - **Tony McMapface** — neutral, no contrast/saturation push.
  - Or **no tonemap** / simple gamma for pure flat.
- **Bloom [DOC]**: keep **threshold low/0** but **intensity very low (0.01–0.3)**;
  make *emissive* objects glow by giving them HDR intensity > 1.0 in a darker
  surrounding scene, rather than raising the threshold. Test: a white emissive
  sphere @1.0 should have little/no glow. (With ACES, pushing emissive whitens
  the color — another reason to use a neutral tonemap.)
- **AA — the hard part [DOC]**:
  - **TAA/TSR** smear thin lines (outlines, terminator, dithering) and ghost in
    motion — motion vectors don't align to crisp high-contrast edges.
  - **MSAA** is clean on geometry edges but is incompatible with deferred
    (Nanite/Lumen) and **doesn't AA the in-shading aliasing** (the cel
    terminator) or alpha cutouts.
  - **FXAA/SMAA** — no ghosting, less stable; **SMAA often preferred** in
    stylized. Pair TAA with a light **sharpen** pass to recover lines; in UE,
    running the outline "Before Tonemapping" reduces flicker.
- **Cel terminator aliasing [DOC]**: the binary lit/shadow edge crawls; soften
  with a very narrow `smoothstep` (width ~0.05–0.1 in `NdotL`) rather than a pure
  `step` — Genshin uses ~0.1 hardness, not extreme.

## Color discipline — tinted shadows

- **Rule [DOC]**: the shadow is never black. Hue-shift warm→cool (toward
  violet/navy/teal). (Gooch 1998 / TF2.)
- **Terminator [DOC]**: saturation rises at the terminator and it's often
  slightly reddened. Genshin reproduces this with an outer-shadow band.
- **Palette**: shadow = desaturated base + cool hue; midtone = full-sat read
  color; highlight = toward warm/cream (not pure white); ambient = tinted toward
  the background dominant.
- **Ramp import [RE]**: Clamp, sRGB off, no mips/compression, linear color space.

## Numbers table (starting points)

| Param | Value | Source |
| --- | --- | --- |
| Cel band count | 2 (lit/shadow) + 1 outer shadow | GGXrd [DOC] / Genshin [RE] |
| Terminator softness | 0.05–0.1 in NdotL (≠ pure step) | Genshin [RE] |
| Rim fresnel power | 2–8 | tutorials [DOC] |
| Rim mask | `× saturate(NdotL)` | [DOC] |
| Specular gloss | 32–128, then `step` | [DOC/RE] |
| Bloom intensity | 0.01–0.3 | Silent CSS [DOC] |
| Bloom threshold | ~0, soft knee 0–1, clamp ~30 | Silent CSS [DOC] |
| Emissive→bloom | HDR intensity > 1.0 (dark surroundings) | [DOC] |
| Tonemap | PBR Neutral / Tony McMapface / none (not ACES) | Khronos / Godot [DOC] |
| PBR Neutral params | F90=0.04, Ks=0.8−F90, Kd=0.15 | Khronos [DOC] |
| AA | SMAA, or TAA + sharpen; avoid bare TAA on thin lines | [DOC] |
| Ramp import | Clamp, sRGB off, no mips, linear | PrimoToon [RE] |

## Sources

- **Motomura — Guilty Gear Xrd, GDC 2015** (step shading, spec = tint mix, spec
  channels). **[DOC]**
- **Takizawa/Dohta/Fujibayashi — "Change and Constant: BotW," GDC 2017 + CEDEC +
  Creating a Champion** (rejected full cel, painterly/PBR, 3 distance tiers,
  200→50 params). **[DOC]**
- **Mitchell — "Illustrative Rendering in Team Fortress 2," NPAR 2007** (warm-to-
  cool, shadows not black, reddened terminator, rim > dark outline, silhouette-
  echoing detail). **[DOC]**
- **Gooch et al. — "A Non-Photorealistic Lighting Model," SIGGRAPH 1998**. **[DOC]**
- **Khronos 3D Commerce — PBR Neutral Tone Mapper**; **Godot proposal #7263 /
  Tony McMapface** (ACES critique). **[DOC]**
- **Silent Cel Shading Shader wiki (s-ilent)** — bloom NPR numbers. **[DOC]**
- **Scott Kester (Borderlands AD) / Cook&Becker** — hand-inked + Sobel, PBR from
  BL3. **[DOC]**
- **Daniel Ilett / lettier "3D Game Shaders" / Poiyomi** — fresnel rim, NdotL
  masking, depth rim. **[DOC]**
- **PrimoToon / Adrian Mendez** — Genshin ramp import, outer shadow. **[RE]**

**Uncertainty**: Genshin/HSR details are **[RE]** (datamined) — plausible, not
canon. Hi-Fi Rush specifics beyond the face method are **[?]**. The numbers are
tutorial/community starting points to recalibrate to your pole, not shipped
values.
