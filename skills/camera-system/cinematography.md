# Cinematography — shots, framing, dynamic systems

Cinematography theory applied to runtime/procedural game cameras. Each item: the
technique → how it maps to camera params → example. Uncertainty flagged `[?]`.

## Framing fundamentals → runtime params

Classical visual properties (size, vantage angle, visibility, on-screen position)
become **constraints / cost terms**; the camera-control problem is then viewpoint
computation + motion planning + editing.

- **Shot size** = subject's on-screen height → maps to camera distance and/or focal
  length (a target on-screen size, solvable analytically).
- **Rule of thirds** → a composer with a screen-space target offset (e.g. screen X
  = 0.33). **Headroom** → a vertical offset scaling with shot size. **Look-room /
  lead-room** → bias the screen offset *opposite* to the facing/velocity vector
  (aim cameras lead the move).
- **180° rule / line of action** → keep the camera on one side of the imaginary
  line through two subjects so screen-left/right stays consistent; constrain
  candidate positions to one half-space, reject cuts across it.
- **30° rule** → consecutive shots of the same subject must differ by ≥30° of angle
  or the cut looks like a jump cut → require an angular delta when switching vcams.
- **Eyeline match / shot-reverse-shot** → paired cameras (OTS A→B, B→A) on the same
  side of the line; the **Toric space** natively solves exact 2-target placement.

| Shot | Subject framing | Emotional read | Game mapping |
| --- | --- | --- | --- |
| Extreme Wide / Establishing | tiny in environment | scale, context | level reveal cam |
| Wide / Long | full body + env | context, vulnerability | default 3P distance |
| Medium | waist up | neutral, conversational | dialogue default |
| Medium Close-Up | chest up | engagement | OTS dialogue |
| Close-Up | face fills frame | emotion, intimacy | reaction beat |
| Extreme Close-Up | eyes/detail | tension | dramatic punch-in |
| Over-the-Shoulder | past a foreground shoulder | relationship, POV | shot-reverse-shot rig |

## Camera-movement language

| Move | Mechanic | Communicates | Implementation |
| --- | --- | --- | --- |
| **Pan / Tilt** | rotate on a fixed pivot | reveal; power (up) / weakness (down) | yaw/pitch on pivot |
| **Dolly** | translate toward/away | in = intensify; out = isolate | spring-arm length |
| **Truck** | translate laterally | follow, parallax | lateral rig translation |
| **Zoom** | change focal length | artificial "noticing" | FOV lerp |
| **Dolly-zoom (Vertigo)** | dolly one way + zoom the other, subject same size | vertigo, dread, realization | couple position + FOV so subject screen-size is invariant |
| **Crane / jib** | sweeping vertical+lateral arc | grandeur, godlike reveal | animated spline rig |
| **Handheld** | noise/shake | immediacy, chaos | Perlin noise on rotation+position |
| **Locked-off** | no movement | formality, unease, control | static vcam |

**Motivated vs unmotivated**: motivated movement is justified by subject action/
eyeline/story; unmotivated movement reads as distracting (GoW's director explicitly
sought a DP who "wouldn't just move the camera with no motivation").

## Dynamic / procedural cinematography systems

The academic and industry spine:

- **The Virtual Cinematographer** (He/Cohen/Salesin, SIGGRAPH 1996) — film idioms
  as hierarchical finite state machines; the seminal automatic real-time camera-
  directing paradigm.
- **Camera Control survey** (Christie & Olivier, 2008) — the taxonomy: viewpoint
  computation, motion planning, editing; constraint-based vs optimization-based.
- **Toric space** (Lino & Christie, SIGGRAPH 2015) — collapses the 7-DOF placement
  problem to a compact manifold; expresses exact on-screen position/size/vantage for
  2–3 subjects → directly applicable to dialogue/OTS framing (open-source ToricCam).
- **Film-directing survey** (Galvane/Christie/Ronfard, 2021) — formalizes 180°/30°/
  continuity as algorithmic constraints.
- **Cinemachine** (Unity) is the de-facto procedural virtual-camera system; its
  precursor was **Homeworld: Shipbreakers'** procedural cameras ("shooting blind"
  since virtual actors don't exist at design time → flatten 3D to 2D screen-space
  framing).
- **Left 4 Dead's AI Director** is the canonical procedural *pacing* director
  (intensity-driven Build-Up→Peak→Fade→Relax) — the conceptual parent of
  intensity-driven dynamic framing/music (see `world-time-weather` for the
  storyteller-vs-director distinction).
- **Camera modification volumes** (level-placed triggers that swap camera modes/
  framing on entry, with timed blends) are the practical "director volume" — see
  [combat-contexts.md](./combat-contexts.md). (A named IO Interactive "Director
  Volume" / "smart camera" could not be confirmed in public sources `[?]`.)

## Lens & exposure as storytelling

- **Focal length / FOV = emotional language**: wide (~16–35 mm) = more environment,
  stretched space, subject small/vulnerable; telephoto (~85–200 mm) = compressed,
  isolating → intimacy or claustrophobia/surveillance. Runtime: narrow FOV ≈
  telephoto compression, wide FOV ≈ wide-angle expansion.
- **Depth of field as attention direction**: shallow DoF isolates the subject; bind
  the focus distance to the gameplay/dialogue target. **Rack focus**: lerp the focus
  distance between targets on dialogue lines or target acquisition.
- **Chromatic aberration / lens distortion** are stylization knobs — divisive; use
  sparingly.

## Letterboxing & aspect

- **Cinematic bars** narrow the frame to *show less* (concentrating attention) and
  double as a mode signal ("this is a cutscene"). Engage on cinematic entry, restore
  on gameplay; letterbox cutscenes to their authored ratio so ultrawide doesn't
  reveal the off-camera void.
- **Ultrawide**: use **Hor+** FOV scaling (hold vertical FOV constant, extend
  horizontally) as the modern standard; anchor edge-HUD to a 16:9 safe zone;
  letterbox beyond ~32:9.

## Spectator & auto-director cameras

- **Two paradigms**: **rule-based** (predefined event priorities + timers move the
  camera to important events, damping over-frequent jumps — Dota/LoL/SC observers)
  vs **learning-based** (ML ranks future "importance" of events to predict engaging
  scenes; AdaRank learning-to-rank for Dota 2 reportedly beat a pro observer team).
- **The mapping**: an auto-director = event-importance scorer → target selection →
  smoothed camera goal → the same viewpoint-computation/motion-planning stack, with
  extra temporal smoothing (echoing the 30°/continuity rules). Kill-cams reframe the
  decisive moment from the killer's vantage `[?]` (specific framing rules are
  largely studio-internal).

## Flagged gaps — do NOT invent

A named "Director Volume" or Hitman/IOI "smart camera" auto-framing system is
unconfirmed in public sources · exact shot-size abbreviations vary by studio ·
kill-cam framing rules are partly non-public.

## Sources

Lino & Christie *Toric Space* (SIGGRAPH 2015) · Christie & Olivier *Camera Control
in Computer Graphics* (2008) · Galvane et al. film-directing survey (2021) · He et
al. *The Virtual Cinematographer* (SIGGRAPH 1996) · Unity Cinemachine docs · Orban
& Myhill *Procedural Cameras in Homeworld: Shipbreakers* (Unite 2015) · Booth *AI
Systems of Left 4 Dead* (GDC 2009) · GoW cinematography (Variety / GDC 2019) ·
In Depth Cine (focal length) · esports auto-director surveys.
