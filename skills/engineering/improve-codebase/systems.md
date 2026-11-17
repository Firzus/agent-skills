# Systems

How the system track decides that a whole system falls short, finds a better
one, and replaces it. Read this when the scope includes a system to improve on a
measurable quality: speed, responsiveness, memory, load time, build size.

A system is better only against a target. Research proposes which designs could
meet it; only a measurement in the real environment, on representative
scenarios, says which one does. So research comes before prototypes and decides
what is worth building, and prototypes decide between what research proposes.

## 1. Target

The target is the user's decision: the quality, the scenarios that represent
real use (for example, opening a screen with 500 elements, or dragging a widget
for ten seconds), the exact metric (what the timer includes), and the threshold
that counts as good enough. When the user has none, measure first and propose
one from the baseline; a short search for what comparable systems achieve on
similar scenarios gives the user a reference. Nothing is judged until the user
confirms it. When the project shows no representative scale (sample content far
smaller than real use, for example), propose the scale as part of the target
and label it an assumption.

**Waiting:** without a confirmed target, the track runs step 2 only, then
presents the baseline, the proposed target, and any hypotheses from reading the
code, labelled as such, and stops. Once the user confirms a target, it resumes
at step 3.

## 2. Baseline

Build a benchmark that drives the scenarios through the system's real entry
points, in every environment where the cost is felt: the development tools
(an editor, a dev server), a release-like build, and any development mode users
work in, such as Unity's play mode for authors testing their content. Costs
that release builds strip, such as verbose logging, show up only in the
development environments. Use the stack's profilers and benchmark harnesses
(in Unity, the Profiler, `ProfilerRecorder`, and the Performance Testing
package).

Run each scenario several times, after a warm-up, and record the median, the
spread, the machine, and the configuration: build type, optimization level, how
the host ran (Unity batchmode or interactive, for example), the toolchain
executables involved, and the scenario set, its order, and the warm-up, since
running a subset changes the numbers through just-in-time compilation and
caches. Compare only runs with identical configurations, made in the same
session: the same code can drift by tens of percent within an hour. Every
comparison, probes included, therefore runs between two baseline runs, one
before and one after, and a gain counts only when it lies outside both.

Measure one run at a time on an otherwise idle machine: two builds or hosts
measured together corrupt each other's numbers. Before each run, wait for a
quiet period with none of the recorded toolchain executables running, matched by
path rather than name, and sample during the run to discard it if one starts.
When the user's own editor or IDE matches, ask the user to close it for the
measurement window; if it stays open, record that in the configuration and keep
it idle in every compared run. When other agents share the machine, take turns
in arrival order, for builds as well as measurements: each agent adds a ticket
to the queue folder named in the scope note and runs only when its ticket is the
oldest, removing it when its process exits. A lock retried on a timer lets other
agents jump ahead indefinitely. When a build rewrites tracked files (render
settings, generated content), save that diff and restore the files after each
run, so every run starts from the same state.

When a scenario cannot be automated where the cost is felt (an editor window
without an automation hook, for example), say so. Either give the user exact
steps and a profiler capture to run, or propose an automation hook as a first
change. Never substitute a measurement of something easier to automate.

The benchmark is reused unchanged by every later step, so the numbers stay
comparable. Keep it as a patch in the session folder, or as a commit on a local
branch when commits are authorized; every probe, prototype, and migration step
applies that exact patch and records its hash beside each measurement.

**Target met:** report the baseline as evidence that the system is sufficient,
and stop the track.

## 3. Locate the cost

Profile the scenarios and attribute the time or memory to what causes it. A
probe that changes one variable beside the unchanged benchmark (switching off a
logger, for example) confirms an attribution the profile only suggests. Where
no profiler capture can be read, as in a headless run, probes and timing
instrumentation stand in for it; instrumentation gives proportions, not
removable cost, so say which. Separate two causes, because they lead to
different work:

| Cause | Example | Work |
| --- | --- | --- |
| A local defect | One function allocates in a loop, a cache is missing | A targeted fix, applied like a `Refactor`; when it changes what users observe (a log line disappears, a callback stops firing), it is an `Ask` naming that change |
| The design itself | Every edit rebuilds the whole tree; layout recomputes for unchanged content; data crosses a slow boundary per element | A new design, through steps 4 to 6 |

The **optimized current system** is the current code with every local fix
stacked; measure it beside each fix alone. A local fix that reaches the target
beats a new system: it is cheaper and carries less risk. Propose a new design
only when the profile shows the design imposes the cost.

## 4. Research the alternatives

The main thread runs this step, because a `research` run delegates its own
researchers and a sub-agent cannot. While the baseline runs, list the candidate
designs from the agent's own knowledge; search further only once step 3 shows
that the design itself imposes the cost, since a local defect needs no new
system. Start from the project's design documents and any existing dossier on
the subject, located as the [`research`](../../stack/research/SKILL.md) skill's
step 2 describes; read its `overview.md` first. Then choose the depth the
decision needs, and state it in the proposal:

| Depth | When | What it yields |
| --- | --- | --- |
| The agent's own knowledge | A well-known problem with established designs, and prototypes cheap enough to settle the doubt | Candidates labelled unverified; the prototypes carry all the proof |
| A short web search | Candidates need checking against the project's versions and platform, or reported measurements to set expectations | Each candidate with the sources that support it |
| The `research` skill | Many plausible designs, costly prototypes or migration, or the user asks for it | A checked dossier: follow [`../../stack/research/SKILL.md`](../../stack/research/SKILL.md), updating an existing dossier rather than starting another. Without that skill, use a short web search and say so |

Once the cost is located, sort the alternatives against it. An alternative
reaches the proposal as a `Prototype` candidate only when it removes the
measured cost and has a reason to expect a gain in a comparable case; the
others are listed with the reason they were set aside. Always keep the
optimized current system as one of the alternatives, so a new design has to
beat it. Give each candidate the cost it removes and the evidence, its expected
gain as a range with its uncertainty, its migration cost, and what it would
break. When none survives, the track ends with the optimized current system as
the best known choice.

## 5. Prototypes

Each chosen candidate becomes a prototype, built by its own sub-agent in its
own scratch worktree, on top of the optimized current system. When the
`prototype` skill is available, the sub-agent follows its steps 1 and 2 in
[`../../stack/prototype/SKILL.md`](../../stack/prototype/SKILL.md) with three
overrides: it works in its scratch worktree instead of a `prototype/<subject>`
branch, it applies the benchmark patch from the session folder unchanged, and
it takes no measurement. Each prototype:

- implements the smallest slice of the system that the costly scenarios
  exercise, through the same entry points;
- returns its patch with its hash, how to run it, what it left out, what the
  full migration would still need, and the tests that show which behaviour it
  keeps and which it changes;
- is measured by the main thread with the unchanged benchmark, one variable
  changed against the optimized current system: every variant in one
  measurement worktree, applying and reverting its patch so all share the same
  build cache, one at a time between the two baseline runs step 2 requires;
- is tested by the main thread: the full suite runs once on the optimized
  current system and once on the variant the recommendation favours, since a
  local fix in the stack can itself break behaviour.

Prototypes never merge into the product, and committing or pushing one needs the
same authorization as any commit. The main thread presents the measurements
beside the baseline and the target and collects the user's choice. A result
where no alternative beats the optimized current system is a valid answer.

## 6. Migration

Plan the chosen design as a sequence of steps that each leave the product
working: introduce the new system behind the interface callers already use,
move callers in slices, then remove the old system as a cleanup candidate. Each
step is a `Refactor` candidate and goes through Apply, with the benchmark re-run
after it to show the gain and to catch a regression early. When the code forces
a step away from the plan (an ordering constraint the new system cannot meet in
one place, for example), adapt the step and state the divergence and its reason
in that step's change. When the migration outlasts one session, report the
remaining steps as pending, and record them in the project's tracker only with
the user's authorization.
