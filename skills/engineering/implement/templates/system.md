# <System name>

Last updated: <YYYY-MM-DD>

<!-- Strict template for docs/systems/<system>.md: one system per file. Keep the four sections in this order, write "None" in a section without content, and add no other section. Set "Last updated" to the date of every content change. Replace prompts with verified current facts, link authoritative details instead of copying them, and remove this comment. -->

## Purpose and boundaries

*What outcome this system provides, for whom, what it owns, and what it leaves to other systems. Link relevant domain definitions in the project's designated context documents or glossaries.*

## Structure and interactions

*Main responsibilities and collaborators, significant entry points and interfaces, ownership of shared state, and a representative flow across boundaries. Link the owning code and neighboring system pages. Add a diagram only if it clarifies these relationships.*

## Behavior and constraints

*Rules and invariants that a change must preserve, consequential failure or boundary behavior, and verified reasons for non-obvious structural constraints. Include state lifecycle, security, concurrency, performance, or operational constraints when a change could break them. Distinguish implemented behavior, accepted but unimplemented intent, and unknowns. Keep local implementation rationale beside the code; link known limitations to Linear work.*

## Change and verification map

*Where to change behavior and where to verify it: link authoritative implementation, configuration, tests, and relevant evidence. Explain what checks establish, what was only inspected, and material coverage limits. Avoid a file inventory or a duplicate command/API manual.*
