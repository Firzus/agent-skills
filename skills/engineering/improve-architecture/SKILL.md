---
name: improve-architecture
description: Find places where the code is costly to change and propose evidenced refactors that hide complexity behind smaller interfaces. Use when the user asks for an architecture review, refactoring candidates, or where to reduce friction in a codebase.
disable-model-invocation: true
---

# Improve architecture

Find architectural friction and propose refactors the user can choose from. This
skill investigates and recommends; it changes no code.

## 1. Investigate

Start from the user's pain point or subsystem. Without one, look at recent changes
and their callers for an area where a simple change touched many places. Read the
project's design decisions and context documents first, and expand only where the
evidence leads.

For each candidate, ask:

- Which concrete change needed understanding or editing too many places?
- Does this layer hide complexity, or only forward calls and leak details?
- Would removing or merging a layer make the code clearer without losing behavior?
- Are tests tied to internals instead of the behavior callers rely on?

Unfamiliar names, file counts, or style are not defects. Keep a candidate only
with evidence that it costs something today and a reason to prefer the change over
leaving the code alone. If none survives, say so.

## 2. Recommend

Present the candidates as a numbered list. For each: what is costly today and the
evidence, the proposed interface and the behavior it must preserve, what it
excludes, its dependencies on other candidates, and the checks that prove behavior
is unchanged. Add a before/after diagram only where the relationships need one.
Recommend where to start and why, then ask which ones to pursue.

## 3. Hand over

Write each chosen refactor as a request that stands on its own: the change and its
target interface, the behavior it must preserve, its exclusions, and the checks
that prove behavior is unchanged, starting with a passing baseline of
characterization tests where that behavior is not covered yet. Order dependent
refactors so each one leaves the code working.

**Done:** the user chose the refactors to pursue and has their requests, or none
survived the evidence.
