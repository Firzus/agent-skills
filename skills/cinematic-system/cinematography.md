# Cinematography — film language, camera/lens, lighting, virtual production

The craft layer the timeline serves: shot grammar, camera and lens
language, cinematic lighting, and the virtual-production / mocap / realtime
tech that produces it. The timeline/binding engineering is in
[timeline-transitions.md](./timeline-transitions.md); production logistics
in [production.md](./production.md). `[P]` praised, `[C]` criticized, `[?]`
uncertain. Canonical print refs (*Grammar of the Shot*, *Five C's of
Cinematography*) underpin §1–3 but weren't directly fetched — flagged.

## Film language & shot grammar

The master framework is **continuity editing**: spatial/temporal legibility
so cuts go unnoticed. The component rules all serve it:

- **180-degree rule / axis of action**: keep the camera on one side of the
  line between two subjects so screen positions (A frame-right, B
  frame-left) stay stable. Crossing it ("jumping the line") reverses
  positions and disorients — break deliberately for unease. To move across
  legally, cut to a **neutral shot on the line** or **arc the camera across
  on-screen** within a take (a no-cut camera like GoW *must* physically
  arc, never cut).
- **30-degree rule**: between two shots of the *same* subject, shift the
  camera ≥30° (or change shot size one step) or you get a **jump cut**.
- **Shot/reverse-shot**: the dialogue workhorse — alternate over-the-
  shoulder singles respecting the 180 line + 30° + eyeline; classical
  coverage cuts ~every 7–8 s.
- **Establishing shot (ELS/LS)**: orient the viewer before going tighter;
  *omitting* it builds suspense (GoW dropped wide establishers to keep
  Kratos in frame).
- **Eyeline match** + **looking/nose room**: a gaze in shot A aligns with
  the target's position in B, with extra frame space in the gaze
  direction.
- **Cut on action (match-on-action)**: cut mid-movement (turn, reach) so
  the motion masks the edit — the workhorse of invisible editing.
- **J-cut / L-cut (split edits)**: offset audio from picture. **J-cut**
  (next scene's audio leads the picture) pulls forward, builds tension;
  **L-cut** (outgoing audio lingers over new picture) gives release/
  reflection. Essential for naturalistic dialogue.
- **Composition**: rule of thirds, headroom, lead room, leading lines,
  fg/mg/bg depth. **Close-up = emotion** (fills the frame with a face);
  the BCU reads as tension/guilt, used sparingly.

| Shot | Abbr | Framing | Narrative job |
| --- | --- | --- | --- |
| Extreme Long / Wide | ELS/EWS | subject tiny in space | when/where — scale, isolation, establish |
| Long / Wide | LS/WS | full figure + environment | where — spatial context |
| Full | FS | head-to-toe | body language, blocking |
| Medium | MS | waist up | what — actions, dialogue staple |
| Medium Close-Up | MCU | head + shoulders | how — subtle, subjective |
| Close-Up | CU | face + collar | who — emotion, reaction, intro |
| Extreme Close-Up | ECU/BCU | eyes / detail | why — interiority, intensity |
| Over-the-Shoulder | OTS | past a fg shoulder | dialogue, relationship, 180-anchor |
| Point-of-View | POV | what they see | subjectivity / immersion |

## Camera movement & lens craft

- **Move vocabulary**: pan (rotate horizontal), tilt (vertical), **roll/
  Dutch** (lens axis → unease), dolly (in/out), truck (lateral), pedestal
  (vertical), crane/jib (sweeping arc), handheld (organic) vs stabilized
  (floating). In games these map to camera-rig channels in Sequencer/
  Cinemachine.
- **Focal length = emotional language**: **wide (≤24–35 mm)** exaggerates
  space and distorts faces, feels impersonal; **telephoto (85–135 mm+)**
  compresses depth and isolates → intimacy. `[P]` God of War: Dori Arazi
  read a **24 mm** wide as impersonal, then **zoomed to 120 mm** for Kratos
  gathering his wife's ashes for "compressed internal space."
- **Dolly zoom ("zolly"/Vertigo)**: dolly one way while zooming the
  opposite; the subject stays the same size while the background warps —
  vertigo / dawning realization / dread. Best at 50–135 mm.
- **Depth of field / focus**: aperture (f-stop) sets DOF + bokeh; a **rack
  focus** shifts the sharp plane between subjects to redirect attention.
  Engines model this physically (see realtime tech below).
- **Camera shake / handheld sim**: procedural noise for documentary
  realism — GoW deliberately shot "like WWII found-footage" and "worked
  hard to make our visuals look worse" for believability.
- **Motivated movement / "camera as a character"** `[C]` the unmotivated
  move: every move should be motivated by action/emotion — "if done right
  you'd never notice there's a camera operator" (Arazi). A single-take
  design means the camera is physically present, never teleporting.

## Lighting & color for cinematics

- **Three-point lighting**: **key** (~45° off-axis, defines the look),
  **fill** (opposite, lifts shadows — key:fill ~1:1 bright, **3:1**
  moody), **rim/back** (separates subject from background). Match color
  temp; 5600 K daylight standard.
- **The realtime relight problem**: cutscenes often *override* the
  gameplay lighting rig for drama, so the cinematic lighting must blend
  back at the seam or the world "pops" — lighting continuity across the
  gameplay↔cinematic boundary is a known pipeline pain. `[?]`
- **Color grading**: a **technical LUT** (log → display transform) first,
  then a **creative grade** (color wheels + HSL secondaries) for skin-tone
  control. **Teal-and-orange** (shadows → teal, skin → orange) separates
  the subject by hue alone — `[P]` instant "cinematic", `[C]` clichéd/
  overused. **Volumetrics / god rays** add depth; **day-for-night** grades
  a day capture to read as night.

## Virtual production & virtual cameras

- **Virtual camera (vcam)**: operate a tracked physical device (iPad/
  iPhone or a shoulder rig) that drives the in-engine camera so CG scenes
  are shot like live action. **UE Virtual Camera / VCam Actor** (5.1+) uses
  ARKit/Live Link + Pixel Streaming to the iOS app; **Unity** uses
  Cinemachine + a virtual-camera workflow.
- **LED volume / ICVFX (The Mandalorian / ILM StageCraft)** `[P]`: actors
  perform inside a ~20 ft × 270° LED wall (75 ft performance space); UE
  renders environments live. **Inner frustum** = the camera's FOV at full
  perspective-correct resolution (4K–8K+), tracked for true parallax;
  **outer frustum** = lower-res, providing interactive lighting/
  reflections. Caveat: ~10–12 frames (~½ s) latency, so the frustum was
  rendered ~40% larger than the FOV to hide the seam.
- **Simulcam (Avatar)**: a tracked live-action camera composites CG
  characters into the viewfinder in realtime so actors interact with CG
  and the DP reframes live.
- **Virtual scout**: tour CG sets in VR before physical build (place
  lights, block scenes).
- **The convergence**: UE is now the realtime backbone of high-end film/TV
  virtual production — and the *same engine renders both the cutscene and
  the shipped game frame*.

## Performance capture

- **Optical marker (Vicon, OptiTrack)** `[P]` gold standard: retroreflective
  markers + IR cameras triangulate a skeleton up to 240 fps (8–32 cameras),
  sub-mm precision, multi-actor — high capex + cleanup labor.
- **Inertial (Xsens, Rokoko)**: body-worn IMUs, shoot anywhere, up to
  240 Hz, no motion blur; `[C]` positional drift, magnetic interference,
  body-only.
- **Markerless / AI (Move.ai, Radical)**: computer-vision pose from
  ordinary video (~60 fps), cheapest, zero prep; `[C]` weaker on airborne/
  fast/occluded motion — production-usable for non-hero, optical/inertial
  still win for **hero** characters.
- **Facial**: head-mounted cameras (Faceware, Dynamixyz), a **FACS/
  blendshape** rig (ARKit = 52 named coefficients), 4D scan for ground
  truth. **MetaHuman Animator** (Epic, GA 2023): capture via iPhone
  TrueDepth / stereo HMC / mono / **audio-only**; builds an identity from
  3 frames + depth, outputs named Face Control Rig curves — **face-only**,
  body from external Live Link.
- **Full performance capture** (body + face + voice at once): the Naughty
  Dog / Andy Serkis model — the AAA narrative standard. **Finger capture**
  via mocap gloves (MANUS).
- **Cleanup → solve → retarget**: raw markers → solve to skeleton →
  cleanup (gap-fill/denoise) → **retarget** onto the game rig (IK
  Retargeter / HumanIK) to handle actor→character proportion mismatch.

## Realtime cinematic tech (engine craft)

- **Physical camera model**: both engines emulate **filmback/sensor size
  (mm) + focal length (mm) → FOV**, plus f-stop and focus distance. `[?]`
  gotcha: "Super 35" is ambiguous (UE preset 24.889×18.66 mm vs a BMD
  22×11.88 mm) — set the sensor W/H to the *actual* camera or focal length
  is off.
- **Realtime DOF + post**: physically-based depth of field, bloom,
  exposure, motion blur run live in the cinematic viewport.
- **Sequencer (UE) / Timeline + Cinemachine (Unity)**: a **Camera Cut
  track**, multiple CineCameras, the cinematic viewport, blends authored on
  the timeline. **Take Recorder** records vcam/Live Link/gameplay takes
  straight into the sequence.
- **Movie Render Queue / Movie Render Graph**: the offline high-quality
  render-to-video path (the "render the cutscene from the engine" workflow
  that fixes the seam — [production.md](./production.md)). Levers: spatial
  vs temporal AA samples; **warm-up frames** to build TAA/TSR history and
  settle auto-exposure/cloth/Lumen (rules of thumb: Lumen >32 frames,
  cinematic motion >64, complex particles >128); the **Path Tracer** for
  film-quality GI (accumulates samples; each extra sample multiplies render
  time). Lumen/Nanite in cinematics, path tracing as the offline upgrade.

## Sources

*Cinematic Language* (writingwithacamera) · StudioBinder (shot sizes,
dolly zoom) · *The Grammar of TV and Film* (Chandler) · Biblo "Cutting for
Feeling" (J/L-cuts) · GDC 2019 Dori Arazi "The Cinematography of God of
War" · Variety (GoW single-shot, 100 takes) · Pixflow / Cinecom (three-
point lighting, teal-orange) · ILM StageCraft / fxguide / ASC "This Is the
Way" (Mandalorian) · ASC "Conquering New Worlds: Avatar" (simulcam) · UE
Virtual Camera docs · MoCap Online / Xsens / Vicon (mocap) · metahuman.com
(MetaHuman Animator) · UE CineCameraActor / Movie Render Queue / Path
Tracer docs · Unity URP Physical Camera docs. Flags: realtime-relight
numbers, Medusa 4D specs, and exact ND perf-cap figures are practitioner-
knowledge, not individually sourced; treat frame/latency/mm numbers as
version-dependent.
