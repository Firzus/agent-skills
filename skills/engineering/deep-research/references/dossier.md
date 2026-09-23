# Keep a durable evidence dossier

## Storage

- Default outside Git: `%LOCALAPPDATA%/agent-research/<topic>/<YYYY-MM-DD>-<run-id>/`
  on Windows; `~/.local/share/agent-research/<topic>/<YYYY-MM-DD>-<run-id>/` elsewhere.
- Resolve the absolute destination and verify the default is outside a Git worktree.
  An explicitly requested location overrides the default, including a repository
  location only when that write scope is authorized. It does not authorize committing
  or publishing the files.
- Create a unique folder without overwriting prior research. If the default is
  unavailable, ask for another location rather than silently writing into the project.
- This is durable local working storage, not an OS temp folder or shared archive.
  Keep it until requested cleanup; resume at its recorded path instead of duplicating it.

## Records and ownership

Create only three initial records:

| File | Contents |
| --- | --- |
| `overview.md` | Objective, scope, approved plan, status, synthesis, limits, next decision |
| `evidence.md` | Source register, claim ledger, verification verdicts |
| `research-log.md` | Question/assignment map, queries, gaps, scope decisions, resume checkpoint |

Add `contributions/<assignment-id>.md` only for an actual delegated assignment.
Give workers disjoint paths and source/claim prefixes; keep one writer of the canonical
records during consolidation. Preserve source provenance when deduplicating origins.

| Entry | Required fields |
| --- | --- |
| Source | Stable ID, title, owner/author, URL/path, consulted date, publication/update date or unknown, version/commit, precise locator, access limits |
| Claim | Stable ID, statement, supporting source IDs/passages, source origins, contrary evidence, applicability, verdict and reason, outstanding verification |
| Assignment | Role, scope, dependencies, output path, completion status, uncovered questions |

Explain confidence through evidence quality and gaps, not invented probabilities.
Do not relabel inaccessible claims as disproven. Keep explicit failures instead of
filtering missing worker results out of the coverage map.

## Resume

Record completed questions, open gaps, next queries, limits already spent where
known, pending decisions, and exact files to read. Reconcile current work with that
checkpoint; revalidate affected volatile claims and mark superseded conclusions with
their reason. Preserve IDs and provenance instead of overwriting research history.

## Publish only when requested

Research authorizes the local dossier, not an external write. Present proposed
content, action, and destination for approval before publishing or updating a shared
issue/document. Re-read existing records, preserve concurrent content, and verify
returned state. Inspect partial success before retrying; report exact pending operations.

Return a concise chat summary and an absolute link to `overview.md`. If sharing is
requested, explain that teammates cannot use local paths; publish only approved safe
content through available tools. Never substitute another tracker or claim an upload
occurred when the report remains local.
