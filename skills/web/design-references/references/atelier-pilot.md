# Atelier-inspired action-sequence editor: delegated pilot

## Brief and method

Date: **2026-09-19**. Explore a compact vertical action-sequence editor for
professional desktop users: reorder, duplicate, edit parameters, select multiple
actions, and disclose details without expanding every row.

This is a theoretical Atelier-inspired exercise. No actual Atelier interface,
implementation, or usability evidence was supplied. It validates the reference
workflow, not the suitability of a finished design for Atelier.

A delegated subagent read the skill, format guide, and matching catalog records.
It shortlisted five surfaces and revisited their exact public documentation URLs.
A sixth surface, Vercel's dashboard, was visited for an access-boundary check.
No web expansion was needed. All five retained references below were inspected
using **page-text extraction**, not live application tests, on the date above.
No accounts were accessed or application state changed.

## Retained references

### Windmill: movement and duplication

Source: `windmill-flow-docs` — [Flow editor, Node manipulation](https://www.windmill.dev/docs/flows/flow_editor).

- **Documented:** Handles and highlighted targets support movement; Escape cancels.
  Duplicates appear after their originals. Selection exposes collective actions.
- **Relevance:** Explicit movement affordances and predictable duplication placement.
- **Limitations:** A graph editor, not a compact list; live feedback and keyboard
  accessibility were not tested.
- **Proposed adaptation:** Dedicated row handles, insertion indicators, adjacent
  duplicates, and a selection-level toolbar.

### Baserow: selection distinct from ordering

Source: `baserow-grid-docs` — [Grid view, selection and manual reordering](https://baserow.io/user-docs/guide-to-grid-view).

- **Documented:** Hover reveals selection checkboxes; modifiers select ranges or
  separate rows. Selection reveals bulk actions. Automatic sorting disables manual
  reordering.
- **Relevance:** Separates editing, selection, and movement within a row.
- **Limitations:** Spreadsheet semantics differ from executable actions; batch-move
  outcomes and keyboard-only reordering were not established.
- **Proposed adaptation:** Separate parameter fields, selection targets, and handles.
  Keep execution order explicit rather than confusing it with display sorting.

### Kdenlive: ordered parameter panels

Source: `kdenlive-editor-docs` — [Effects and Filters, Effect/Composition Stack](https://docs.kdenlive.org/en/effects_and_filters.html).

- **Documented:** Effects have collapsible settings, up/down ordering controls, and
  a bypass state that retains their settings. Effects can be copied between clips.
- **Relevance:** An ordered stack of configurable operations.
- **Limitations:** Multi-selection concerns clips, not necessarily effect rows;
  compositions cannot be stacked. Interaction outcomes were not tested.
- **Proposed adaptation:** Compact action headers with disclosure, enabled state,
  and non-drag move controls, exposing detailed parameters only when needed.

### Godot: focused parameter inspection

Source: `godot-editor-docs` — [Inspector Dock](https://docs.godotengine.org/en/stable/tutorials/editor/inspector_dock.html).

- **Documented:** Selection changes the inspected object; properties are grouped,
  searchable, directly editable, and can expose revert controls.
- **Relevance:** Organizes extensive parameters without making every sequence row tall.
- **Limitations:** Mixed-value batch editing and an appropriate Atelier inspector
  width were not established.
- **Proposed adaptation:** Short row summaries and a detailed selected-action
  inspector with explicit reset affordances.

### Krita: stack selection and non-drag movement

Source: `krita-editor-docs` — [Layers, operations and shortcuts](https://docs.krita.org/en/reference_manual/dockers/layers.html).

- **Documented:** Range/additive selection, duplication, in-place renaming, movement
  controls, and optional selection checkboxes complement dragging.
- **Relevance:** Batch operations and alternatives to pointer-only movement.
- **Limitations:** Image-layer grouping and states do not transfer automatically;
  documented keyboard behavior was not tested in the running application.
- **Proposed adaptation:** Explicit selection and non-drag movement; distinguish
  the active row from the selected set.

### Capture decision

No third-party captures are embedded. Documentary evidence supports the described
contracts, not visual density or transition quality. Linked images for Baserow and
Godot were not inspected. A request for Krita's linked layer-stack image returned
no inspectable visual rendering, so it supplied no visual evidence. Captures for
Windmill and Kdenlive were omitted rather than presented as interaction tests.

## Boundary scenarios

These are bounded scenario checks, not live application tests.

| Scenario | Execution and outcome |
| --- | --- |
| Access blocked | The public [Vercel dashboard](https://vercel.com/dashboard) request redirected to login with `/dashboard` as its return path. The subagent stopped without authentication. Landing-page verification did not promote the dashboard. |
| Insufficient evidence | Requested Krita's linked layer-stack image; no inspectable rendering was returned. The report made no visual claim and explicitly stated that even a static screenshot would not demonstrate dragging or keyboard reordering. Those behaviors remained documented, not tested. |
| No relevant reference | Searched all 116 catalog records for the synthetic exact tag `braille-haptic-sequence-editor`, with web expansion explicitly disabled. Zero matches, including a serialized-text check. Result: **No relevant reference found for this exact catalog-only request.** No substitute was invented. |
| Read-only exploration | The parent independently computed the same catalog SHA-256 before and after the delegated run: `79B6F892143894BB48412F0A32697F573B2C2F3C28A9B5AFC688F010B83044CD`. The subagent wrote no project memory or repository files. |

## Review and validation

The parent subsequently clarified Kdenlive's source limitations after revisiting
the documentation: its multi-selection and drag tags do not prove multi-select
effect-row dragging. This was a separate catalog-authoring correction after the
read-only check, not a write by the exploration subagent.

The initial catalog contains **54 verified surfaces, 8 inaccessible candidates,
and 54 verified references**. Source verification comprises 48 page-text inspections
and 6 visual inspections; none is recorded as a live interaction test. The inventory
contains 41 documentation surfaces, 7 real-product surfaces, and 6 design systems.
Public documentation access does not imply free access to the underlying product.

Structural checks passed for JSON parsing, required fields, enum values, dates,
unique IDs and exact URLs, resolving references, and the five component/four
interaction families. Vercel's same-domain landing/dashboard records retain
independent access and verification. Marketplace registration, README count,
frontmatter, local links, line-count guard, and whitespace checks passed.

Kdenlive supplies the closest structural analogue, complemented by Windmill's
movement contracts, Baserow/Krita selection mechanics, and Godot's deeper inspector.
These are proposals inferred from documentation. Compactness, focus behavior, hit
targets, cancellation feedback, mixed-value batch editing, and usability at realistic
sequence lengths remain unresolved and require an actual Atelier prototype.

## Selection-contract scenario check

On 2026-09-19, a delegated read-only reviewer applied the revised skill to five
synthetic evidence fixtures. This checks instruction interpretation, not live sites
or the real Atelier interface.

| Fixture | Reviewer outcome |
| --- | --- |
| Dense dashboard brief; approved landing-page screenshot only | Rejected as a surface mismatch; no relevant reference found. |
| Scroll-animation brief; still image and unplayed video link | Motion unsupported; no verified animation claim retained. |
| Duplication described by an official manual | Accepted only as documented behavior, not a live test. |
| Mixed visual/drag brief; editor screenshot with list and handles | Visual claims conditionally accepted; dragging remains unproven. |
| Relevant URLs blocked by login; unrelated public gallery | Access blockers reported; unrelated gallery excluded. |

The reviewer identified two wording gaps: image provenance and the track for motion.
The final wording requires an identified source URL for captures and assigns timing
and triggers to the behavioral track. These two clarifications received a parent
text review, not a second delegated run. Frontmatter, local links, marketplace
registration and whitespace checks passed. The catalog remained unchanged:
SHA-256 `2767fac1bf233f77d01f121f108fbaf8945b530c36803e8e4aa92472d4311157`.
