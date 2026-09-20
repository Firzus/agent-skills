# System name

<!-- Authoring template for docs/systems/<system>.md. Replace prompts with verified current facts and remove this guidance. Keep depth proportional to the system; link authoritative details instead of copying them. -->

## Purpose and boundaries

*What outcome this system provides, for whom, what it owns, and what it leaves to other systems. Link relevant domain definitions in the root CONTEXT.md.*

## Structure and interactions

*Main responsibilities and collaborators, significant entry points and interfaces, ownership of shared state, and a representative flow across boundaries. Link the owning code and neighboring system pages. Add a diagram only if it clarifies these relationships.*

## Behavior and constraints

*Rules and invariants that a change must preserve, consequential failure or boundary behavior, and verified reasons for non-obvious structural constraints. Distinguish implemented behavior, accepted but unimplemented intent, and unknowns. Keep local implementation rationale beside the code.*

## Change and verification map

*Where to change behavior and where to verify it: link authoritative implementation, configuration, tests, and relevant evidence. Explain what checks establish, what was only inspected, and material coverage limits. Avoid a file inventory or a duplicate command/API manual.*

<!-- Add only risk-relevant sections: state and data lifecycle; security and privacy boundaries; concurrency and consistency; performance assumptions; operational failure and recovery (link runbooks); known limitations (link Linear work, not a local backlog). Omit empty sections. -->
