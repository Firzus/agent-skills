# Mocking Engine Boundaries

Mock at **engine/system boundaries** only — the things you don't control and
that make logic non-deterministic or scene-dependent:

- Input (Input System actions / devices)
- Time (`Time.deltaTime`, `Time.time`, frame timing)
- Asset loading (Addressables, `AssetReference`)
- Persistence (save files, `PlayerPrefs`, disk)
- Network / online services
- Randomness

**Don't** mock your own classes, your own MonoBehaviours, or internal
collaborators. If you find yourself mocking your own code, the logic probably
belongs in a plain C# object you can test directly.

## Pattern: pure logic + thin adapter

Keep game logic in plain C# that receives its dependencies; let the MonoBehaviour
be a thin adapter that wires real engine services in. This makes the logic
testable in EditMode without a scene.

```csharp
// Boundary as an interface (injected) — easy to fake in a test
public interface IClock { float DeltaTime { get; } }

// Pure logic: no MonoBehaviour, no statics, fully testable in EditMode
public sealed class CooldownTimer
{
    readonly float _duration;
    float _elapsed;

    public CooldownTimer(float duration) => _duration = duration;
    public bool IsReady => _elapsed >= _duration;
    public void Tick(IClock clock) => _elapsed += clock.DeltaTime;
}

// Thin adapter: the only place that touches the engine
public sealed class AbilityBehaviour : MonoBehaviour
{
    sealed class UnityClock : IClock { public float DeltaTime => Time.deltaTime; }

    readonly IClock _clock = new UnityClock();
    CooldownTimer _timer;

    void Awake() => _timer = new CooldownTimer(duration: 2f);
    void Update() => _timer.Tick(_clock);
}
```

## Faking in a test

No mocking framework required — a hand-written fake is clearest:

```csharp
sealed class FakeClock : IClock { public float DeltaTime { get; set; } }

[Test]
public void Becomes_ready_after_duration()
{
    var timer = new CooldownTimer(duration: 2f);
    var clock = new FakeClock { DeltaTime = 1f };

    timer.Tick(clock);
    timer.Tick(clock);

    Assert.IsTrue(timer.IsReady);
}
```

This keeps the dependency injectable, the test deterministic, and the assertion
on observable behavior (`IsReady`) rather than internal fields.
