# Document the current system

Use this method for a new system page, a substantial update, a documentation audit, or a retired system. Keep a small wording repair local.

## Establish ownership and evidence

Find the project's approved documentation home and the page owning this system. Reuse that location and structure. If no convention exists, propose a minimal location and confirm the missing project decision; do not introduce a repository-wide documentation scheme.

Read the implementation, callers, configuration, relevant tests, and existing page. Identify what is observed, planned, unverified, or obsolete. Ask for a structural rationale only when its reason cannot be established from available evidence; label unknown reasons rather than invent them.

## Write the useful current account

Include only what helps a reader understand or change the system:

- responsibility and boundaries;
- public inputs, outputs, interfaces, and important invariants;
- interactions, ownership of state, and consequential failure behavior;
- still-valid reasons for structural choices;
- verification evidence and remaining limitations;
- links to the authoritative code or narrower document.

Use domain terms and explain unfamiliar ones. A diagram is useful when it clarifies relationships, not as a mandatory deliverable. Keep planned behavior visibly separate from implemented behavior.

Local rationale stays beside the relevant code; cross-component context belongs here. Link to existing explanations rather than copying them. Removing a redundant comment does not require a new documentation paragraph.

## Update and verify

Change affected pages with the implementation. Replace obsolete statements instead of appending a contradictory new account. For a retired system, update its page and incoming references so readers cannot mistake it for an active system. Preview any requested deletion.

Check each material assertion against the actual source, then check links, commands cited as evidence, and consistency with neighboring pages. Distinguish documentary inspection from executed runtime checks.

**Done when:** readers can locate the current responsibilities, behavior, and reasons without following obsolete claims, and all unresolved evidence is explicit.
