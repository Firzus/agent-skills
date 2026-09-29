# Produce an executable brief

Every executable issue uses the strict [template of its type](#issue-templates). Link
authoritative definitions, decisions, and evidence rather than copying them.

## Choose the next work

- Triage looks up discoverable facts itself; `interview` settles consequential
  decisions with the user during triage.
- Every work item selected for later execution gets an issue, even a small
  implementation. Reuse existing issues; a decision settled during triage needs no
  extra issue.
- Create an Interview issue only for a decision that waits on a Research or Prototype
  result, or that a person other than the current user must take.
- A decision the user left to the agent keeps its mark in "Accepted decisions":
  `Agent recommendation (delegated by the user): <choice>, because <reason>.`
- Use [large work](large-work.md) for work that needs more than one issue.

| What must happen next | Type label | Expected result |
| --- | --- | --- |
| Resolve a preference or domain choice | Interview | An accepted choice and its consequences |
| Investigate a question through substantial source research | Research | A sourced answer and remaining uncertainty |
| Build and observe an experiment to answer a question | Prototype | Observations supporting a design or feasibility decision |
| Correct a defect: existing behavior contradicts its accepted or documented expected behavior | Bug | A diagnosed cause and a verified fix merged through a linked PR |
| Deliver new or changed behavior, or documentation | Task | A verified change merged through a linked PR |

Choose the missing result, not size, risk, or UI presence. Prepare prerequisites
first; these are alternatives, not mandatory stages. Work whose content depends on
an open Interview decision is drafted after that decision, not before.
A Research or Prototype issue can be ready while the Interview issue it informs,
and the work depending on that decision, stay blocked. `implement` executes every
type and selects the matching skill from the Type label.

## Bound missing evidence

| Missing input | Next action |
| --- | --- |
| Discoverable project fact | Inspect its owner or run a safe existing check |
| Disputed external fact needing substantial research | Prepare a Research issue stating the question and required evidence |
| Behavior requiring observation | Prepare a Prototype issue stating the question and how its result will be judged |
| Domain intent or preference | Run `interview` |
| Access or external prerequisite | Name the required action and owner |

A Prototype issue is justified when an important choice needs observed behavior,
such as an interactive UI comparison or a simulation of ambiguous domain rules;
UI or critical logic alone does not require one. For a Research or Prototype issue,
also prepare an Interview issue blocked by it, holding the decision its result
informs, and block dependent work on that Interview issue. When `implement` runs
the Interview issue, the decision is taken with the recorded result. Report missing
capabilities instead of inventing them or provisioning services.

## Labels, status, and relations

| Record | Complete label set | Values |
| --- | --- | --- |
| Executable issue | Exactly one Type label | Task, Bug, Prototype, Research, Interview |
| Grouping parent | No labels | None |
| Project | Exactly one Product label | The product the project serves, such as Huzounet App or Atelier |
| Captured work awaiting triage | Only the standalone Need triage label | Need triage |

- Resolve Type labels in the issue-label catalog and Product labels in the
  project-label catalog. Match the catalog, parent group, and active state, not
  just the name; archived or retired labels are ineligible. Before reusing an
  ungrouped label in the correct catalog, place it in the required group and
  verify the membership. Create a missing label or group in that catalog.
  Each grouped label is named by its value; some tools display it as `Type/Bug`.
- Resolve the product from the repository and existing projects when labeling a
  project; ask only when the evidence names none. Product labels belong exclusively
  to projects, including when an issue-label catalog contains legacy product labels.
- For every issue created or updated by triage, apply and verify the complete label
  set above rather than append a Type label to existing labels. Include removal of
  legacy product or other extra labels in the approved draft; leave issues outside
  the approved publication scope unchanged.
- Publish every new issue in **Backlog**. A reused issue keeps its status. The user
  moves selected issues to **Todo** for the week's work.
- Record each prerequisite as a native Linear blocking relation. Blocking is the only
  native relation triage creates; cite other related issues in References.
- When triage changes the content or relations of a reused issue, rewrite its body
  to the template of its type, even when only a relation changes. Preserve its
  existing information and status; include the rewritten body in the draft for
  approval. An issue only cited in References stays unchanged.

### Need triage

With approval of content and destination, record work captured outside triage,
such as a quick note or an out-of-scope finding, as an issue labeled **Need triage** in Backlog, using the
[Need triage template](../templates/need-triage.md). It is exempt from the issue
template until triaged.

A `triage` run processes it: resolve its decisions, rewrite it with its type template,
apply the Type label, remove Need triage, and preserve its current status. Mark it
Duplicate when another issue covers it, or Canceled when the user declines it.

## Issue templates

Each Type label has one template, so every issue of a type reads the same way.
A template is strict: keep every section, in this order, and add none. Write
"None" in a section that has no content. Translate headings into the project's
artifact language without changing their number or order.

| Type | Template | Structure |
| --- | --- | --- |
| Task | [task.md](../templates/task.md) | Spec-driven: one user story, acceptance criteria as Given/When/Then scenarios |
| Bug | [bug.md](../templates/bug.md) | Reproduction record, impact, and the regression evidence expected |
| Prototype | [prototype.md](../templates/prototype.md) | Question, the decision it informs, experiment, and how the result is judged |
| Research | [research.md](../templates/research.md) | Question, the decision it informs, and the evidence that answers it |
| Interview | [interview.md](../templates/interview.md) | Decision, known options, inputs, and the work it informs |

A Task delivers one user story. A story too large for one reviewable change
becomes several Tasks, each with its own story and scenarios; see
[large work](large-work.md#choose-the-structure) for the size rule.

## Authoring rules

- Express acceptance as behavior, not files to edit.
- Use verified code locations as navigation hints. A small prototype fragment may
  clarify an accepted contract; identify its provenance and experimental status.
- Name existing tests in Verification only when they are verified; otherwise
  describe the evidence that will demonstrate each criterion.
- Carry the defect's reproduction record; distinguish symptoms from unproven causes.
- Redact secrets, personal data, and private details. Replace inaccessible evidence
  links with safe summaries or approved shared artifacts; brief publication does
  not authorize uploading private files.

## Readiness review

Read the draft without chat history, checking the selected work's scope:

- [ ] The outcome and protected existing behavior are clear.
- [ ] Decisions needed to execute the selected work are accepted. Its intended
  research answer, experimental result, or interview decision may remain open.
- [ ] [Integrated context and relevant pending deltas](domain-context.md) have
  been checked; accepted changes have an accessible owner and delivery requirements.
- [ ] Facts, accepted choices, and remaining uncertainty are distinguishable.
- [ ] Success and relevant failure cases can be verified independently of the implementation.
- [ ] Prerequisites are recorded as blocking relations and their required inputs
  are available before execution.

| Type | Ready to execute when |
| --- | --- |
| Task, Bug | Scope and expected behavior are defined, with observable acceptance criteria; a Bug's cause remains for debug to establish |
| Research | Question, scope, and required evidence are defined; the answer is the result of execution |
| Prototype | Question, experiment, constraints, and judgment criteria are defined; observations are the result of execution |
| Interview | Decision question and required inputs are identified and available; the accepted choice is the result of execution |

**Ready:** checks pass for the selected work, not necessarily the whole feature.
Otherwise name the gap, prepare its prerequisite using the routing table, and
block the issue on that prerequisite.
Routine internal choices stay with the implementer when outcome/contracts are unchanged.

## Split only when justified

1. Propose additional issues only for independently verifiable outcomes,
   separate ownership, or real dependencies.
2. Prefer end-to-end slices, each including its tests and necessary documentation.
   For a broad compatibility refactor, use a safe sequence instead: add the
   compatible form, migrate callers, then retire the old form. State where
   integration verification is required.
3. Present a numbered breakdown: **title, type, outcome, acceptance evidence, blocked by**.
4. Obtain approval for the breakdown through the main skill's review step.
5. Once publication provides real identifiers, create the approved blocking
   relations natively and verify them. If native relations are unavailable, report
   the limitation. Preserve the existing parent issue.
