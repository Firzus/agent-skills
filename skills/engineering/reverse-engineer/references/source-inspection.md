# Source repository inspection

Use this channel when a local path or remote repository is available. Keep the
inspection read-only and anchor every finding to the analyzed revision.

## Acquire and identify

1. Reuse a user-supplied checkout; otherwise clone into a new scratch directory.
2. Record the canonical remote, current commit, branch, tags, and dirty state.
3. Inventory files with `rg --files` (or the closest available equivalent) before
   opening individual files.
4. Separate first-party source from generated output, vendored code, fixtures,
   examples, and archived experiments.

Useful Git probes:

```bash
git remote get-url origin
git rev-parse HEAD
git branch --show-current
git status --short
git tag --points-at HEAD
```

## Trace the mechanism

Start from the entry point of the mechanism in focus and follow it through to its
effect, rather than surveying the whole product:

```text
trigger/entry -> orchestration -> data structures/state -> I/O (network/disk) -> result
```

| To reconstruct | Strong evidence |
| --- | --- |
| Where it starts | The command, handler, route, or worker that triggers the mechanism |
| How it is driven | The control loop, scheduler, or state machine coordinating the work |
| What flows through | Data structures, serialized formats, manifests, message/packet shapes |
| Its parameters | Constants and config for sizes, concurrency, timeouts, retry/backoff |
| Its edge cases | Error paths, cancellation/pause, resume, partial-state recovery |
| Where data goes | Storage adapters, cache layout, network clients, endpoints |

A dependency proves availability, not usage. A route name proves an entry point,
not a completed path. A test proves the asserted behavior for its fixture and
revision, not every deployment. Tag each finding **verified** (read in the code) or
**assumed** (inferred from naming or structure).

## Handle repository variants

- **Monorepo:** identify which package owns the mechanism; follow runtime edges
  into shared libraries and services it depends on.
- **Sparse documentation:** derive facts from executable paths; mark intent
  **assumed** unless first-party evidence states it.
- **Large repository:** start from manifests and the mechanism's entry point, then
  follow only reachable paths. Use targeted `rg` searches.
- **History-sensitive question:** map the current revision first, then inspect the
  releases, tags, or commits that changed the mechanism.

## Completion check

The source channel is complete when the trace records:

- canonical remote and exact commit;
- the mechanism's entry point and orchestration;
- the data structures and serialized formats it uses;
- the parameters governing sizing, concurrency, timeouts, and retries;
- the edge cases: errors, cancellation, resume, partial-state recovery;
- the storage, cache, and network endpoints it touches;
- unsupported inferences and version uncertainty, marked **assumed**.
