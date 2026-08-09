# Fragment: testing

This fragment is decisions, not commands. The test command lives in `package.json` or the equivalent, and the agent reads it there — restating it is a copy that goes stale.

What an agent cannot deduce is what the team decided.

## The core section

```markdown
## Testing

Test behaviour, not implementation. Implementation details are the things a user of the code never sees — internal state names, private methods, the shape of a handler. Asserting on them invents a third user, the tests themselves, that nobody benefits from.

A useful check: you should very rarely have to change tests when you refactor. Editing tests during a pure refactor is evidence they were asserting the wrong thing.

Reproduce a bug with a failing test before fixing it. A bug reaching a high-level test means two problems, the bug and the missing unit test.
```

The first rule matters most for an agent specifically: it has just read the implementation, so implementation-shaped assertions are the nearest thing to hand.

## Decisions to settle with the user

Each of these is invisible from the repo. Include only those with a real answer.

| Decision | Why it cannot be inferred |
|---|---|
| What "unit" means here — isolated, or allowed real collaborators | Both conventions are common; the existing tests rarely make it explicit |
| Which layer a new test defaults to | An agent otherwise mirrors whatever it read last |
| Whether a test is required with every change | The repo shows what was tested, never what was required |
| What is deliberately not tested | An untested module reads as an oversight to fix or a deliberate exclusion, and guessing wrong costs a review cycle either way |
| Whether existing tests may be modified | Determines whether a red test gets fixed or weakened |
| The bar for calling the work done | Without it, "done" drifts toward "the code compiles" |

The deliberate-exclusion row is the one most often left out and the one that pays best. Generated code, thin adapters and third-party wrappers are usually excluded on purpose, and nothing in the repo says so.

## Definition of done

```markdown
Before reporting the work complete: the full suite passes, the new test fails without the change, and no existing test was weakened or skipped to get there.
```

"The new test fails without the change" is the checkable part. A test that passes before the implementation exists is broken — delete it and write it again.

Note for the user: instructions in `AGENTS.md` are advisory. An agent may skip a check it judges unnecessary. Real gating needs CI or hooks, and held-out tests the agent never sees are the practical defence against a suite being tuned to pass.

## Per-stack notes

Include only when it changes what an agent would do.

- **Unity** — the Test Framework splits EditMode from PlayMode; which one a new test belongs in is a project decision worth stating.
- **Unreal** — two frameworks coexist. Automation Tests are engine-dependent; Epic says outright they are not ideal for pure unit testing, and the Catch2-based Low-Level Tests cover that case.
- **Vitest / Jest** — Vitest defaults `globals` to false while Jest injects them. Mock hoisting differs too: Vitest needs `vi.hoisted()` and a direct import.
- **Rust** — `#[cfg(test)]` modules can reach private items; each file under `tests/` is a separate crate limited to the public API. A binary-only crate cannot be integration-tested, which is why the lib-plus-thin-main split exists.

## Deliberately absent

Do not write a pyramid-versus-trophy position. Both authors say the distinction is largely a naming artifact, and the shapes were scoped to contexts that may not be yours. Fix the local vocabulary instead — that is the part an agent actually needs.

Do not cite numbers on coverage, over-mocking or test gaming. No retrievable study supports them. State a policy if you want one; do not dress it as evidence.

## Sources

- <https://kentcdodds.com/blog/testing-implementation-details>, <https://kentcdodds.com/blog/write-tests>
- <https://testing-library.com/docs/guiding-principles/>
- <https://martinfowler.com/bliki/TestPyramid.html>
- <https://agents.md>
