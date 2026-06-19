# Pipeline & internals (v2.8.0)

Ground truth from the source under `Assets/Plugins/MagicaCloth2/Scripts/`. Knowing this
explains *why* the tuning rules and gotchas hold.

## Integration method: PBD-style (not XPBD)

No `compliance` / `Lagrange` / XPBD in the source. Each step does semi-implicit velocity
prediction then **sequential position projections**, with `stiffness` as a 0–1 blend factor
scaled by the simulation frequency (`SimulationPower`). Practically: stiffness is **not**
timestep/iteration-invariant like XPBD — it's re-scaled to the 90 Hz substep so behaviour stays
stable across frame rates, but relative stiffness is empirical, not physical. Tune by eye.

> Context: modern realtime cloth (Macklin et al., *XPBD* and *Small Steps*) favours many
> substeps × 1 iteration for stiff, low-damping results. Magica follows the spirit — fixed-Hz
> substeps, one constraint pass per step — without the XPBD compliance formulation.

## Substeps: fixed-frequency, capped per frame

| Setting (MagicaSettings / SystemDefine) | Default | Range |
| --- | --- | --- |
| `simulationFrequency` | 90 Hz | 30–150 |
| `maxSimulationCountPerFrame` | 3 | 1–5 |

Per frame: `updateCount = floor(elapsed / (1/freq))`, clamped to `maxSimulationCountPerFrame`
(excess time is skipped, not accumulated forever). Low frame rates therefore **lose** cloth
steps (capped at 3) → cloth looks slower/laggy under heavy load; raise the cap cautiously
(cost scales linearly). One constraint pass per step (the old 2-pass loop is disabled).

## Constraint solve order (per step)

Pre: integrate velocity/position → apply local inertia, damping, gravity, wind, **Spring**
(fixed particles) → compute baseline reference pose. Then:

```
Tether → Distance → Angle (Limit then Restoration, ×3 inner) → Triangle Bending
       → Collider Collision → Distance (again, post-collision) → Motion → Self Collision
```

Post: friction, speed limit, centrifugal; velocity = (newPos − oldPos)/dt. Implication:
Distance runs twice (once after collision to repair stretching), and Angle Restoration gets 3
inner iterations — consistent with it being the dominant motion control.

## Update timing (why oscillation happens)

Magica injects into Unity's **PlayerLoop** (not MonoBehaviour Update). Cloth solves at
`AfterLateUpdate` by default; BoneCloth restores transforms at `afterEarlyUpdate`. The per-cloth
`ClothUpdateMode` selects the delta-time source:

| Mode | Delta source | Use when character moves in… |
| --- | --- | --- |
| `Normal` | `Time.deltaTime` | Update/LateUpdate, Animator = Normal |
| `UnityPhysics` | `fixedDeltaTime × FixedUpdateCount` | FixedUpdate, Animator = Animate Physics |
| `Unscaled` | `Time.unscaledDeltaTime` | timeScale=0 menus (Animator = Unscaled) |
| `AnimatorLinkage` | resolved from `Animator.updateMode` | **default-safe** — let it follow the Animator |

**Mismatch = unexplained jitter/oscillation.** If the character animates in Animate Physics but
cloth is Normal, it shakes. Prefer `AnimatorLinkage`.

## Build: runtime vs pre-build

- **Runtime build (default):** `Start()` → `AutoBuild()` → background thread builds proxy mesh,
  mapping, constraints from `serializeData` (+ selection). A few-frame startup delay; no asset to
  manage. `BuildAndRun()` triggers it manually (Play only); `OnBuildComplete` callback fires.
- **Pre-build (present in 2.8.0):** `PreBuildDataCreation.CreatePreBuildData(cloth)` bakes a
  `PreBuildScriptableObject` at edit time → no runtime build delay. Cost: must rebuild on any
  param/mesh/bone change or version bump; call `Warmup()` to pre-deserialize. Use for shipping
  perf once setups are final.

The proxy mesh is **always regenerated** at runtime unless pre-build is enabled; edit-mode only
stores `serializeData` + `serializeData2.selectionData`. That's why MeshCloth selection data is
the one edit-time artifact you must provide (no MeshCloth runtime auto-selection).

## Performance levers

- **Cost order:** Self-Collision ≫ Mutual collision > Edge collision ≫ Point collision. Default to
  Point; enable Self-Collision only on desktop/console with a low-vertex proxy.
- **Proxy vertex count** drives everything (visible in Inspector). Reduce for mobile.
- **Camera culling (present):** stops sim when the registered Renderer is offscreen — big win for
  FPS/VR. Modes: Off / Reset / Keep, or AnimatorLinkage. Register at least one renderer.
- **Release vs editor:** editor runs Burst/Jobs with extra monitoring → slower than a build.
  Enable Burst AOT + IL2CPP and profile on device, not in the editor.

## v2.8.0 feature gating (verified in source)

| Feature | 2.8.0 | Added |
| --- | --- | --- |
| Camera culling | ✅ present | 2.3 |
| Self-collision | ✅ present | — |
| Pre-build | ✅ present | — |
| AnimatorLinkage update mode | ✅ present | 2.7 |
| **Distance culling** | ❌ absent | 2.10 |
| **Batch jobs** (vs split) | ❌ absent | 2.14 |
| **Collider symmetry** (`ColliderSymmetryMode`, AutomaticHumanBody) | ❌ absent | 2.15 |

Online docs describe the latest version. Before using an API (e.g. symmetry, distance culling),
confirm it exists in this project's source, or recommend upgrading the package.
