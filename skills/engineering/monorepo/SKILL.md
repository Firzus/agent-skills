---
name: monorepo
description: >-
  Set up, evolve, and troubleshoot multi-project repositories. Use for workspace
  structure, cross-package dependencies, task graphs, build caching, affected CI,
  package contracts, releases, or an explicitly requested monorepo migration.
  Not for ordinary feature work confined to one project.
---

# Manage a monorepo through explicit contracts

Accept a repository and a concrete outcome. Inspect before prescribing a layout
or tool. A monorepo shares a Git history; it does not require one language,
one dependency version, one build system, or synchronized releases.

Use only the phases relevant to the request. Investigation permits inspection;
implementation requires edit authorization. Installing dependencies, migrating
tools, importing repositories, publishing packages, and deploying services must
fit the explicitly authorized scope.

## 1. Discover the workspace and requested change

1. Read applicable project instructions, repository state, existing architecture
   decisions, and relevant CI workflows. Preserve unrelated local work.
2. Identify actual workspace roots and members from manifests and tool discovery,
   not folder names alone. Record package/project identifiers, paths, owners,
   deployable applications, reusable libraries, tooling, and generated artifacts.
3. Inspect package managers, runtime/compiler versions, lockfiles, scripts,
   task-runner configuration, shared configuration, and release tooling.
   Multiple ecosystems can legitimately have separate roots and lockfiles.
   Inspect discovery and dry-run side effects first: tools can update guidance
   files or contact remote services. Use file inspection or an approved isolated
   copy when the investigation must remain read-only.
4. Trace the target's dependencies and consumers, including generated schemas,
   shared configuration, native bindings, and files outside its directory.
5. Establish the requested result, allowed writes, behavior to preserve, and
   acceptance checks. For a performance request, measure representative baseline
   tasks and separate cold execution, warm execution, and cache restoration.

**Done:** the affected projects, installed toolchain, change boundary, and
verification commands are known.
**Missing access or tools:** report the unavailable evidence; continue safe
inspection without installing a replacement or inventing a project graph.

## 2. Choose the smallest coherent structure

Retain the existing toolchain unless the request or observed limitations justify
a change. Package management, task orchestration, and release management are
different responsibilities; one tool need not own all three.

| Observed need | Starting point |
| --- | --- |
| Small workspace with adequate scripts and native tooling | Keep native workspaces and scripts |
| JS/TS tasks need explicit ordering and reusable results | Evaluate the existing runner or Turborepo |
| Project graph, affected execution, boundary rules, or language integrations are needed | Evaluate the existing runner or Nx, checking actual plugin support |
| Hermetic actions or cross-language build isolation are required | Evaluate an appropriate build system, including Bazel, against migration cost |

This is a decision aid, not a performance ranking. Compare the current approach
with credible alternatives using actual tasks, platform support, maintenance
cost, and acceptance checks before recommending adoption.

For new repositories, define deployable units and public library contracts
first. Use ecosystem-compatible membership patterns; `apps/`, `packages/`,
and `tools/` are optional conventions. Extract shared code only for demonstrated
consumers or a required independently owned contract, not hypothetical reuse.
Share configuration where semantics match, preserving necessary project-specific
compiler, framework, test, and runtime settings.

For migration, agree on history preservation, access restrictions, package-name
conflicts, import rewrites, CI/release changes, and rollback before moving files.
A shared repository is not a package-level access-control boundary.

**Done:** the proposed structure has a concrete reason, preserved contracts,
and an authorized implementation path. If no structural change is needed,
keep the current layout.

## 3. Make dependency and package boundaries explicit

1. Declare each project's runtime and build dependencies in the owning manifest
   or supported project graph. Hoisting, root installation, editor aliases, and
   incidental filesystem access are not evidence of a declared dependency.
2. Match local dependency syntax to the installed package manager. Where a local
   workspace package is required, enforce local resolution using supported
   configuration; do not assume `workspace:` works across all managers.
3. Import another package through its declared public API rather than relative
   paths into its source tree. For JS/TS, align `exports`, type entry points,
   module formats, and runtime conditions with actual consumer support.
   TypeScript path aliases alone do not establish runtime package resolution.
4. Choose whether consumers use source directly or consume built artifacts.
   Source consumption requires compatible consumer tooling; produced-file
   consumption requires explicit prerequisites satisfied by execution or valid
   restoration, with emitted files matching the package contract.
   Match distributed contents to the ecosystem: Cargo packages normally ship
   source, while a JS library may ship compiled modules, types, and assets.
5. Inspect transitive edges and detect cycles. Resolve new cycles at the owning
   boundary rather than hiding them with aliases, undeclared edges, or exclusions.
6. Preserve intentional dependency-version differences and peer constraints.
   Centralize compatible versions with existing mechanisms only when useful;
   do not force every project onto an incompatible shared version.
7. In mixed-language repositories, keep each ecosystem's native manifests,
   lockfiles, and validation. Represent cross-language generation and packaging
   edges explicitly; sharing a Git tree does not make JS tooling validate Rust,
   Python, or other language contracts.

When changing workspace resolution, consult the installed manager's documentation:
[pnpm workspaces](https://pnpm.io/workspaces) (select the installed major),
[npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces), or
[Yarn workspaces](https://yarnpkg.com/features/workspaces).
For Rust workspace membership and inheritance, use
[Cargo workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html).

**Done:** dependency edges are declared, public imports resolve through the
intended local or published contract, and affected consumers are identified.

## 4. Make task execution and caching correct

Distinguish the project graph from the task graph. A project dependency identifies
a relationship; a task dependency determines execution order.

For each changed task, establish its command, working directory, prerequisites,
inputs, outputs, environment/runtime constraints, and side effects. Schedule
upstream builds or generators when their artifacts are consumed. Source-only
consumers may need upstream input tracking without an upstream build.
Parallelize only independent tasks and keep concurrent writers out of the same
output path.

Cache only results that are reproducible from tracked inputs. Include relevant
source, shared configuration, dependency resolution, generated inputs, command
options, environment values, and toolchain/platform differences. Inspect existing
defaults before overriding input/output lists; configuration merging and automatic
tracking differ by tool and version.

Separate dependency-download caches from task-result caches. Passing an environment
variable to a process does not necessarily include it in the result's cache key.
Keep publication, deployment, database mutations, and other external side effects
outside result caching. Give long-running servers an explicit lifecycle rather
than treating them as finite prerequisites.

For task or cache changes, use an isolated fixture or disposable output directory.
Isolate cache storage and disable unapproved remote access/uploads; a force-run
flag can bypass reads while still writing cache entries. Check the actual mode:
- Run with result-cache reads disabled and fresh owned outputs; inspect the files.
- Repeat unchanged inputs and observe the expected hit.
- Remove only owned disposable outputs and verify that a hit restores required files.
- Change relevant local, upstream, and environment inputs independently; require
  the expected invalidation and new result, restoring each mutation before the next.
- Introduce a failing assertion when changing test caching; require failure rather
  than replay of an earlier passing result, then restore the fixture.

These checks establish the exercised cases, not exhaustive cache correctness.
Test remote restoration separately if remote reuse is part of the requested outcome.

For Turborepo configuration, read its
[task reference](https://turborepo.dev/docs/reference/configuration).
For Nx hashing and restore behavior, read
[cache task results](https://nx.dev/docs/features/cache-task-results).
For Vite+ projects, use the available `vite-plus` skill for installed command and
tracking semantics; if unavailable, inspect installed help and owning documentation.

**Done:** task ordering and cache invalidation/restoration are observed, not
inferred from a green cached log. If safe execution is unavailable, report the
untested boundary and retain the proposed checks.

## 5. Select CI work and prepare releases safely

When changing CI:
1. Use the repository's pinned toolchain and supported locked/immutable install
   mode. Preserve ecosystem-specific checks and platform requirements.
2. Resolve and record the intended Git base/head and ensure the needed history is
   available. Select changed projects and affected downstream consumers; include
   prerequisite tasks needed to execute that selected work.
3. Check shared configuration, lockfile changes, generated contracts, and implicit
   dependencies. A folder-only filter can omit consumers outside that folder.
   Inspect the selected project/task list before treating the command as coverage.
4. If history, graph data, or selection is incomplete, repair it or use the required
   broader checks. An empty selection is acceptable only when explained by the diff.
5. Enforce remote-cache read/write trust boundaries. Untrusted contributions must
   not write artifacts consumed by trusted jobs or receive privileged credentials.
   Review cached outputs and logs for secrets and private data.

For affected-selection semantics, consult
[Nx affected execution](https://nx.dev/docs/features/ci-features/affected) or the
installed runner's equivalent; do not translate filter syntax by analogy.

When package delivery is in scope, distinguish non-publishable units from libraries
intended for a registry. Restricted registry access is not a non-publication flag.
Preserve the established independent or coordinated versioning policy. Review API
compatibility, dependent version ranges, changelogs, registry targets, and publication
order. Inspect the installed release-tool major and configuration before selecting
commands or defaults. Use existing release tooling;
[Changesets](https://changesets.dev/guide/versioning-and-publishing)
is an option, not a prerequisite.

Inspect packed artifacts and exercise relevant imports/types in an isolated
consumer outside the workspace's dependency tree, with declared runtime/peer
requirements and no source aliases or links back to the working tree masking defects.
Review lifecycle scripts before packing or installing artifacts.
Deployment bundles likewise need their actual runtime files and dependencies,
not merely a successful workspace build.

**Done:** selected CI work covers the affected contracts and any release artifacts
are verified. Publishing and deployment require explicit authorization; preparation
does not imply delivery. After partial publication, inspect actual registry state
before retrying.

## 6. Verify and hand over

Run the project's required checks for the changed area, including affected consumers
and the relevant build, type, boundary, package, or integration checks. Establish
a failing regression first for a requested fix when safely reproducible.
Run fresh execution where cache behavior could conceal the change.

For graph/CI-selection changes, exercise a leaf-only change, a shared dependency
change, and a relevant root configuration or lockfile change. Require the expected
project set and prerequisites, not just a successful command.
For performance changes, compare the same workload and environment against the
baseline; report execution time and cache behavior without equating hits with
faster compilation.

Inspect the final scoped diff and untracked outputs. Return:
- Changed contracts and affected projects.
- Exact commands, tool versions, selected scope, results, and cache mode.
- Artifact/consumer evidence, remaining failures, and untested platforms or remote CI.
- Pending approvals or operations, with the next safe action.

**Complete:** the authorized outcome and required checks are satisfied.
**Incomplete:** identify the missing evidence or operation; a valid configuration,
cache hit, or local build alone does not establish end-to-end correctness.
