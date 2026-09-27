# Document the current system

Use this method for a new system page, a substantial update, a documentation audit, or a retired system. Keep a small wording repair local.

## Decide whether a page is warranted

A system page explains a mechanism that spans several files and stays non-intuitive even after reading them: what local comments cannot explain on their own. Explain behavior confined to one location with a comment beside the code instead. Each system has exactly one Markdown file, `docs/systems/<system>.md`.

## Establish ownership and evidence

Find the page owning this system and update it rather than create a competing explanation. Use the strict [system template](../templates/system.md) for a new page, and bring an existing page to it when you substantially update it; adapt the depth of each section to the system, not the set of sections. If existing agreements conflict with this location, report the conflict and resolve the affected scope before writing; do not reorganize unrelated documentation.

Read the implementation, callers, configuration, relevant tests, and existing page. Identify what is observed, planned, unverified, or obsolete. Ask for a structural rationale only when its reason cannot be established from available evidence; label unknown reasons rather than invent them.

## Write the useful current account

Fill the template's four sections: purpose and boundaries, structure and interactions, behavior and constraints, and the change and verification map. Put state, security, concurrency, performance, or operational detail under behavior and constraints when the system's risks require it. Link to existing API references or runbooks rather than reproduce them.

Link unfamiliar terms to the project's designated context documents or glossaries. Use root `CONTEXT.md` only where that convention is adopted. Keep the system's detailed rules here. A diagram is useful when it clarifies relationships, not as a mandatory deliverable. Keep planned behavior visibly separate from implemented behavior and label unknown reasons rather than reconstruct a decision history.

For accepted context changes from an issue, follow [context delivery](intake-and-handoff.md#deliver-context-with-the-change).
Describe the behavior of the repository version being changed; an updated page in
a PR does not establish integration or deployment.

Local rationale stays beside the relevant code; cross-component context belongs here. Link to existing explanations rather than copying them. Removing a redundant comment does not require a new documentation paragraph.

## Update and verify

Change affected pages with the implementation and set their "Last updated" date to the date of the change. Replace obsolete statements instead of appending a contradictory new account. For a retired system, update its page and incoming references so readers cannot mistake it for an active system. Preview any requested deletion.

Check each material assertion against the actual source, then check links, commands cited as evidence, and consistency with neighboring pages. Distinguish documentary inspection from executed runtime checks.

**Done when:** readers can locate the current responsibilities, behavior, and reasons without following obsolete claims, and all unresolved evidence is explicit.
