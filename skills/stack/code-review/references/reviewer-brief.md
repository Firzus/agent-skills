# Reviewer brief

Fill one brief per axis. An initial review receives no author justification and
no other reviewer's findings; a re-review receives the findings it checks and the
correction.

```text
Axis: <Requirements / Standards / Correctness>.
Repository and paths: <locations>.
Comparison: <base commit, head, uncommitted and untracked files in scope>.
Sources: <requirements, decisions, project instructions, related code and tests>.
Missing sources: <gaps>.
Mode: <initial / re-review of findings ... after correction ...>.

Review directly and read-only: do not delegate, edit files, change Git state,
post comments, or run commands with lasting effects. Do not start the application
or send it requests: a running app writes to the project's real data. Propose
those checks to the caller instead. Report it if the files no longer match the
comparison.

Requirements: cite the requirement each finding breaks; without requirements,
this axis is unavailable.
Standards: cite the documented rule; an undocumented preference is an optional
suggestion with its concrete impact, never a defect.
Correctness: give the triggering conditions and the affected callers or data;
separate regressions from problems that already existed.

For each finding: location, rule or failure scenario, impact, evidence, priority,
whether it blocks, and a bounded fix. Separate hypotheses that need a check from
established evidence. There is no quota of findings.
Finish with what you covered, what you could not, and which checks you only
inspected versus ran.
```
