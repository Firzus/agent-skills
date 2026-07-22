# DSP & synthesis — the engine layer under the mix

The low-level audio-engine layer beneath the music/mix/spatial chapters:
the render thread, the core DSP effects, synthesis and procedural audio,
spatial DSP (HRTF, ambisonics, real occlusion), and the performance/codec
tech. **[ESS]** = essential for a typical game, **[OVK]** = overkill
outside VR/AAA/sim, `[?]` = uncertain.

## DSP fundamentals — the audio render thread

- **The callback / pull model** `[ESS]`: the driver pulls a block of N
  samples each callback; the DSP graph is evaluated *backwards from the
  output* — each node asks its inputs for their next block (MetaSounds is
  "a synchronous data-flow DSP graph… directed, acyclic, no feedback").
- **Buffer/latency math**: `latency_s = bufferSize / sampleRate`. At
  48 kHz: 256 → 5.33 ms, 512 → 10.67 ms, 1024 → 21.33 ms. Smaller buffer
  = lower latency but more callbacks/sec → higher overhead and underrun
  risk. 44.1 kHz (legacy/music) vs 48 kHz (game/video standard). (These
  are the "unofficial but convergent" DSP buffer values the architecture
  flagged.)
- **Control-rate vs audio-rate**: params update once per block (cheap) or
  per sample (for FM/modulation). True FM needs the modulator updated
  every sample.
- **Underrun/glitch**: if the callback misses its deadline, the driver
  plays silence/last buffer → a click. The real-time constraint is a
  *deterministic worst case*, not an average.
- **Never block the audio thread** `[ESS]`: no locks (priority inversion
  → glitch), no allocation, no file I/O. Communicate with main/worker
  threads via a **lock-free SPSC ring buffer** (single-producer single-
  consumer, atomic acquire/release, indices padded to a cache line,
  pre-allocated power-of-two capacity). This is the discipline behind the
  "missing debug tooling" and streaming-hitch pitfalls.
- **Sample-accurate scheduling**: events are timestamped to a sample
  offset *within* the block; the node renders sub-block segments so a
  trigger fires on the exact sample — the foundation under Quartz / Unity
  `PlayScheduled` quantization ([music-mix.md](./music-mix.md)).

## Core DSP effects — the algorithms

- **Filters (biquad / RBJ cookbook)** `[ESS]`: 2nd-order IIR,
  `H(z) = (b0 + b1 z⁻¹ + b2 z⁻²)/(a0 + a1 z⁻¹ + a2 z⁻²)`, with
  `w0 = 2π·f0/Fs`, `alpha = sin(w0)/(2Q)`. The **occlusion LPF** lowers
  the cutoff as obstruction rises (muffle through walls); Q≥0.5 or the
  cutoff shifts. Coefficients via the bilinear transform with frequency
  pre-warping (Bristow-Johnson, *Audio EQ Cookbook*).
- **Reverb**:
  - *Algorithmic* `[ESS]`: **Schroeder** (parallel combs + series
    allpass, delays mutually prime), **Freeverb** (8 combs + 4 allpass),
    or an **FDN — feedback delay network** (delay lines cross-coupled by
    a unitary matrix; Jot design gives frequency-dependent RT60). Cheap
    and parameterizable.
  - *Convolution* `[OVK per-source]`: convolve with a measured **impulse
    response** (partitioned/FFT convolution); photoreal but fixed (one
    room per IR) and CPU/latency heavy. **RT60** = the 60 dB decay time
    (the reverb anchors in [spatial.md](./spatial.md)).
- **Dynamics (compressor/limiter/gate)** `[ESS]`: detect envelope (peak/
  RMS) → gain reduction from a static curve (threshold, ratio — **∞:1 =
  limiter**, knee) → smooth with attack/release → apply. **Sidechain/
  ducking**: the dialogue bus drives gain reduction on the music bus (the
  ducking matrix in [music-mix.md](./music-mix.md)). A **brickwall
  limiter** with look-ahead and **true-peak (oversampled)** detection
  enforces the −1 dBTP target.
- **EQ**: peaking/shelf biquads (the frequency-slotting tool in
  [design-craft.md](./design-craft.md)). **Distortion/saturation**:
  waveshaping (tanh/soft-clip) — oversample to avoid aliasing.
- **Pitch/time** `[OVK runtime]`: **granular** (10–50 ms grains,
  respace/resample) or **phase vocoder** (STFT, synthesis hop ≠ analysis
  hop, needs phase-locking to avoid "phasiness").
- **Doppler**: `f' = f·(c + v_listener)/(c + v_source)`, implemented as a
  time-varying delay read-rate; engines apply it automatically and it's
  usually dialed back.

## Synthesis & procedural audio

- **Methods** (mostly `[OVK]` except MetaSounds patches): subtractive
  (osc → filter → amp env, the MetaSounds bread-and-butter), FM (cheap
  metallic/bell tones), wavetable, additive (expensive), granular.
- **The procedural / "no samples" philosophy**: sound as a *process* that
  runs in real time and reacts to events (rotor speed, RPM, impact
  velocity drive the model directly). Trade-off: tiny memory + infinite
  non-repeating variation + full interactivity, at the cost of CPU and
  often lower raw fidelity than a great sample (Farnell, *Designing
  Sound* — the procedural-audio bible).
- **Modal synthesis for impacts** (`[ESS]` if you go procedural — "every
  collision sounds different"): model a resonant object as a bank of
  damped sinusoids `y(t) = Σ aᵢ·e^(−t/τᵢ)·sin(2π·fᵢ·t)`, each mode =
  frequency + decay + gain; excite with an impulse scaled by collision
  velocity, vary mode gains per hit → endless variation from one model.
- **Procedural wind/water/fire/footsteps**: filtered noise + control
  envelopes (Farnell recipes; GameSynth, Nemisindo ship models).
- **MetaSounds as a procedural synth (UE5)** `[ESS for native UE5]`: a
  node-graph DSP (Max/Pd-like) — generators + filters/LFOs/envelopes/math
  → subtractive/FM patches, sample-accurate triggers, runtime control via
  the Builder API; custom C++ nodes via `IOperator`; acyclic for speed.

## Spatial audio DSP

- **HRTF / binaural** `[ESS headphones/VR]`: convolve a mono source with
  the left/right head-related transfer functions for its direction. Cues:
  **ITD** (interaural time difference, low-freq, ≤~0.6 ms), **ILD**
  (level difference, high-freq head-shadow), spectral pinna notches for
  elevation/front-back. Interpolate between measured directions (custom
  HRTFs via AES SOFA files).
- **Libraries**: Steam Audio (free, source-available: HRTF + occlusion +
  reflections + pathing, real-time or baked into probe batches), Meta
  Audio, Microsoft Project Acoustics, Sony Tempest 3D (PS5 hardware),
  Dolby Atmos.
- **Ambisonics** `[OVK except VR/360]`: scene-based, speaker-independent.
  B-format (W,X,Y,Z = 1st order), higher-order (HOA) for sharper
  directionality; encode sources into the field, rotate with the
  listener's head, decode to HRTF or speakers.
- **Occlusion — raycast-LPF vs real wave**:
  - *Cheap/common* `[ESS]`: a single source→listener ray; if blocked,
    LPF + attenuation (the [spatial.md](./spatial.md) approach). The
    "lamppost" problem — a thin post occludes like a wall; no
    diffraction.
  - *Steam Audio volumetric*: N rays over a source sphere → partial
    occlusion + material transmission + UTD diffraction.
  - *Project Acoustics / Triton* `[OVK outside AAA]`: **wave-based
    simulation baked offline** (voxelized geometry, like light-baking) →
    a lightweight runtime driving occlusion, portaling, arrival
    direction, and convolution-reverb banks with *real diffraction* — no
    manual zone markup. The "real occlusion" frontier.
- **Object- vs channel-based**: channel = pre-mixed for a speaker layout;
  object = audio + 3D metadata rendered to any layout at runtime (Atmos,
  Tempest). Speaker virtualization renders an object/bed binaurally over
  headphones.

## Voice / dialogue DSP

- **Runtime VO chains** `[ESS]`: telephone band-pass (~300 Hz–3 kHz) +
  light distortion + noise bed = the radio/walkie-talkie effect, as an
  insert on the source or bus.
- **Barks**: large pools of short context-tagged lines with cooldowns/
  priority/voice-limiting and pitch variation to mask repetition; usually
  streamed. `[?]`
- **Lip-sync / visemes from audio** `[OVK most; common cinematic/AAA]`:
  Oculus LipSync (audio → 15 visemes driving morph targets; now EOL);
  **JALI** (SIGGRAPH 2016 — force-align audio+transcript → editable
  viseme curves with co-articulation and jaw/lip params).

## Performance & memory tech

- **Codecs & decode cost** `[ESS decision]`: **PCM** (uncompressed, ~0
  CPU, big) → **ADPCM** (good compression, minimal CPU, 4:1 fixed) →
  **Vorbis** (good quality/size, moderate CPU) → **Opus** (best quality/
  size but ~5–10× ADPCM CPU, ~80 ms setup). Rule (Audiokinetic): **<200 ms
  sounds → Vorbis/ADPCM/PCM, not Opus**; short, hot, frequently-repeated
  SFX (gunshots) → keep **PCM/decoded in memory** to avoid per-trigger
  decode (the decompressed-audio memory pitfall is the other side of this
  dial).
- **Streaming vs in-memory**: stream large/one-shot assets (music,
  dialogue, ambience) to save RAM at the cost of I/O + first-play
  latency; keep short/hot SFX resident.
- **Voice virtualization** `[ESS]`: cap **physical (audible) voices** —
  the #1 CPU driver — and let below-threshold sounds go virtual (position
  tracked, no DSP). Typical target 30–70 (Switch/mobile ~30, console up
  to ~150).
- **Multi-threading**: a high-priority render thread + worker/decode
  threads, communicating via the lock-free queues above. **SIMD** the
  per-sample inner loops (filters, mixing, pan) with SSE/NEON.
- **CPU budget**: ~3–4 ms/frame (the CRYENGINE anchor); profile physical
  voices, plugin instances, and the expensive ones (convolution reverb,
  HRTF).

## Sources

Farnell, *Designing Sound* (MIT Press) · Bristow-Johnson *Audio EQ
Cookbook* · J.O. Smith *Physical Audio Signal Processing* (CCRMA, FDN/
reverb) · Laroche & Dolson (IEEE TSAP 1999, phase vocoder) · Rane Note
155 *Dynamics Processors* · Valve Steam Audio C API docs · Microsoft
Project Acoustics / Triton · Epic MetaSounds (Phil Popp AES, Aaron
McLeran) · Audiokinetic "Choosing the Right Codec" / "Optimizing CPU" ·
JALI (SIGGRAPH 2016) · GameSynth/Tsugi, Nemisindo · canonical: Ross
Bencina "Real-time Audio Programming 101", Will Pirkle *Designing Audio
Effect Plugins in C++*. Overkill flags: convolution reverb per-source,
HOA ambisonics, wave-baked acoustics, runtime phase-vocoder, audio-driven
lip-sync, Opus for short SFX.
