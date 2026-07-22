# Application description report

Use this contract for a concise or deep report. Remove sections that have no
relevance, but retain evidence quality, discrepancies, unknowns, and sources.
Keep an unavailable evidence channel in the scope table as `unknown` when it could
materially affect the answer, and state why it was not inspected.

```markdown
# <Application name>

## Executive summary

<What the application is, who it serves, and its primary value.>

## Investigation scope

| Channel | Identity | Revision/build | Coverage |
| --- | --- | --- | --- |
| Source | <remote/path> | <commit/tag> | <areas inspected> |
| Web | <official domains> | <access/release dates> | <sources inspected> |
| Installed | <publisher/platform> | <version/build> | <flows inspected> |

## Capabilities and workflows

| Capability | User workflow | Evidence | Limits |
| --- | --- | --- | --- |
| <name> | <entry to result> | `source` / `observed` / `official` | <scope> |

## Architecture and technologies

<Describe runtime units, boundaries, state, persistence, and delivery. Add one
small Mermaid diagram when it improves comprehension.>

## Data, security, and integrations

| Area | Finding | Evidence | Confidence |
| --- | --- | --- | --- |
| <storage/auth/API/telemetry/permission> | <finding> | <citation> | High/Medium/Low |

## Installed behavior

<Versioned observations and the actions that reproduced them.>

## Evidence gaps and discrepancies

| Topic | Evidence A | Evidence B | Interpretation or unknown |
| --- | --- | --- | --- |

## Sources

- <source-code permalink at the analyzed commit>
- <first-party web citation>
- <installed build metadata or observation record>
```

## Evidence quality

- **High:** directly verified in behavior-bearing source or reproduced in the
  named installed build, with corroboration where practical.
- **Medium:** one strong first-party source or a well-supported inference with a
  clearly stated scope.
- **Low:** indirect, stale, incomplete, or conflicting evidence.

Place citations beside the claims they support, not only in the Sources section.
Use `unknown` instead of filling a gap with a plausible description.
