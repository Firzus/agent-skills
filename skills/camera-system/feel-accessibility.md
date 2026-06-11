# Feel & accessibility — shake, FOV, comfort, photo mode

The juice layer and the non-negotiable comfort baseline. All numbers are **starting
points**. Primary source: Eiserloh *Juicing Your Cameras With Math* (GDC 2016).

## The trauma shake model

`trauma ∈ [0,1]`; events **add** (+0.2 small, +0.5 explosion); **linear decay**
(~1.5/s); effective shake = **trauma²** (big hits dominate, small ones stay subtle).

- **Perlin noise, never per-frame random**; one seed per channel (yaw/pitch/roll).
- **Rotational-only in 3D** (translation clips into walls); amplitude caps (5–10°
  max).
- Useful frequencies **0.1–4 Hz** (CM docs) — the often-cited 10–25 Hz exceeds what
  frame rates render.
- Lower amplitude at narrow FOV (telephoto amplifies).
- During hit-stop the shake runs on **unscaled time**.

## Impulses

Directional kicks with decay envelopes, spatial falloff from the source — an event
bus (sources emit, per-vcam listeners receive with gain). **One application point**
(the shake layer) — never direct shakes on the final transform (pitfalls #10). A
directional kick along the hit direction with spring-back beats isotropic noise.

## FOV as feel

Sprint +5–10° (in ~0.15 s, out ~0.3 s); aim narrow. **Never fast FOV shifts** (Nesky
#41 — a nausea trigger); FOV is part of the **blended camera state**, never a direct
set (pitfalls #11). A speed-based dynamic FOV amplifies the sense of speed (racing) —
see [genres.md](./genres.md).

## The motion-sickness baseline (non-negotiable)

Comfort is the **default**; effects are opt-in (XAG 117, Game Accessibility
Guidelines):

- **FOV slider** (the single most-requested option).
- **Shake intensity 0–100%** (trivial with the single shake layer + global
  multiplier — design it in from day 1).
- **Head-bob and motion-blur toggles**; a smoothing-reduction option; camera
  acceleration limits; no un-initiated snaps.
- Don't couple the camera to the walk cycle or vertical jump (Nesky #43–44 — filter
  the pivot).
- For VR, the comfort rules are stricter and structural — see [genres.md](./genres.md).

## Photo mode

A max-priority vcam + snapshot/restore; a free cam with constraints — measured: GoW's
3.5 m radius was criticized, Horizon ~5 m with a cylindrical bound and ~150° tilt
limit; **be ≥5 m**. Roll ±90°, FOV/focal/DOF controls, pause + HUD-hide integration.

## Numbers (sourced anchors)

| Parameter | Value | Anchor |
| --- | --- | --- |
| Trauma add | +0.2 small / +0.5 explosion; decay ~1.5/s | Eiserloh |
| Shake curve | effective = trauma²; max 5–10° rotational | Eiserloh / CM |
| Shake frequency | 0.1–4 Hz (NOT 10–25) | CM docs |
| Sprint FOV | +5–10° (in ~0.15 s, out ~0.3 s) | convention |
| Photo radius | ≥5 m (GoW 3.5 m criticized, Horizon ~5 m) | measured reviews |

## Flagged gaps — do NOT invent

Photo-mode movement speeds · FOV transition deg/s ceilings · GoW/Horizon photo-mode
exact bounds beyond the cited measurements.

## Sources

Eiserloh *Juicing Your Cameras With Math* (GDC 2016) · Cinemachine Noise docs ·
Nesky *50 Game Camera Mistakes* (FOV/bob mistakes) · XAG 117 /
gameaccessibilityguidelines.com · TheFourthFocus photo-mode measurements.
