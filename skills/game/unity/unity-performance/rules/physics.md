# Rules: physics

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

### PH01 MeshCollider on a moving object
- Level: Warning
- Scope: any
- When: -
- Files: *.prefab, *.unity, *.cs
- Code: runtime
- Check: `^MeshCollider:|AddComponent<\s*MeshCollider\s*>`
- Reason: A MeshCollider tests contacts per triangle, the most expensive shape (cost order: sphere, capsule, box, mesh). On static level geometry it is normal; on an object with a Rigidbody it costs every step, and a non-convex one cannot be simulated by a non-kinematic Rigidbody at all.
- Fix: Approximate moving objects with primitive colliders, or mark the mesh Convex (at most 255 triangles). Keep non-convex MeshColliders for static geometry.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH03 Fixed Timestep shorter than 1/60 s
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: Physics and `FixedUpdate` run once per fixed step, so a step shorter than 1/60 s runs them more than once per frame at 60 FPS, and a slow frame adds more steps up to Maximum Allowed Timestep.
- Fix: Set Fixed Timestep to the simulation rate the game needs (1/50 or slower on mobile when feel allows), and cap Maximum Allowed Timestep so a hitch cannot cascade.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH04 Physics query on a per-frame path
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `Physics2?D?\.(Raycast|SphereCast|BoxCast|CapsuleCast|CircleCast|Linecast)(?:NonAlloc)?\s*\(`
- Reason: Each query runs broadphase and narrowphase on the main thread; many per frame, or one per object per frame, adds up.
- Fix: Lower the query rate, limit layers and distance, and batch many rays with `RaycastCommand` or `SpherecastCommand` in a job. See [architecture.md](../../unity-core/architecture.md#jobs-burst-ecs).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH05 Allocating physics query
- Level: Critical
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `Physics\.(RaycastAll|SphereCastAll|BoxCastAll|CapsuleCastAll|OverlapSphere|OverlapBox|OverlapCapsule)\s*\(|Physics2D\.(RaycastAll|CircleCastAll|BoxCastAll|CapsuleCastAll|LinecastAll|OverlapCircleAll|OverlapBoxAll|OverlapAreaAll|OverlapPointAll|OverlapCapsuleAll)\s*\(`
- Reason: These overloads allocate a new result array on every call, which becomes garbage collection hitches on a per-frame path.
- Fix: Use the `NonAlloc` overloads with a reused buffer (for `Physics2D`, the overloads that fill a reused `List`). See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH06 Raycast without a layer mask
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `Physics\.(Raycast|SphereCast|BoxCast|CapsuleCast)\s*\([^;]*\bout\s+(?:\w+\s+)?\w+\s*(?:,\s*[^,()]+)?\)`
- Reason: The call ends at the hit argument or one argument after it, so no layer mask is passed: it tests every layer in `DefaultRaycastLayers`, and without a distance it casts to infinity.
- Fix: Pass the max distance and a `LayerMask` holding only the layers the query needs.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH07 OnTriggerStay callback
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `void\s+OnTriggerStay(?:2D)?\s*\(`
- Reason: `OnTriggerStay` runs every physics step for every overlapping pair, so its cost grows with the number of overlapping triggers.
- Fix: Track overlaps with `OnTriggerEnter` and `OnTriggerExit`, and remove triggers that overlap permanently or serve no purpose.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH08 Dynamic Rigidbody on a script-driven object
- Level: Info
- Scope: any
- When: -
- Files: *.prefab, *.unity
- Code: any
- Check: MANUAL
- Reason: A non-kinematic Rigidbody is integrated every step even when script code moves it or it never needs forces.
- Fix: Make Rigidbodies kinematic when script code drives them, and let resting bodies sleep (Sleep Threshold) instead of waking them each frame.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH09 Auto Sync Transforms enabled
- Level: Warning
- Scope: any
- When: -
- Code: any
- Check: EDITOR
- Reason: With Auto Sync Transforms on, every physics query or step after a Transform change first pushes all pending Transform changes to the physics scene, so code that moves then queries pays the sync again and again.
- Fix: Turn Auto Sync Transforms off and call `Physics.SyncTransforms()` only where a query must see a move made earlier in the same frame.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH10 Layer Collision Matrix left fully enabled
- Level: Warning
- Scope: any
- When: -
- Files: DynamicsManager.asset, Physics2DSettings.asset
- Code: any
- Check: `m_LayerCollisionMatrix: f{256}\s*$`
- Reason: With every layer pair enabled, the broadphase pairs objects that never need to collide; the matrix is the cheapest place to remove those pairs.
- Fix: Disable every layer pair that does not need contacts or triggers.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH11 Non-physics work in FixedUpdate
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: MANUAL
- Reason: `FixedUpdate` can run several times in one frame when the frame is longer than the fixed step, so any work there multiplies, and slow steps cause more steps.
- Fix: Keep only force, velocity, and `MovePosition` code in `FixedUpdate`; move input, AI, and presentation to `Update` with cached references.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH12 Rigidbody moved outside FixedUpdate
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.Move(?:Position|Rotation)\s*\(`
- Reason: `MovePosition` and `MoveRotation` take effect at the next physics step; called from `Update`, several calls collapse into one step and interpolation stutters. Confirm the enclosing method.
- Fix: Call them from `FixedUpdate`, with interpolation on the Rigidbody for smooth rendering.
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)

### PH14 Collision contacts array read
- Level: Info
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.contacts\b`
- Reason: `Collision.contacts` allocates a new array on each access, once per collision callback.
- Fix: Read contacts with `contactCount` and `GetContact(i)`, or `GetContacts` into a reused list, and keep Reuse Collision Callbacks on. See [architecture.md](../../unity-core/architecture.md#allocations).
- Source: [Unity Performance Tuning Bible](https://github.com/CyberAgentGameEntertainment/UnityPerformanceTuningBible)
