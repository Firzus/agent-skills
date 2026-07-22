# Mechanism design notes

Use this contract to document a reverse-engineered mechanism well enough to
reimplement it. Remove sections that have no relevance, but keep the parameters,
edge cases, evidence tags, unknowns, and sources.

```markdown
# <Application> — <mechanism> design notes

## Summary

<What the mechanism does, and why its design is worth replicating.>

## Investigation scope

| Channel | Identity | Revision/build | Coverage |
| --- | --- | --- | --- |
| Source | <remote/path> | <commit/tag> | <paths traced> |
| Local | <publisher/platform> | <version/build> | <artifacts read> |
| Web | <sources> | <access/release dates> | <what they cover> |

## How it works

<Walk the mechanism from trigger to result. Add one small Mermaid flow or
sequence diagram.>

## Data structures and formats

| Structure | Shape/fields | Purpose | Evidence |
| --- | --- | --- | --- |
| <manifest/chunk/message> | <fields> | <role in the mechanism> | verified / assumed |

## Parameters

| Parameter | Value/default | Evidence |
| --- | --- | --- |
| <chunk size / parallelism / timeout / retry / backoff> | <value> | verified / assumed |

## Edge cases and failure handling

<Cancellation, pause/resume, partial-state recovery, retry policy, error paths.>

## Reimplementation sketch

<The steps and components needed to rebuild it, plus the risks — the assumed
details to validate first.>

## Open unknowns

| Topic | What is missing | Why it matters |
| --- | --- | --- |

## Sources

- <source-code permalink at the analyzed commit>
- <technical writeup or reimplementation project citation>
- <local build metadata or artifact record>
```

## Evidence tags

Tag every notable finding inline:

- **verified** — read directly in source, a local artifact, or reproduced output.
- **assumed** — inferred, or drawn from a secondary source not confirmed on the
  artifact.

Place citations beside the claims they support, not only in the Sources section.
Leave a gap marked as an open unknown rather than filling it with a plausible guess.
