# Source repository inspection

Use this branch when a local path or remote repository is available. Keep the
inspection read-only and anchor every finding to the analyzed revision.

## Acquire and identify

1. Reuse a user-supplied checkout; otherwise clone into a new scratch directory.
2. Record the canonical remote, current commit, branch, tags, and dirty state.
3. Inventory files with `rg --files` (or the closest available equivalent) before
   opening individual files.
4. Separate first-party source from generated output, vendored code, fixtures,
   examples, and archived experiments.

Useful Git probes:

```bash
git remote get-url origin
git rev-parse HEAD
git branch --show-current
git status --short
git tag --points-at HEAD
```

## Build the evidence map

Inspect only the branches relevant to the user's question, but account for each
app or service that participates in the shipped product.

| Question | Strong evidence |
| --- | --- |
| What is shipped? | Package manifests, workspace config, installers, release workflows |
| Where does it start? | Executable entry points, routes, commands, dependency wiring |
| What can users do? | UI flows, commands, handlers, tests, feature flags |
| How is it structured? | Module boundaries, imports, process/IPC edges, deployment units |
| Where does data go? | Models, migrations, storage adapters, API clients, telemetry config |
| What does it integrate with? | Concrete adapters, endpoints, permissions, auth scopes |
| How is it delivered? | Build config, packaging, signing, update and release automation |
| How mature is it? | Tests, error paths, release history, open first-party limitations |

Trace claims through behavior-bearing paths:

```text
user entry -> handler/use case -> domain or state -> storage/network -> result
```

A dependency proves availability, not usage. A route name proves an entry point,
not a completed workflow. A test proves the asserted behavior for its fixture and
revision, not every deployment.

## Handle repository variants

- **Monorepo:** identify which packages are products, shared libraries, services,
  tools, or examples; follow runtime edges between them.
- **Multiple apps:** describe each surface separately before summarizing the whole.
- **Sparse documentation:** derive facts from executable paths and label product
  intent as `unknown` unless first-party evidence states it.
- **Large repository:** start from manifests and entry points, then follow only
  reachable paths for the user's question. Use targeted `rg` searches.
- **History-sensitive question:** inspect releases, tags, and relevant commits only
  after mapping the current revision.

## Completion check

The source branch is complete when the evidence ledger records:

- canonical remote and exact commit;
- products and delivery units;
- entry points and primary user workflows;
- architecture and runtime boundaries;
- data stores, external services, permissions, and telemetry found in source;
- build, packaging, release, and test evidence;
- unsupported claims, dead paths, and version uncertainty.
