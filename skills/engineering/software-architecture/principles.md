# Architecture Principles

Universal, stack-agnostic principles that guide *every* architecture decision —
and discipline against over-engineering. Each section ends with an **agent
heuristic**: what to actually do.

---

## 1. SOLID in 2026

SOLID is not obsolete, but it is widely **misapplied**. Treat it as goals about
*managing change*, not class-level commandments. Mechanical application (an
interface per service, a layer per concern) is a top source of over-engineering.

| Letter | Paradigm-agnostic restatement |
| --- | --- |
| **S**RP | One responsibility; group what changes together |
| **O**CP | Extend via composition, not by editing core; in FP = compose functions |
| **L**SP | Substitutes must not *surprise* the caller (links to least astonishment) |
| **I**SP | Depend only on what you use ("the bigger the interface, the weaker the abstraction") |
| **D**IP | High-level policy must not depend on low-level detail; pass dependencies explicitly |

**Non-OOP:** FP enforces much of SOLID by default (pure functions = SRP,
composition = OCP, higher-order functions = DIP without containers). Go: small
consumer-side interfaces, single-purpose packages — "all SOLID, no ceremony".
Rust: traits for decoupling (≈ ISP/DIP), LSP as contract safety.

**CUPID** (Dan North) is the modern complement — properties, not rules:
**C**omposable, **U**nix-philosophy, **P**redictable, **I**diomatic,
**D**omain-based.

> **Agent heuristic:** Don't add an interface *because SOLID*. Add it only when a
> concrete change or a real second implementation forces it. Prefer consumer-side
> small interfaces.

---

## 2. Simplicity first

- **YAGNI** — Don't add capability until a *current* requirement demands it.
  Nuance (Fowler): YAGNI is about *presumptive features*, **not** about making code
  easy to change — refactoring and self-testing code are what make YAGNI safe.
  Don't YAGNI away foundational, hard-to-retrofit concerns (CI/CD, security
  boundaries, basic observability).
- **KISS** — Keep the *implementation* of necessary features as simple as possible.
- **Rule of three** — Don't extract a reusable abstraction until **three** real
  usages exist. Two is a coincidence; three is a pattern.

```
1st occurrence -> write it inline
2nd occurrence -> duplicate it (note the similarity; DO NOT abstract yet)
3rd occurrence -> the real shape is now visible -> extract
```

> **Agent heuristic — "prototype loosely, then harden":** Write the simplest thing
> for today's requirement. Tolerate duplication. Let the third real instance reveal
> the abstraction. *Duplication is far cheaper than the wrong abstraction.*

---

## 3. Coupling & cohesion as the compass

Kent Beck reduces design to two forces:
- **Coupling** = changing A forces changing B — "the spread of a change".
- **Cohesion** = things that change together live together — "the cost of a change
  within an element".

**"Make the change easy, then make the easy change":** separate *structural*
changes from *behavioral* ones.

```
1. (Structural) Tidy/refactor so the upcoming change becomes easy
   - reduce coupling, raise cohesion, isolate the area; reversible
2. (Behavioral) Make the now-easy change
   - focused, small, verifiable
```

Keep the two kinds of change in *separate commits* — structural is reversible,
behavioral is verifiable.

> **Agent heuristic:** Before a feature, ask "what structural tidy makes this a
> one-line change?" Do that first, in its own commit. Judge any design by *spread
> of change* (coupling) and *cost of change* (cohesion), not by aesthetic purity.

---

## 4. When a pattern hurts

Over-engineering = complexity added *without solving a current, proven problem*.
It feels like progress ("future-proofing") and only reveals itself when simple
changes require spelunking through indirection.

| Signal | What it looks like |
| --- | --- |
| Shotgun change | A simple feature requires editing 6+ unrelated files |
| Lonely abstraction | Interface/base class with exactly **one** implementation, none planned |
| Pass-through layers | `Manager`/`Handler`/`Processor`/`Helper` that just forward data |
| Debugging = archaeology | Stepping through decorators/proxies/middleware before reaching real logic |
| Patterns to explain patterns | Internal docs needed to explain your own abstractions |
| No-date justifications | "this will let us swap the DB later" — no concrete second case |
| Premature optimization | Optimizing before a profiler shows a bottleneck |

Two falsifiability tests for any layer:
- **Name the second customer** — a real case with a name, workload, and schedule,
  not "another DB someday".
- **Demand a falsifiable claim** — "the repository isolates persistence" is testable
  only if you'll actually swap the DB this quarter. If not, the layer is decoration.

> **Agent heuristic — the Manager/Handler tripwire:** About to name something
> `XManager`/`XProcessor`/`XHelper`? Check it has real behavior, not just
> delegation. If a layer can't be explained in one sentence, or a GET passes
> through >3 layers, you're over-abstracted. Stay low until altitude pays.

---

## 5. Essential vs accidental complexity

From Brooks, *No Silver Bullet*:
- **Essential** complexity is inherent to the problem/domain (the business logic).
  Can't be removed without removing the essence.
- **Accidental** complexity comes from tools, languages, frameworks, plumbing. This
  is what you attack.

```
C(solution) = C(problem) + C(accidental)
```

> **Agent heuristic:** Before adding code, classify it. Essential (invest in a
> clear domain model) or accidental (ruthlessly minimize — don't invent framework,
> config, or indirection the problem didn't ask for)?

---

## 6. Gall's law & worse-is-better

> A complex system that works is invariably found to have evolved from a simple
> system that worked. A complex system designed from scratch never works. — Gall

**Worse is better:** a "good enough" simple system ships first, spreads, then
improves — while the elegant design is still being built.

> **Agent heuristic:** Never scaffold the end-state architecture on day one. Ship
> the simplest working slice, then evolve. If you can't evolve toward the complex
> design from a simple working one, the complex design is probably wrong. *The best
> architecture is the simplest one that makes the next change easy.*

---

## 7. Principle of least astonishment

A component should behave the way someone with reasonable domain knowledge expects.
Consistent naming (`isReady` is a boolean; `compute()` returns, doesn't mutate
globals); no hidden side effects; sensible defaults; make the expected easy and the
unexpected explicit; follow ecosystem conventions.

> **Agent heuristic:** Name and shape every function/endpoint so a competent dev
> predicts its behavior without reading the body. If you need a comment to explain a
> surprising behavior, redesign instead.

---

## 8. Screaming architecture

The top-level structure should **scream the domain, not the framework**. The source
tree should say "this is a payments system", not "this is a Spring/Rails app".

```
Bad (framework screams)        Good (domain screams)
src/                           src/
├── controllers/               ├── orders/
├── services/                  ├── payments/
├── repositories/              ├── subscriptions/
└── models/                    └── shipping/
```

> **Agent heuristic:** Organize top-level folders by *business capability*, not
> technical layer (pairs with vertical slice — see
> [macro-structures.md](./macro-structures.md)). The domain core must not import the
> framework.

---

## 9. Strategic DDD

- **Ubiquitous language** — one precise, shared vocabulary used by developers and
  domain experts, in conversation, docs, tests, **and code** (class/method names,
  schema, endpoints match the spoken term).
- **Bounded context** — an explicit boundary within which one model and its
  language are consistent. The same word means different things in different
  contexts; design boundaries consciously instead of building one god-model.

> **Agent heuristic:** Use the domain's exact words in code; don't introduce a
> synonym. When one term carries two meanings, that's a signal for a context
> boundary — split rather than build one god-model.

---

## 10. Decision checklists

### A. "Should I add this abstraction?" (gate before any interface/layer/generic)
Add it only if you can answer **yes** to most:
- [ ] ≥3 real usages today (rule of three), not hypothetical?
- [ ] Can I name the second concrete consumer (name, workload, schedule)?
- [ ] Does it make a falsifiable claim testable by a change I'll make this quarter?
- [ ] Can I explain what it does in one sentence?
- [ ] Does it *compress* complexity rather than just relocate it?
- [ ] Does it measurably reduce coupling or raise cohesion?

If mostly **no** → write the concrete, possibly duplicated code.

### B. "Am I over-engineering right now?" (red-flag scan)
- [ ] Interface/base class with one implementation, none planned
- [ ] `Manager`/`Handler`/`Processor`/`Helper` that only forwards
- [ ] A simple change touches 6+ files
- [ ] A request passes through >3 layers
- [ ] Forward-looking justification with no date
- [ ] Optimizing without a profiler
- [ ] I'd need docs to explain my own pattern

Any box checked → collapse the layer, inline the indirection, remove the
speculative hook.

### C. Master loop for any change
```
1. Understand the domain term (ubiquitous language).
2. Classify complexity: essential (invest) vs accidental (minimize).
3. Make the change easy: structural tidy first (own commit).
4. Make the easy change: behavioral change (own commit).
5. Default to the simplest thing that works (Gall / worse-is-better); evolve it.
6. Verify no surprises (least astonishment): names & behavior match expectations.
7. Re-scan for over-engineering (checklist B) before finishing.
```

### One-line mantras
- "Make the change easy, then make the easy change." — Kent Beck
- "Duplication is far cheaper than the wrong abstraction."
- "Stay low until altitude pays."
- "The best architecture is the simplest one that makes the next change easy."
- "A complex system that works evolved from a simple system that worked." — Gall

### Sources
- SOLID modern / CUPID: https://dannorth.net/blog/cupid-for-joyful-coding/ · https://dev.to/mdenda/solid-isnt-overrated-its-misapplied-41lm
- Simplicity: https://martinfowler.com/bliki/Yagni.html · https://deviq.com/code-smells/speculative-generality/
- Coupling/cohesion: https://newsletter.kentbeck.com/p/coupling-and-cohesion
- Over-engineering: https://aipatternbook.com/architecture-astronaut · https://leaddev.com/software-quality/the-6-warning-signs-of-overengineering
- Complexity: https://www.cs.unc.edu/techreports/86-020.pdf
- Gall / worse-is-better: https://en.wikipedia.org/wiki/Galls_law · https://www.dreamsongs.com/RiseOfWorseIsBetter.html
- Screaming architecture: https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html
- Strategic DDD: https://socadk.github.io/design-practice-repository/activities/DPR-StrategicDDD.html
