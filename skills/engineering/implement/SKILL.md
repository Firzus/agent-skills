---
name: implement
description: Implement an authorized code, configuration, refactoring, or documentation change with integrated test-first verification and current system documentation. Use for defined features, requested fixes, and documentation work; not diagnosis-only requests, unresolved design choices, or broad project planning.
---

# Implement a verified change

Produce one coherent, reviewable result. TDD and affected documentation belong to this procedure; no separate TDD skill is required.

## 1. Establish the change

Read the request, project agreements, current files, and nearest tests. Identify the expected outcome, exclusions, acceptance evidence, and delivery boundary. Trace affected callers and public contracts. Separate unrelated local work and pre-existing failures.

Resolve facts locally before asking. If the requested behavior still needs a user decision, prepare that decision instead of choosing silently. Research or a prototype answers uncertainty; it does not automatically expand implementation.

**Done when:** the authorized outcome and an independent way to check it are clear.

## 2. Verify one behavior before implementing it

For each production behavior:

1. Choose the nearest existing public test boundary and a concrete expected result, independent of the proposed code.
2. Write one focused test. Run it and inspect the failure: it must demonstrate the missing behavior, not a broken fixture, dependency, or test command.
3. Apply the smallest correct change that makes this test pass, using existing project patterns.
4. Run the focused check again. Refactor only while it remains green, then proceed to the next behavior.

Reuse established boundaries without renewed approval. For an unsuitable test-first case, record why and use a relevant substitute; do not invent infrastructure solely to preserve the ceremony. For refactoring, establish a passing behavior baseline and preserve it.

For documentation-only work, inspect source evidence, edit the document, and validate its claims and links. Do not invent a code change or failing automated test.

**Done when:** every changed behavior has its meaningful failure and passing result, or a stated exception with substitute evidence.

## 3. Complete the affected system

Inspect the final diff for callers, error paths, compatibility, and state transitions. Include the consequential adverse case required by the change. Keep optional cleanup separate.

Use comments only for verified non-obvious local reasons or constraints whose absence could cause an incorrect change. Keep them brief and adjacent. Avoid narration, decorative labels, vague TODOs, and disabled code. A workaround identifies its source and removal condition. Document API caller obligations when not evident or when required. Update comments invalidated by this change and preserve unrelated ones.

Check whether the change affects system documentation. Read [system documentation](references/system-documentation.md) when creating, materially updating, auditing, or retiring a system page. A simple wording repair needs only its relevant source and link checks.

**Done when:** code, affected contracts, local explanations, and current documentation agree within the authorized scope.

## 4. Demonstrate and hand over

Run the focused checks and required project checks. For visible behavior, exercise the connected implementation through its ordinary entry point, including interaction and a relevant narrow or target-device layout. Preserve the review surface using supported tools. State what actually ran and what remains unavailable.

Review every changed block against the requested outcome. Attach or link the result and evidence in the existing task record; use the project's authorized tracking route for external updates. A prepared PR is not acceptance, integration, or release.

**Done when:** the result is reviewable, evidence and limitations are recorded, and the agreed completion boundary is met or explicitly reported pending.
