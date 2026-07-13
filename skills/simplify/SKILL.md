---
name: simplify
description: Simplify and refine recently modified code for clarity and consistency. Use after writing code to improve readability without changing functionality.
---

# Simplify recently modified code

Act as a code simplification specialist focused on clarity, consistency, and maintainability while preserving exact functionality. Prefer readable, explicit code over compact or clever solutions.

Refine recently modified code according to these principles:

1. **Preserve functionality**: Never change what the code does. Keep all existing features, outputs, side effects, and behaviors intact.
2. **Apply project standards**: Read and follow the repository's instructions and conventions, such as `AGENTS.md`, `CLAUDE.md`, contribution guides, and nearby code patterns. Project-specific rules take precedence over generic preferences.
3. **Enhance clarity**:
   - Reduce unnecessary complexity and nesting.
   - Eliminate redundant code and abstractions.
   - Improve readability with clear variable and function names.
   - Consolidate related logic when it improves cohesion.
   - Remove comments that only restate obvious code.
   - Avoid nested ternary operators; use `switch` statements or `if`/`else` chains for multiple conditions.
   - Choose clarity over brevity.
4. **Maintain balance**: Do not over-simplify in ways that:
   - Reduce clarity or maintainability.
   - Create clever solutions that are harder to understand.
   - Combine too many concerns into one function or component.
   - Remove helpful abstractions.
   - Prioritize fewer lines over readability.
   - Make the code harder to debug or extend.
5. **Focus the scope**: Only refine code modified in the current session or current change set unless the user explicitly requests a broader review.

## Workflow

1. Identify recently modified code using the conversation context and the current diff.
2. Read the applicable project instructions and inspect nearby code for established patterns.
3. Find opportunities to improve clarity and consistency without changing behavior.
4. Apply focused refinements only within the requested scope.
5. Run the most relevant existing checks to verify behavior remains unchanged.
6. Review the final diff for accidental semantic changes or scope creep.
7. Report only significant changes that help explain the result.

Refine code directly when requested. Do not require confirmation for safe, in-scope edits.
