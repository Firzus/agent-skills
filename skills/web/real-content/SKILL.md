---
name: real-content
description: >-
  Replace a greyboxed site's placeholders with real content — copy, imagery,
  data. Use when the user wants to fill a site with final content, write its
  copy, or source its imagery, or when the frontend-design pipeline reaches
  phase 3.
---

# Real Content

Replace every placeholder with real content — copy, imagery, data — on every page `PAGES.md` marks as passed. Read `DESIGN.md` first: its voice notes and dials set the register. Source from the user and existing project material; where none exists, write final copy in the site's voice and flag it for the user's validation.

Words are design material, not decoration: they appear to make the page easier to understand, and therefore easier to use.

## Prerequisites

| Skill      | For                                                        |
| ---------- | ---------------------------------------------------------- |
| `imagegen` | generating the raster imagery of the sourcing ladder       |
| `grilling` | the optional voice/positioning grill at the exit gate      |

## Copy rules

- **The user's vocabulary.** Write from the end user's side of the screen: name things by what people control and recognize, never by how the system is built — a person manages notifications, not webhook config.
- **Active voice, exact labels.** A control says exactly what happens when it's used: "Save changes", not "Submit".
- **Label continuity.** An action keeps its name through the whole flow: the button that says "Publish" produces a toast that says "Published".
- **One job per element.** Plain verbs, sentence case, tone matched to the brand and audience.
- **Concrete verbs.** Say what the product does in its own language ("Sync your invoices"), in place of filler verbs like "Elevate", "Seamless", "Unleash", "Revolutionize".
- **Errors and empty states give direction, not mood.** An error names the problem and the recovery, without apologizing or vagueness. An empty screen is an invitation to act.
- **Copy caps.** Hero subtext ≤ 20 words; section body ≤ 25 words by default; quotes ≤ 3 lines, attributed name + role (+ company). One copy register per page.

## Truthfulness

- Existing claims are part of the scope: preserve them unless the user supplies replacements. If real evidence is essential and absent, ask for it.
- Every number either comes from real data or is explicitly labeled as mock. Fake-precise, invented numbers are banned.

## Imagery

Imagery is content too — a pure-text page is not minimalism, it is incomplete work. Source in this order:

1. Generate with the `imagegen` skill — raster imagery matched to the tokens: heroes, illustrations, product shots, textures, transparent cutouts, and variants of one asset to pick from.
2. Real sources: licensed stock or seeded photo services; logo walls use the real SVG logos (logos and nothing else).
3. A clearly labeled placeholder slot, plus telling the user exactly what asset is missing.

Simple shapes, diagrams, and icons are built natively in SVG or CSS. Screenshots are real captures of the product.

## Copy self-audit — mandatory exit step

Re-read every visible string on every page: headlines, buttons, captions, alt text, errors, empty states. Flag and fix anything grammatically broken, with unclear referents, or that reads like an LLM trying to sound thoughtful. Boring copy beats cute copy.

At the gate, offer the user a `grilling` session on voice and positioning — optional, their call.

**Done when:** zero placeholder remains on any page and the copy self-audit passes.
