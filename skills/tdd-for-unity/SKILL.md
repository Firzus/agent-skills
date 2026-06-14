---
name: tdd-for-unity
description: >-
  Test-driven development for Unity with the red-green-refactor loop adapted to
  the Unity Test Framework: EditMode-first tests for pure C# logic, PlayMode
  tests only for the player loop/physics/scenes, test asmdefs, and mocking
  engine boundaries. Use when building Unity features or bugfixes test-first, or
  when the user mentions Unity TDD, EditMode/PlayMode tests, NUnit `[Test]`,
  `[UnityTest]`, or the Unity Test Framework.
---

# Test-Driven Development for Unity

## Philosophy

**Core principle**: Tests verify behavior through public C# interfaces, not
implementation details. Code can change entirely; tests shouldn't.

**Good tests** exercise real code paths through public APIs and read like a
specification — "stamina regenerates after the cooldown" tells you what the
system does, not how. They survive refactors because they ignore internal
structure.

**Bad tests** couple to implementation: they reach into private fields, assert
on call order of internal collaborators, or verify through the scene graph
instead of the interface. Warning sign: the test breaks when you refactor but
behavior hasn't changed.

The single biggest lever in Unity: **keep game logic in plain C# and keep
MonoBehaviours as thin adapters.** Pure logic is tested in EditMode in
milliseconds; only behavior that genuinely needs the player loop, physics, or a
loaded scene goes to PlayMode. See [test-setup.md](./test-setup.md) for the
setup and [mocking.md](./mocking.md) for isolating engine boundaries.

## Anti-Pattern: Horizontal Slices

**DO NOT write all tests first, then all implementation.** Writing tests in bulk
tests _imagined_ behavior — you assert on the _shape_ of things (component
fields, method signatures) instead of observable behavior, and the tests go
insensitive to real changes.

**Correct approach**: vertical slices via tracer bullets. One test → one
implementation → repeat. Each test responds to what you learned from the
previous cycle.

```
WRONG (horizontal):        RIGHT (vertical):
  RED:   test1..test5        RED→GREEN: test1→impl1
  GREEN: impl1..impl5        RED→GREEN: test2→impl2
```

## Workflow

### 1. Planning

Before writing any code:

- [ ] Decide where the behavior lives — extract it into plain C# so it is
      testable outside a MonoBehaviour by default.
- [ ] Pick the test mode: **EditMode** (`[Test]`) for logic, **PlayMode**
      (`[UnityTest]`) only if it needs the player loop/physics/scene.
- [ ] Identify engine boundaries to inject behind interfaces (input, time,
      assets, save, network). See [mocking.md](./mocking.md).
- [ ] List the behaviors to test (not implementation steps); confirm priorities
      with the user. **You can't test everything** — focus on critical paths.

### 2. Tracer Bullet

Write ONE EditMode test that confirms ONE thing end-to-end:

```
RED:   Write [Test] for first behavior → fails
GREEN: Minimal C# to pass → passes
```

### 3. Incremental Loop

For each remaining behavior: `RED` (next test → fails) → `GREEN` (minimal code →
passes). One test at a time, only enough code to pass it, no speculative
features.

### 4. Refactor

Once green, look for refactor candidates — and never refactor while RED:

- [ ] Extract duplication and long methods into private helpers.
- [ ] Push remaining logic out of MonoBehaviours into the tested plain C#.
- [ ] Keep tests on the public interface so they survive the move.
- [ ] Re-run tests after each step.

## Checklist Per Cycle

```
[ ] Test describes behavior, not implementation
[ ] Test uses the public C# interface only
[ ] Logic is plain C#; MonoBehaviour stayed a thin adapter
[ ] EditMode by default; PlayMode only when the loop/physics/scene is required
[ ] Code is minimal for this test; nothing speculative added
```
