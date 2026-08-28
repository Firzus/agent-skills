# Pitfalls — the 14 classic stylized-rendering failure modes

Each: symptom → root cause → prevention. Read before look-dev; re-read when a
character "reads flat", "looks uncanny", or "the shadows look noisy". Deep dives
in [lighting.md](./lighting.md), [outlines.md](./outlines.md),
[character-shading.md](./character-shading.md),
[materials-post.md](./materials-post.md).

## 1. PBR / flat mismatch (the uncanny toon)

- **Symptom** — the character looks neither realistic nor cleanly stylized;
  something feels off but nobody can name it.
- **Root cause** — mixing poles: GGX specular or image-based lighting under a
  flat ramp, or photoreal received shadows on a cel surface. The eye reads two
  contradictory lighting languages.
- **Prevention** — commit to one art-direction pole (flat-graphic vs
  lit-dimensional). Step or clamp specular to the band count; replace IBL with
  flat/2-color ambient; stylize received shadows too. One lighting language end
  to end.

## 2. Blotchy / flickering face shadows

- **Symptom** — nose and cheekbone shadows break into noisy patches that flicker
  as the head turns.
- **Root cause** — `NdotL` (or normal-mapped lighting) on a curved face; high-
  frequency normals create unstable terminators. ASW: "the slightest difference
  in the surface normal may end up as a huge blotch."
- **Prevention** — drive the face from an **SDF face shadow map** compared to the
  light's horizontal angle (one clean sweeping terminator); flatten or omit face
  normal maps; bias slightly toward lit so the nose never snaps dark. See
  [character-shading.md](./character-shading.md).

## 3. Outlines split at seams

- **Symptom** — inverted-hull outline cracks open at elbows, UV seams, or hard
  edges.
- **Root cause** — extruding along the *raw* mesh normal, which diverges at every
  split-normal/UV seam.
- **Prevention** — bake **smoothed (averaged) normals** into vertex color or a
  spare UV channel and extrude along those; keep the render normal for shading.
  On skinned meshes, store them in the tangent so skinning keeps them correct.
  Validate on the sharpest hard-surface prop.

## 4. Outline width balloons up close / vanishes far

- **Symptom** — razor-thin outlines across the map become thick rubber bands in
  close-ups (or vice versa).
- **Root cause** — extruding by a constant **world** distance, so screen width
  scales with proximity; also FOV zoom thickening the line.
- **Prevention** — extrude in clip space × `clipPos.w` to hold a constant **pixel**
  width; add a `tan(FOV/2)` correction for zoom; clamp min/max; fade the pass at
  LOD distance.

## 5. Banding / aliasing on the cel terminator

- **Symptom** — the hard light/shadow line crawls with jaggies and shimmers in
  motion.
- **Root cause** — a true `step()` with zero-width edge; sub-pixel terminator
  with no AA help.
- **Prevention** — `smoothstep` with a derivative width (`±fwidth(d)` on the
  thresholded value, ~1 px) to pre-antialias; keep it narrow (hardness ~0.1) so
  it still reads hard; pair with SMAA or TAA + sharpen.

## 6. Pure-black shadows (the sticker look)

- **Symptom** — shadowed areas look like flat black stickers; the character feels
  cut out and lifeless.
- **Root cause** — shadow color set to black or albedo × 0; no ambient/bounce
  tint.
- **Prevention** — tint the shadow band (keep hue, −30..−50% value, shift cool —
  Gooch/TF2); add flat/2-color ambient so the darkest band still carries color;
  let saturation rise slightly at the terminator.

## 7. Rim light glows on the dark side

- **Symptom** — a bright glow wraps the *shadowed* side of the character, killing
  form.
- **Root cause** — fresnel rim applied unmasked, independent of light direction.
- **Prevention** — multiply the rim by `saturate(NdotL)` (or the diffuse band /
  attenuation) so it only appears on the lit edge; optionally scale by light
  intensity so it fades in dim scenes.

## 8. Ramp shifts / pops under dynamic light

- **Symptom** — the banded shading slides or pops abruptly as the sun or a
  dynamic light moves; bands swim.
- **Root cause** — sampling the ramp from unstable raw `NdotL` with no wrap; per-
  light contributions summed before quantizing; ramp texture mip/filter bleed.
- **Prevention** — wrap to half-lambert, apply the ILM threshold offset, then
  sample the ramp once; quantize the **dominant** light term, not each light;
  import the ramp Clamp + sRGB-off + no-mips + linear.

## 9. Environment outlines fight the characters

- **Symptom** — the scene is visually noisy; characters don't pop against the
  world.
- **Root cause** — world geometry uses the same heavy ink and high-contrast ramps
  as the heroes.
- **Prevention** — reserve the heaviest lines + crispest ramps for characters;
  give the environment thinner/no outlines, softer ramps, more painted detail
  (BotW model); keep world contrast below hero contrast.

## 10. Shadow acne on the cel terminator

- **Symptom** — received shadows produce a dotted/striped mess right where the
  cel terminator already is, doubling the line.
- **Root cause** — standard shadow-map bias tuned for PBR interacts badly with the
  hard quantized terminator; self-shadowing at grazing bands.
- **Prevention** — use smoothed vertex normals for shadow *receiving*; small/
  negative depth+normal bias (HSR ≈ −0.01); stylize received shadows into the
  same band logic so map shadows and self-shading speak one language; URP
  `UNITY_USE_RECEIVER_PLANE_BIAS`.

## 11. Day/night (or two-light) ramp seams

- **Symptom** — a visible hard seam where the warm day ramp half meets the cool
  night half, or when blending two ramps.
- **Root cause** — hard switch between ramp halves at a threshold; mismatched
  endpoint colors between halves.
- **Prevention** — cross-fade the halves over a transition band; author them to
  share boundary colors; drive the blend by a smooth time/intensity parameter,
  not a step.

## 12. NPR vs bloom / tonemap clash

- **Symptom** — careful bands get crushed or washed out; outlines drown; vivid
  colors blow out or shift hue in bright scenes.
- **Root cause** — a filmic/ACES tonemap (darkens, desaturates, blue→purple) and
  aggressive bloom tuned for PBR applied on top of an already-graded flat palette.
- **Prevention** — use a neutral tonemap (Khronos PBR Neutral / Tony McMapface)
  or none, grade by hand; bloom threshold ~0 with low intensity (0.01–0.3),
  glow via emissive HDR > 1 in dark surroundings; check the brightest and darkest
  scenes, not just the turntable.

## 13. Eyes/brows disappear behind hair (depth sorting)

- **Symptom** — eyebrows and eyes are occluded by the bangs instead of reading
  through them like 2D anime; or they z-fight with hair.
- **Root cause** — standard opaque depth sorting; in 2D the brows are drawn over
  the hair, which 3D depth defeats.
- **Prevention** — render front hair in a separate pass and draw eyes/brows after
  with relaxed depth or via **stencil** so they punch through (the HSR
  "transparent front hair" + Hair DepthPrepass pattern); or write bangs with a
  depth offset. Suppress outlines on eyelids/lashes (vertex-color alpha ~0). See
  [character-shading.md](./character-shading.md).

## 14. MatCap doesn't react to the world (lighting mismatch)

- **Symptom** — hair sheen / metal / eye highlights look identical regardless of
  scene lighting; a character lit from the left still has a right-side "angel
  ring"; the sheen looks pasted on.
- **Root cause** — MatCap samples a pre-lit sphere by the **view-space** normal
  only, so it's camera-stable but ignores world light direction; used as the sole
  highlight on hero assets it desyncs from the cel lighting.
- **Prevention** — **blend** MatCap with the ramp/anisotropic highlight rather
  than replacing it; mask it by a control channel + intensity; reserve pure
  MatCap for small/secondary surfaces (gems, eye catch-lights) or low-poly assets
  where Kajiya-Kay breaks down. See [character-shading.md](./character-shading.md).

## Debugging order

When a stylized character looks wrong: (1) kill all post-process and view the raw
shaded result — most "uncanny" reports are #12 (tonemap/bloom) or #1 (pole
mismatch) in a costume; (2) freeze the light and rotate the head — blotchy = #2
(use the SDF), eyes vanishing = #13; (3) zoom in/out on the silhouette — width
changes = #4, seam cracks = #3; (4) put the character in shadow — dark-side glow
= #7, black sticker = #6, frozen sheen = #14; (5) move a dynamic light slowly —
swimming bands = #8, seams = #11.

## Look-dev checklist

```
- [ ] Thumbnail test: silhouette + value read at 64px (the flat read works)
- [ ] Rotate head a full 360 under a fixed light: face terminator stays clean
- [ ] Eyes/brows read through the bangs at every head angle, no z-fight
- [ ] Zoom from close-up to far: outline pixel-width stays ~constant, no cracks
- [ ] Character in full shadow: shadow band is tinted (not black), no dark rim
- [ ] Spin a dynamic light: bands sweep smoothly, hair sheen tracks the light
- [ ] Day -> night transition: ramp halves cross-fade, no seam
- [ ] Hero vs environment side by side: character clearly pops
- [ ] Bright scene + dark scene: bands survive bloom/tonemap, outlines visible
- [ ] Hard-surface prop (sword/armor): hull outline doesn't split at edges
- [ ] Motion test: terminator and thin lines don't crawl/shimmer (AA holds)
- [ ] LOD distance: outline + face SDF degrade cleanly, no shimmer
- [ ] Metal/skin/cloth/hair all read as different materials from one uber shader
```
