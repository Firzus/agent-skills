# Create or update project instructions

## Inspect before proposing

- Locate root, ancestor, scoped, and user-level instructions relevant to the target.
  Check project agreements, architecture boundaries, generated files, and verification
  sources before declaring constraints.
- Verify the target host's actual file discovery, scope, and import behavior using
  applicable documentation/version evidence. A link is not necessarily an import;
  root and descendant instructions are not loaded identically by every host.
- Keep one authoritative policy across root and scoped instructions. Use precise
  references instead of copying the same rules into multiple files.

**Done:** effective ownership is understood; untested loading assumptions are explicit.

## Cover the template selectively

Use [the AGENTS template](../templates/agents-template.md). Consider every category in order;
omit headings without useful content. Preserve a useful existing structure for
narrow updates rather than force a cosmetic rewrite.

| Category | Include when useful | Keep elsewhere |
| --- | --- | --- |
| Project and scope | Purpose, affected area, meaningful local boundaries | Full repository tour or persona |
| Sources of truth | Where authoritative context, pending decisions, and system docs live; when to consult them | Glossary, backlog, copied specifications |
| Project constraints | Non-obvious architecture, compatibility, generated-file rules, risky boundaries | Generic language/style tutorials; linter configuration copies |
| Validation | Required checks, unusual commands, prerequisites, working directory, known limits | Entire command manual or invented commands |
| Tracking and delivery | Verified tracker/repo identifiers, linking conventions, acceptance responsibilities | Volatile progress or universal skill procedures |
| Conditional references | Trigger, exact document, purpose | An unconditional instruction to load all documentation |

Personal preferences usually belong in user instructions; team-specific agreements
may belong in the project. Place subsystem-only guidance at the smallest reliably
loaded scope. Preserve necessary safety restrictions even when brevity suggests
removing them: instructions do not replace sandbox or permission enforcement.

### Context and workflow agreements

Reuse accepted project conventions. If the following workflow is proposed, present
it for approval rather than assume every project uses it:

- Repository `CONTEXT.md` and mapped glossaries describe integrated meanings.
- The owning Linear issue records accepted changes not yet integrated.
- Before work depending on those meanings, consult both and resolve contradictions.
- Detailed system behavior belongs to its documentation; task methods belong to skills.

Record verified destinations, not guessed identifiers. Establishing these agreements
does not authorize creating context files, provisioning Linear, or migrating existing
documentation. Preserve task-specific actions in skills when centralizing policy:
preparing a delta and delivering it are different responsibilities.

## Maintain instead of append

Classify affected passages as **keep, revise, replace, remove, or relocate**.
For removals/relocations, identify why content is obsolete or where its authority
will remain. Update dependent links in the proposal. Preserve authorial intent and
unrelated conventions; do not rewrite everything for one requested correction.

Verify commands against owning scripts/configuration and tool versions. Execute
only safe permitted checks; installs, deployments, data changes, and credential
operations are not justified merely by a documentation check.

**Ready for approval:** full text/diff, destinations, material rationale, and gaps
are presented. Follow the main skill's approval gate before any instruction write.
**Done:** approved changes applied and documentary/loading checks reported separately;
unknown facts and untested runtime behavior remain explicit.
