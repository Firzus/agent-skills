# Maintain the domain vocabulary

Every project has CONTEXT.md at its root. Use the [CONTEXT template](../templates/CONTEXT.md) for an authorized creation; retain the existing useful structure when updating. A project with no specialized terms keeps a short statement of that fact, not invented definitions or an empty questionnaire.

Read the relevant terms when planning, designing, implementing, researching, or documenting behavior that depends on their meaning. Consult neighboring systems only where the distinction crosses a boundary. Resolve disagreement against project evidence and the domain owner; mark uncertainty rather than impose a guess.

Include terms whose meaning is specific, ambiguous, or easy to confuse in this project. Give each term a concise definition and its context. Add useful aliases, translations, or distinctions only when they prevent ambiguity. The same word may have different meanings in different contexts; qualify it rather than force one global definition.

Use the agreed terms in new code, interfaces, tests, work items, and documentation where applicable. Preserve public contracts and external names; explain an important mapping rather than silently renaming an API. A domain distinction is not a ban on the same word in an unrelated programming context.

When a change introduces or revises a domain concept, update its definition within the authorized scope. Link to docs/systems for detailed rules, responsibilities, and reasons; keep one definition per context. The glossary is neither a system specification, a code-symbol catalogue, nor a backlog.

Check definitions against the affected implementation or accepted domain decisions, links against their destinations, and usage in the changed artifacts. Keep unimplemented concepts visibly qualified.

**Done when:** relevant terms and distinctions have a single current definition, their context is clear, and uncertain or unimplemented meanings are explicit.
