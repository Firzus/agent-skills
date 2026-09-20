# Document the current system

Use this method for a new system page, a substantial update, a documentation audit, or a retired system. Keep a small wording repair local.

## Establish ownership and evidence

System pages live in `<project>/docs/systems`. Find the page owning this system and update it rather than create a competing explanation. Use the [system template](../templates/system.md) for a new page, adapting its depth to the system instead of creating one page per directory. If existing agreements conflict with this location, report the conflict and resolve the affected scope before writing; do not reorganize unrelated documentation.

Read the implementation, callers, configuration, relevant tests, and existing page. Identify what is observed, planned, unverified, or obsolete. Ask for a structural rationale only when its reason cannot be established from available evidence; label unknown reasons rather than invent them.

## Write the useful current account

Use the template's core topics: purpose and boundaries, structure and interactions, behavior and constraints, and the change and verification map. Add state, security, concurrency, performance, or operational detail only when the system's risks require it. Omit empty optional sections and link to existing API references or runbooks rather than reproduce them.

Use root CONTEXT.md for domain definitions and link to it for unfamiliar terms. Keep the system's detailed rules here. A diagram is useful when it clarifies relationships, not as a mandatory deliverable. Keep planned behavior visibly separate from implemented behavior and label unknown reasons rather than reconstruct a decision history.

Local rationale stays beside the relevant code; cross-component context belongs here. Link to existing explanations rather than copying them. Removing a redundant comment does not require a new documentation paragraph.

## Update and verify

Change affected pages with the implementation. Replace obsolete statements instead of appending a contradictory new account. For a retired system, update its page and incoming references so readers cannot mistake it for an active system. Preview any requested deletion.

Check each material assertion against the actual source, then check links, commands cited as evidence, and consistency with neighboring pages. Distinguish documentary inspection from executed runtime checks.

**Done when:** readers can locate the current responsibilities, behavior, and reasons without following obsolete claims, and all unresolved evidence is explicit.
