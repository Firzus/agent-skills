# Test Setup — asmdefs, EditMode vs PlayMode

## Test assembly definitions

Production code must live in custom asmdefs, not `Assembly-CSharp`: test
assemblies can reference your asmdefs but **cannot reference `Assembly-CSharp`**,
so logic stuck in the default assembly is untestable.

- Create a separate asmdef per test suite, referencing the production asmdef
  under test plus the Test Framework assemblies.
- Mark the test asmdef as an **editor/test-only** assembly so test code never
  ships in a build.
- Keep one EditMode asmdef and, when needed, one PlayMode asmdef.

```
Assets/
├── Scripts/Combat/Combat.asmdef            # production logic (plain C#)
└── Tests/
    ├── EditMode/Combat.EditMode.asmdef     # references Combat + nunit
    └── PlayMode/Combat.PlayMode.asmdef     # references Combat + nunit (Test Assemblies)
```

## EditMode vs PlayMode

| | EditMode | PlayMode |
| --- | --- | --- |
| Attribute | `[Test]` (or `[UnityTest]` to skip frames) | `[UnityTest]` |
| Runs in | Editor, no player loop | Player loop running |
| Speed | Milliseconds | Seconds (enters Play) |
| Use for | Pure C# logic, math, state machines, data | Physics, coroutines, scene load, `MonoBehaviour` lifecycle |
| Default? | **Yes** | Only when the loop/physics/scene is required |

Prefer `[Test]` over `[UnityTest]` unless you must yield to advance frames. Avoid
timing-dependent PlayMode tests — yield on conditions, not on wall-clock delays.

## EditMode example (pure logic)

```csharp
using NUnit.Framework;

public class StaminaPoolTests
{
    [Test]
    public void Drains_by_spent_amount()
    {
        var stamina = new StaminaPool(max: 100f);

        stamina.Spend(30f);

        Assert.AreEqual(70f, stamina.Current);
    }

    [Test]
    public void Cannot_drain_below_zero()
    {
        var stamina = new StaminaPool(max: 100f);

        stamina.Spend(150f);

        Assert.AreEqual(0f, stamina.Current);
    }
}
```

## PlayMode example (needs the player loop)

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

public class ProjectileTests
{
    [UnityTest]
    public IEnumerator Moves_forward_over_time()
    {
        var go = new GameObject();
        var projectile = go.AddComponent<Projectile>();
        var start = go.transform.position;

        yield return null; // let one frame of the player loop run

        Assert.Greater(go.transform.position.z, start.z);
    }
}
```

Run tests headless in CI on every PR (`-runTests`, GameCI test-runner) — tests
that don't gate merges decay.
