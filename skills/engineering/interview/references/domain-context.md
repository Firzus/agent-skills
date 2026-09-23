# Define context without changing the repository

## Read and reconcile

Follow the project's existing context-document conventions. Use root `CONTEXT.md`
and its mapped glossaries only where that convention is adopted. If no location
is established and durable definitions are needed, propose one for approval;
missing `CONTEXT.md` alone does not require project setup.

| Source | Meaning |
| --- | --- |
| Project-designated context documents and glossaries | Context integrated into the repository version |
| Owning Linear issue | Accepted changes awaiting integration, not a second complete context document |

1. Read both sources for the requested outcome. Verify integration from linked
   delivery evidence, not issue status alone.
2. Establish what the project does, for whom, and the relevant concepts. Resolve
   ambiguity with scenarios: does closing an account end access, billing, or both?
3. Separate current behavior from intended behavior. Resolve conflicting pending
   changes with the user and record dependencies; inaccessible decisions leave
   affected readiness unknown.

Use one accepted term per concept **within its context**; preserve distinct meanings
across contexts and public names/contracts. Terminology agreement does not authorize
code renaming. Include aliases/translations only when useful.

**Done:** relevant meanings and conflicts resolved; unknown domain meaning stays open.

## Prepare the context delta

Leave repository context files unchanged during the interview. Put only the delta
in the issue draft, labeled **Accepted, not integrated**:

- Target document/section; addition, change, or removal; rationale.
- For each term: meaning, context, and important distinctions.
- Links to deltas owned by other issues instead of copies.
- If creating a context document is approved: its agreed location, a short domain
  description, and accepted definitions for delivery during implementation. Reuse
  existing documents where possible; avoid invented specialist vocabulary.

Include these delivery requirements in the issue:

1. Re-read repository context and accepted deltas before implementation; reconcile
   intervening changes and reopen consequential conflicts.
2. Deliver the issue's code and context changes in the same commit and PR. For a
   delta owned elsewhere, link its required outcome as a dependency rather than
   duplicating its delivery. State whether that prerequisite is a decision,
   accessible artifact, or integrated change. Preserve document structure and owners.
3. Verify the context matches delivered behavior; record the delivery reference.
   Mark a delta integrated only after integration is confirmed.

A context-only clarification gets a bounded documentation task rather than waiting
for an unrelated feature. The interview prepares the issue, not its PR.
Keep definitions/deltas accessible to the implementer; missing required artifacts
are prerequisites.

**Done:** accepted delta and delivery requirements are in the approved issue.
**Pending publication:** retain the draft until Linear publication is authorized
and available. Domain definition is required before product implementation is ready.

## Consequential rationale

Use an architecture decision record (ADR) only for a costly-to-reverse trade-off
whose rationale would otherwise surprise future readers.

- Reuse the project's format/location; otherwise propose `docs/adr/`.
- Draft problem, alternatives, accepted choice, consequences, and evidence in the
  issue for delivery with implementation.
- Keep ordinary choices in the brief; rejected alternatives need no separate archive.
