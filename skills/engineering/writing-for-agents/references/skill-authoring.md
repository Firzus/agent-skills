# Author a skill or reference

## Define the contract

1. Establish the concrete outcome, intended caller, entry conditions, exclusions,
   inputs, side effects, and handoff. Reuse an existing skill when it already owns
   the behavior instead of creating overlapping entry points.
2. Choose invocation deliberately, preserving an existing choice unless change is
   requested. Manual-only skills use `disable-model-invocation: true` where supported;
   their description is a human-facing summary. Model-invoked skills need a concise
   description identifying distinct trigger cases, especially when other skills call them.
3. Check the target host's supported metadata and invocation behavior. Do not promise
   universal host support, or assume a skill/tool is installed because its name appears.

| Content shape | Template |
| --- | --- |
| Ordered work with decisions and completion states | [Procedure](../templates/skill-procedure.md) |
| Rules consulted while doing other work | [Reference](../templates/skill-reference.md) |

Use the target repository's conventions for location, naming, registration, and
entry-point size. Keep `SKILL.md` as the entry point; companion references are loaded
only through useful conditional pointers. Avoid scripts or dependencies unless the
requested behavior needs them and reuse cannot provide it.

**Done:** one clear responsibility, invocation choice, and document shape established.

## Write and update

- Separate what every run needs from specialized branches. Each link states its
  trigger and purpose; avoid burying mandatory rules behind optional wording.
- Name explicit inputs, actions, output, stopping evidence, and missing-capability
  behavior. Use actual tool discovery rather than hard-coded session tool names.
- Keep one owner for shared rules. A cross-skill dependency must be intentionally
  available or have an explicit unavailable path; avoid duplicated fallback policies.
- For delegation, define inputs, outputs, write boundaries, and completion evidence.
  Explicitly prevent recursive delegation when reviewers should be leaf workers.
- Preserve public behavior during an editorial rewrite. Remove stale instructions,
  not safeguards or valid exceptions; update affected references and examples together.
- Use the project artifact language and consistent names. Optional reference sections
  remain optional; do not fabricate procedural steps for a rule collection.

## Verify the result

- Check metadata, registration, local links/anchors, and referenced capability names.
- Walk through matching and nonmatching requests, unavailable tools, partial results,
  permission boundaries, and the intended handoff.
- For behavior-sensitive changes, compare representative before/after outputs when
  authorized. Report simulations, isolated trials, and installed-host tests distinctly.
- Keep test records outside runtime instructions unless the project explicitly wants
  them included. A successful documentary check is not proof of reliable behavior.

**Done:** contract readable, references reachable, tested coverage and limits stated.
Installation and publication remain separate authorized actions.
