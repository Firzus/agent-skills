# Catalog format

## Search and identity

`catalog.json` is a UTF-8 JSON object containing `candidate_sources`,
`verified_sources`, and `verified_references` arrays. Search locally with the
available text search or JSON reader; no service, database, or package is needed.
Match component and interaction tags first, then context and access. Read the
complete matching record before following its URL.

A source is a coherent surface to explore, such as a product dashboard, landing
page, editor manual, component library, or gallery. A reference is a specific
component, page, or state inspected within that surface. Multiple component
examples in one manual normally become references to one source, not new sources.

Source IDs are stable lowercase kebab-case and unique across both source arrays.
Reference IDs are unique within `verified_references`; `source_id` must resolve to
one source in either source array. A formerly verified source may become inaccessible
without invalidating the historical record of an earlier reference.

The same domain or product may appear repeatedly for distinct surfaces. For example,
Vercel's public landing page and its account dashboard have separate IDs, URLs,
access requirements, tags, and verification records. Verification never propagates
between them. Count distinct verified surfaces, not URLs that redirect to the same
surface, tag combinations, or reference records.

## Source fields

| Field | Meaning |
| --- | --- |
| `id`, `name`, `url` | Stable identifier, explicit product/surface name, direct absolute HTTPS URL |
| `description` | Short explanation of the surface and why an agent would inspect it |
| `source_type` | `real-product`, `documentation`, `gallery`, `design-system`, or `concept` |
| `surface` | Specific lowercase kebab-case surface category, such as `landing-page`, `dashboard`, `editor`, or `editor-documentation` |
| `component_tags` | Components supported by the inspected evidence; hypotheses for candidates |
| `interaction_tags` | Documented, visibly offered, or tested interactions; the verification record distinguishes them |
| `contexts` | Applicable usage contexts |
| `visual_characteristics` | Visually inspected traits; an empty array means not established |
| `available_evidence` | Evidence present or linked on the surface, not necessarily inspected |
| `access` | Access to this exact URL: `public`, `free-account`, `paid`, or `unknown` |
| `strengths`, `limitations` | Short arrays describing usefulness and known constraints |
| `verification_status` | `verified` in verified sources; `candidate`, `inaccessible`, or `outdated` in candidate sources |
| `last_verified` | Date of the most recent successful inspection, or `null` if never verified |
| `last_attempted` | Date of the latest inspection attempt, including failures |
| `verification` | Latest successful inspection object, or `null` if none |
| `reason` | Required for candidates: what remains unverified or why access failed |
| `selection_provenance` | Optional array of `{name, url}` records linking to the editorial selection; listing is not an award unless explicitly established |
| `design_review` | Optional human review with `status` (`approved` or `rejected`), `date`, `scope`, and `reason` |

An absent `design_review` means the user has not reviewed the design. Technical
verification and editorial inclusion do not imply human approval. Approval applies
only to the recorded surface, scope, and presented associations, not other surfaces
of the product. Record a human verdict only after explicit user feedback.

Dates use `YYYY-MM-DD`. A verification object has `url`, `method`, `observed`, and
`limitations`. Methods are `page-text`, `visual-inspection`, and `interaction-test`.
Use the method actually performed, not the tool's theoretical capabilities.

The initial vocabulary is extensible; reuse an existing tag before adding a synonym:

| Dimension | Canonical examples |
| --- | --- |
| Components | `sortable-list`, `inspector`, `accordion`, `rule-builder`, `tree` |
| Interactions | `drag-and-drop`, `duplication`, `inline-editing`, `multi-selection` |
| Contexts | `professional-tool`, `creative-application`, `automation`, `game-editor` |
| Visual characteristics | `compact`, `dense`, `dark`, `touch-oriented` |
| Evidence kinds | `documentation`, `screenshot`, `interactive-demo`, `video`, `source-code` |

Documentation of a real product is a `documentation` source when the inspected URL
is its manual, not its live editor. The manual may be public even if the product
requires payment. Record that distinction in limitations. Do not infer commercial
terms, visual traits, or functionality from a product name.

## Verified references

| Field | Meaning |
| --- | --- |
| `id`, `source_id` | Reference identifier and parent source identifier |
| `url`, `target` | Exact example URL and named component, page, or state |
| `observations` | Short factual observations, explicitly attributed to documentation when applicable |
| `evidence_inspected` | Nonempty array of objects with `kind`, `url`, and `method` |
| `last_verified` | Date of actual inspection |
| `dynamic_visuals` | Optional array describing animation, video, or 3D elements in this specific reference; see below |
| `design_review` | Optional human verdict using the source review fields; applies only to this example |

For component libraries, group examples under one coherent library surface.
Keep component-specific tags in the reference's optional `component_tags`,
`interaction_tags`, `contexts`, and `visual_characteristics` arrays. A library's
review scope lists the selected examples; it does not approve every component.

A documented interaction can be a verified documentary reference without having
been tested live. Say "The manual describes...", not "Dragging works..." in that
case. Evidence availability and inspection stay separate. Keep transferable ideas
in the task report, clearly separated from these factual observations.

### Dynamic visuals

An omitted `dynamic_visuals` field means unknown, including in older records.
An empty array means none was detected in the inspected region and states, not
that the whole site is static. Each element contains:

| Field | Meaning |
| --- | --- |
| `type` | `animation`, `video`, or `3d` |
| `inspection` | `detected`, `documented`, or `sequence-inspected` |
| `description` | Element, location, and what the evidence actually establishes |
| `trigger` | Observed or documented trigger, such as load, scroll, hover, click, or pointer movement; `unknown` when not established |
| `reproduction_notes` | Missing evidence, assets, or behavior details needed to reproduce the effect; distinguish proposed approximations from observations |

`detected` means an element or affordance was identified, not that playback or
movement was inspected. `documented` attributes behavior to documentation.
`sequence-inspected` requires observing change over time through supported playback,
an inspected recording, or a sequence of states with their trigger identified.
Record the supporting evidence in `evidence_inspected`; use `visual-inspection`
for watched sequences and `interaction-test` only for interactions actually tested.

A static screenshot or text extraction cannot establish timing, easing, transitions,
looping, scroll synchronization, or a 3D camera path. Inspect those details when
tools permit and they matter to the brief; otherwise name them as unknown. A 3D
appearance does not establish real-time rendering: it may be prerecorded video.
Do not infer a framework, shader, model, or source asset from appearance alone.
Reproducing external media or 3D content may require original assets and permission;
reference access does not grant reuse rights. Keep captures targeted rather than
automatically recording every site, and disclose playback/tool limitations.

## Maintenance and completion checks

Ordinary exploration leaves every bundled file unchanged and returns proposed
updates in the conversation. Only explicit maintenance updates this source catalog.

1. Inspect the exact relevant public or authorized surface. A successful HTTP status,
   search snippet, login screen, or generic marketing claim is not enough to verify
   a component. Record the method, concrete observation, limitations, and date.
2. Promote a candidate only after obtaining meaningful evidence. Record at least one
   verified reference for each verified source. Leave blocked surfaces in candidates
   with an honest access value; a tool fetch failure alone does not prove a paywall.
3. When a verified surface becomes inaccessible or outdated, move it to candidates,
   retain its ID and last successful evidence/date, and record the failed attempt and
   reason. Historical references retain their original dates, not a new verification.
4. Parse the JSON; check required fields, enums, nonempty reference evidence, unique
   IDs, resolving relations, valid dates, and `last_verified <= last_attempted`.
   Check exact duplicate URLs and manually review surface overlap. Different URLs
   on the same domain are permitted, not automatically duplicates.
5. Reconcile source tags with evidence and verify that the five initial component
   families and four interaction families remain represented. Report coverage gaps
   instead of filling them with guesses. Recheck live URLs during exploration;
   historical verification is not a freshness guarantee.

Keep observations concise and paraphrased. Preserve URLs and limitations rather
than embedding copied documentation, third-party images, private workspace URLs,
or account-specific data. The initial release targets at least 50 verified distinct
surfaces; candidates and historical references do not contribute to that count.
