# Spatial audio — attenuation, occlusion, reverb, ambience

The 3D side of the audio system: attenuation, occlusion, reverb, the
ambience system, and the listener. All numbers are **starting points —
tune by ear**. The DSP under it (HRTF, ambisonics, wave-baked occlusion,
filters) is in [dsp-synthesis.md](./dsp-synthesis.md); music/mix/voices in
[music-mix.md](./music-mix.md). Neither reference game (BotW, Genshin)
does geometric acoustics — the raycast-LPF approximation is the open-world
standard.

## Attenuation

- Per-category curves (log for world SFX, custom for VO/UI), spread up
  close, 2D/3D blend (music 2D, beds quasi-2D, world SFX 3D).
- The sourced AAA reference curve: inverse-square ≈ **−6 dB per distance
  doubling** (−6 dB/4 m over 80 m — Volition). Distance units are
  project-defined: there is no category-range standard (flagged).

## Occlusion

The open-world standard — a cheap approximation, not geometric acoustics:

- Periodic raycasts source→listener at **10–30 Hz** (never per frame),
  time-sliced (~4 rays/frame budget), distance-gated.
- Result = a 0–1 factor driving an **LPF (20 kHz → ~300–500 Hz)** + volume
  (−10 to −20 dB), smoothed over 0.1–0.2 s; multi-ray against popping;
  material weights (wood ~0.6, concrete ~0.85). The biquad LPF math is in
  [dsp-synthesis.md](./dsp-synthesis.md).
- **The limits** (the "lamppost" problem): a single ray makes a thin post
  occlude like a wall, and there's no **diffraction** (sound bending
  around corners). The frontier — Steam Audio volumetric occlusion, and
  Project Acoustics' wave-baked diffraction — is in
  [dsp-synthesis.md](./dsp-synthesis.md). Portals/rooms are the
  geometric middle ground.

## Reverb

- Volumes per environment with per-category send levels; the underwater
  state is a mix state + filter, not just reverb.
- RT60 anchors from acoustics: room 0.4–0.5 s, concert hall 1.8–2.2 s,
  cave/cathedral 2–10 s; engine default decay ~1.49 s. (Algorithmic vs
  convolution reverb internals: [dsp-synthesis.md](./dsp-synthesis.md).)

## The ambience system

- Beds per biome/region crossfaded on region change; **weather drives
  rain/wind beds** (`world-time-weather`); random one-shot emitters
  (scatter/random-container pattern) with day/night variants.
- The BotW model: hand-placed + pipeline-generated emitters with
  contextual parameters (birds only near real trees — partly
  Jenkins-automated). The systemic-ambience craft (RDR2's region/weather/
  time detail) is in [design-craft.md](./design-craft.md).

## The listener

- **Third-person listener** (the standard answer, Epic-documented):
  **position on the character, orientation on the camera** — fixes
  attenuation feel AND the occlusion origin (the listener-mismatch
  pitfall). The `camera-system` reference owns the orientation source.
- For headphones/VR, the spatializer is an **HRTF** convolution; for VR
  ambiences, an **ambisonic** field rotated to the listener's head — both
  in [dsp-synthesis.md](./dsp-synthesis.md).

## Engine mapping (spatial)

| Block | Unity 6 | UE5 (5.4+) |
| --- | --- | --- |
| 3D source | 3D source settings + AudioReverbZone | Attenuation assets (curves, spread, 2D/3D) |
| Occlusion | hand-rolled raycasts + AudioLowPassFilter | native trace-based occlusion (off by default: trace channel, LPF, volume, interpolation) |
| Reverb/zones | AudioReverbZone | **Audio Gameplay Volumes** (reverb/filter/submix per volume) |
| Binaural | plugin (Steam Audio / Oculus) | built-in ITD + Steam Audio/Oculus plugins |
| Listener | AudioListener on a rig (pos char / orient cam) | Listener override (pos char / orient cam) |

## Sources

Epic docs (attenuation occlusion, Audio Gameplay Volumes, listener) ·
Unity docs (3D sources, AudioReverbZone, AudioLowPassFilter) · Volition/
Brad Meyer (attenuation curves) · David Kizale (AAA occlusion case) ·
acoustics literature (RT60) · CEDEC 2017 BotW (emitter pipeline) · Valve
Steam Audio (volumetric occlusion). DSP-level spatial sources (HRTF,
ambisonics, Project Acoustics) in [dsp-synthesis.md](./dsp-synthesis.md).
