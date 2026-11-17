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
that counts as good enough. When the user
has none, measure first and propose one from the baseline; nothing is judged
until the user confirms it. When the project shows no representative scale
(sample scenes far smaller than real use, for example), propose the scale as
part of the target and label it an assumption.

**Waiting:** without a confirmed target, the track runs step 2 only, then
presents the baseline, the proposed target, and any hypotheses from reading the
code, labelled as such, and stops. Once the user confirms a target, it resumes
at step 3.

## 2. Baseline

Build a benchmark that drives the scenarios through the system's real entry
points, in every environment where the cost is felt: the editor for editor
tooling, a release-like build for runtime code, and also the editor's play mode
when the users who feel the cost are authors testing in it. Editor-only costs,
such as logging that release builds strip, show up only there. Unity offers the
Profiler, `ProfilerRecorder`, and the Performance Testing package; other
stacks have their own profilers and benchmark harnesses. Run each scenario
several times, after a warm-up, and record the median, the spread, the machine,
and the configuration: build type, code optimization mode, whether the editor
ran in batchmode or interactively, and the scenario set, its order, and the
warm-up, since running a subset changes the numbers through just-in-time
compilation and caches. Compare only runs with identical configurations, made
in the same session: the same code can drift by tens of percent within an hour,
so every comparison, probes included, needs a fresh baseline run beside it.

Measurements run one at a time on an otherwise idle machine: two editors or
builds measured together corrupt each other's numbers. Before each run, wait
for a quiet period with no other editor, build, or player process, matched by
executable path rather than name, and sample during the run to discard it if
one starts. When other agents share the machine, take turns in arrival order,
for builds as well as measurements: each agent adds a ticket to a queue folder
all of them use and runs only when its ticket is the oldest, removing it when
its process exits. A lock retried on a timer lets other agents jump ahead
indefinitely. When a build rewrites tracked
files (render settings, generated content), save that diff and restore the
files after each run, so every run starts from the same state.

When a scenario cannot be automated where the cost is felt (an editor window
without an automation hook, for example), say so. Either give the user exact
steps and a Profiler capture to run, or propose an automation hook as a first
change. Never substitute a measurement of something easier to automate.

The benchmark is reused unchanged by every later step, so the numbers stay
comparable. Keep it as a patch file outside the repository, or as a commit on a
local branch when commits are authorized; every probe, prototype, and migration
step applies that exact patch and records its hash beside each measurement.

**Target met:** report the baseline as evidence that the system is sufficient,
and stop the track.

## 3. Locate the cost

Profile the scenarios and attribute the time or memory to what causes it. A
probe that changes one variable beside the unchanged benchmark (switching off a
logger, for example) confirms an attribution the profile only suggests. Where
no profiler capture can be read, as in a batchmode run, probes and timing
instrumentation stand in for it; instrumentation gives proportions, not
removable cost, so say which. Measure the optimized current system as every
local fix stacked together, beside each fix alone.
Separate two causes, because they lead to different work:

| Cause | Example | Work |
| --- | --- | --- |
| A local defect | One function allocates in a loop, a cache is missing | A targeted fix, applied like a `Refactor`; when it changes what users observe (a log line disappears, a callback stops firing), it is an `Ask` naming that change, and is built test-first |
| The design itself | Every edit rebuilds the whole tree; layout recomputes for unchanged content; data crosses a slow boundary per element | A new design, through steps 4 to 6 |

A local fix that reaches the target beats a new system: it is cheaper and
carries less risk. Propose a new design only when the profile shows the design
imposes the cost.

## 4. Research the alternatives

The main thread runs this step, because a `research` run delegates its own
researchers and a sub-agent cannot. While the baseline runs, list the candidate
designs from the agent's own knowledge; search further only once step 3 shows
that the design itself imposes the cost, since a local defect needs no new
system. Start from what the project already knows: its design documents and any existing research
dossier on the subject, which the `research` skill keeps outside the repository
(`%LOCALAPPDATA%/agent-research/<topic>/` on Windows,
`~/.local/share/agent-research/<topic>/` elsewhere); list the topic folders and
read the `overview.md` of the matching ones rather than searching every file. Then choose the depth the
decision needs, and state it in the proposal:

| Depth | When | What it yields |
| --- | --- | --- |
| The agent's own knowledge | A well-known problem with established designs, and prototypes cheap enough to settle the doubt | Candidates labelled unverified; the prototypes carry all the proof |
| A short web search | Candidates need checking against the project's versions and platform, or reported measurements to set expectations | Each candidate with the sources that support it |
| The `research` skill | Many plausible designs, costly prototypes or migration, or the user asks for it | A checked dossier: follow [`../../stack/research/SKILL.md`](../../stack/research/SKILL.md), updating an existing dossier rather than starting another. Without that skill, use a short web search and say so |

Research also informs the target: what comparable systems achieve on similar
scenarios is the reference the user can set the threshold against.

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
own worktree, on top of the optimized current system. When the `prototype`
skill is available, the sub-agent follows its steps 1 and 2 in
[`../../stack/prototype/SKILL.md`](../../stack/prototype/SKILL.md) and returns
the record its step 3 describes; the main thread shows it and collects the
user's judgment. Committing or pushing a prototype needs the same authorization
as any commit here; without it, the prototype stays an uncommitted worktree,
its patch is saved with its hash, and its record says so. Each prototype:

- implements the smallest slice of the system that the costly scenarios
  exercise, through the same entry points;
- returns its patch, what it left out, what the full migration would still
  need, and the tests that show which behaviour it keeps and which it changes;
- is measured by the main thread with the unchanged benchmark, one variable
  changed against the baseline. Measure every variant in one measurement
  worktree by applying and reverting its patch, so all share the same build
  cache, and run them one at a time between two baseline runs, before and
  after the sequence. Claim only a gain that lies outside both baselines;
- runs the full test suite once on the stacked baseline and on the variant the
  recommendation favours, since a local fix in the stack can itself break
  behaviour.

Prototypes never merge into the product. The main thread presents the
measurements side by side with the baseline and the target, and the user
chooses. A result where no alternative beats the optimized current system is a
valid answer.

## 6. Migration

Plan the chosen design as a sequence of steps that each leave the product
working: introduce the new system behind the interface callers already use,
move callers in slices, then remove the old system as a cleanup candidate. Each
step is a `Refactor` candidate and goes through Apply, with the benchmark re-run
after it to show the gain and to catch a regression early. When the code
forces a step away from the plan (an ordering constraint the new system cannot
meet in one place, for example), adapt the step and state the divergence and
its reason in that step's change. When the migration
outlasts one session, record the remaining steps where the project tracks its
work, and report them as pending.
