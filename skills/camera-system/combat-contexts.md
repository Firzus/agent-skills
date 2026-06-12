# Combat & contexts — lock-on, framing, volumes, dialogue

The combat camera and the contextual/cinematic layers. All numbers are **starting
points**. Sources: GoW GDC 2019, Uncharted 3 GDC 2012, Elden Ring lock-on analysis.

## Combat cameras

- **Soft-lock (Genshin/GoW)**: a continuous yaw *bias* of a few degrees toward the
  engaged enemy (weighted by screen angle, distance, aggro), always overridden by
  input — and **always toggleable** (players turn off fighting cameras).
- **Hard lock-on (the Z-targeting lineage)**: aim between player and target, frame
  both on a diagonal (the avatar never occludes the target); distance/FOV pull back
  as they separate; flick-to-switch (sorted by screen angle); movement becomes
  target-relative strafe. **Release rules are explicit** (death, range, LoS lost > N s)
  and the rotation to a new target has an angular speed cap — no whiplash
  (pitfalls #9). Elden Ring's selection heuristic (reverse-engineered): crosshair
  distance + player distance + obstruction + aggression + frontal cone.
- **Group framing**: a weighted centroid of engaged enemies (threat, distance,
  attack recency) as a secondary look target; zoom-to-fit with **hard limits**
  (never infinite pull-back). CM TargetGroup + GroupFraming is the reference; the
  zoom-to-fit math is in [math-tech.md](./math-tech.md).
- **Big enemies (the GoW troll problem)**: a close camera on a 6 m enemy shows knee
  texture. Pull back by target bounds, raise the pivot to torso/head, widen FOV —
  and accept that camera and encounter design are co-dependent (GoW added off-screen
  enemy arrows + audio cues because the close camera reduced awareness).
- **Hit feedback**: trauma-fed shake (see [feel-accessibility.md](./feel-accessibility.md));
  during hit-stop the shake runs on **unscaled time**; directional impulses (a kick
  along the hit direction with spring-back) beat isotropic noise.
- **Boss arenas**: camera volumes force distance/yaw/confinement.

## Contextual states & volumes

- Each context = a vcam; transitions = blends from the table. **Aim**: tight
  shoulder offset, shoulder swap (~0.2 s blend), FOV zoom, stiffer sensitivity.
  **Climb**: pitch biased up. **Interiors**: auto distance reduction (volume- or
  ceiling-raycast-triggered), upper pitch clamp.
- **Designer camera volumes** — the standard level-design tool: placed volumes
  overriding settings (distance, pitch, FOV, or a whole vcam) with blend in/out. The
  Uncharted 3 reference: triggers *push* cameras onto a priority stack; entering zone
  B mid-blend blends from the current blended state (a FIFO of blend timers).
- **Cinematic takeovers** (reveals, pans): push a high-priority vcam, then pop —
  with **snapshot/restore** of the player's yaw/pitch/distance (the
  `scene-flow-manager` cutscene contract; restore by blend, never teleport;
  pitfalls #13).

## The one-shot constraint (GoW 2018)

Zero cuts for ~30 h. What it costs architecturally: every transition is a
continuous blend (no cut entry in the table); cutscenes start where the gameplay
camera is and *put it back down* in a playable spot; every camera move must be
**motivated** (action, a character's gaze); blends need **valid paths** (waypoints/
splines through openings, or hidden cuts — a character/wall filling the frame for
one frame); dialogue loses shot-reverse-shot and becomes physical choreography.
Worth it for intimate single-character narratives with heavy previz budgets; for
everything else, traditional cuts are the right default.

## Procedural dialogue cameras

The scalable answer to thousands of conversations (the Genshin pattern):

- Generate candidate shots per speaker (close-up, medium, two-shot, over-the-
  shoulder) anchored on head sockets, corrected for height differences.
- **Encoded composition rules**: rule of thirds, look-room on the gaze side, and
  the **180° line** (all shots from one side of the speaker axis — crossing it flips
  eyelines and disorients; implement as an orbit constrained to a half-space with an
  explicit "flip" command). The Toric space natively solves exact 2-target placement
  (see [cinematography.md](./cinematography.md)).
- Selection heuristics: alternate reverse shots per speaker; a default shot per
  speaker with per-line overrides; wide establishing shot at open, close-ups as
  intensity rises.
- **Validate before activating** (raycast the speaker's head, camera not in a
  wall), degrade gracefully: alternate same-type shot → wider two-shot → unchanged
  gameplay camera (always valid).
- Enter with a cut (expected film grammar), exit with snapshot/restore.

## Flagged gaps — do NOT invent

Lock-on flick thresholds, cone angles, Zelda values (only FromSoft's param
*structure* is datamined) · GoW/Horizon combat camera distances.

## Sources

GoW: Arazi *Cinematography of God of War* + Sheth *Evolving Combat* (GDC 2019) ·
*The Cameras of Uncharted 3* (GDC 2012) · soulsmodding LockCamParam + Elden Ring
lock-on analysis (Jeleniauskas) · hakjak 180° rule.
