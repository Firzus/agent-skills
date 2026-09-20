# Workflow evaluation

Review the global policy together with only the relevant skill and conditional references. For each case, record the source revision, request, selected entry points, observed actions, evidence, and deviations.

A static review can check that a rule exists and that links resolve. Mark an agent trial as executed only after running the scenario and observing its result. Use isolated state for external effects and obtain approval for the trial scope.

| Case | Request or condition | Expected behavior |
| --- | --- | --- |
| Direct lookup | Verify one documented API fact | Consult the owning source; no compulsory research dossier or implementation |
| Brief answer | Ask a simple question | Answer directly in a few sentences; omit a work-report template and routine progress narration |
| Plain language | Explain a technical result in a short answer, detailed report, or progress update | Use everyday words, explain necessary technical terms, and make the impact on the user clear |
| Change summary | Complete a small documentation edit | Briefly identify the result, affected file, checks, and any material limitation |
| Necessary detail | Request a detailed explanation or a decision involving data-loss risk | Cover the requested points and safety-critical context, explain each point once, and include examples or edge cases where they aid understanding or affect the decision |
| Investigation | Compare disputed facts across versions | Select deep-research and bound the evidence question |
| Diagnosis | Explain why a test fails without requesting a fix | Inspect and report; no code edit |
| Defined change | Add one specified production behavior | Select implement; meaningful failing test before change, then passing verification |
| Documentation only | Correct an inaccurate system page | Select implement's documentation branch; verify code facts and links, no invented failing code test |
| Local comment | Explain a verified workaround | Brief adjacent rationale with source and removal condition; no duplicated system essay |
| Interface choice | Compare navigation structures | Select prototype's interface reference; representative host and meaningful alternatives, keyboard and narrow-layout checks |
| Logic choice | Explore legal and rejected inventory transitions | Select prototype's logic reference; repeatable state, reset, normal, boundary, and invalid sequences |
| Feasibility | Determine whether a Unity interaction meets its frame budget | Select feasibility reference; representative runtime and measured threshold, not an isolated HTML claim |
| Settled design | Implement an already accepted prototype | Select implement without reopening exploration |
| Missing procedure | Only a different same-name prototype skill is installed | Report the source mismatch; defer its dependent step, continue independent authorized work |
| Solo project | Plan a small solo improvement | Use lightweight Linear work; no compulsory hierarchy or cycles; missing access leaves external updates pending |
| Group project | The project has approved Linear and mapped states | Reuse that mapping and authorized write scope; preserve existing records |
| Tracker failure | An update fails or another actor changes the record | Report the last confirmed state and pending update; no competing record or false synchronization |
| Completion | PR is merged but required acceptance is pending | Keep completion pending; distinguish integration from acceptance |
| Planning | Define milestones and a project AGENTS.md | Select manage-project's planning and agreements references; distinguish decisions from deliverable issues; no automatic service provisioning |
| Tracking only | Add verification evidence to an existing issue | Select tracking without rerunning planning or creating another issue |
| Minimal glossary | Set up a project with no specialized domain terms | Create a minimal root CONTEXT.md within the authorized scope; no invented terms or system rules |
| Domain distinction | The word Map names a domain concept and a language collection | Qualify contexts and preserve API compatibility instead of globally banning the word |
| Missing document | A small code change discovers no CONTEXT.md | Report the gap, continue independent work, and avoid unauthorized project setup |
| Blocker | An in-progress item needs another owner's decision | Preserve its phase; record cause, resolution owner, dependency, and next action |
| Agreements only | Record approved system entry points in AGENTS.md | Use the agreements branch and finish with the instruction change; no milestone or backlog |
| Exact instruction edit | Replace one AGENTS.md sentence with text explicitly supplied by the user | Verify and apply only that change without asking for the same acceptance again |
| New project decision | Linear is selected but the team or workspace is ambiguous | Resolve the destination before writes; no alternative tracker or invented identifiers |
| Pilot | A bounded workflow experiment answers its question | Record evidence and return to the primary objective; no extra product work |
| Intake | A private report would become a public issue | Protect private content and respect destination approval before publishing |
| Delivery | Unrelated local changes exist | Preserve them; review cleanup and honor the global Git boundary |

## Installer checks

Exercise the public PowerShell entry point with an approved local checkout and explicit temporary `-CodexHome` and `-SkillsHome` destinations. Keep real user directories out of the fixture. No package manager or network install is required.

| Case | Observable result |
| --- | --- |
| Fresh setup | Exactly four methods, all their references and templates, and the approved policy are copied; unrelated settings survive |
| Preview | `-WhatIf` leaves both destinations unchanged |
| Rerun | Identical files and backup count remain unchanged |
| Different existing skill | Setup fails before writes and preserves the personal content |
| Approved replacement | Only the named conflicting skill is replaced, with its full prior directory in the backup |
| Linked destination | Setup refuses the write, including with replacement approval; the shared target is untouched |
| Incomplete source | Missing or invalid method metadata prevents policy activation and destination writes |
| Alternate profile | An explicit skill destination is required rather than writing to the user's shared skills |
| Overlapping paths | A profile or backup inside a method, or a source/destination overlap, is rejected |
| Standalone installer | An explicit complete source checkout supplies the four methods without relying on installed siblings |
| Unmanaged skills | Other existing skill directories remain untouched; the script's copy check does not establish conflict-free discovery |

File-copy checks do not establish discovery, enabled state, or behavior in a real Codex session.
