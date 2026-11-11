# Iteration: the user tries changes in an open Editor

Read this when the user needs the Editor: they will try something in it (a test
scene, a tool), or they ask for it to be opened. The agent's own work (compile,
tests, builds, generation, evidence) stays headless, as
[Run Unity headless](./SKILL.md#run-unity-headless) describes. Command names and
arguments come from `unity list --json`, as [the Unity CLI skill](./SKILL.md)
requires.

The user's Editor belongs to the user:

- It runs as a harness background task, so it ends with the task instead of
  outliving the work it was opened for.
- The agent never closes it, and never stops the task that holds it, while the
  user may be working in it: both end the Editor without saving.
- The agent runs nothing in it on its own behalf without the user's agreement:
  no test run, no Play Mode, no scene opened over the user's work. Each of
  these can raise a save dialog about changes the user did not make.

## Open the Editor for the session

1. When the project's Editor is already open but was not opened by the agent
   (by the user or an earlier session), connect to it and tell the user it is
   not tied to this session. Run the `isHumanControllingUs` check from
   [Connect to a running Editor](./SKILL.md#connect-to-a-running-editor): when
   it returns `false`, the Editor cancels every dialog, so tell the user and let
   them decide whether to reopen it without `-automated`.
2. Otherwise, start the Editor executable directly as a harness background
   task, not with `unity open .`, which detaches the Editor so it outlives the
   session. Read `m_EditorVersion` from `ProjectSettings/ProjectVersion.txt`,
   take that version's `location` from `unity editors list --json`, and run the
   executable in the foreground of the background task, without `-automated`,
   so each dialog waits for the user's answer:

   ```powershell
   & $unityExe -projectPath $projectPath -logFile "$projectPath/Logs/Editor.log" | Out-Null   # Out-Null waits for the GUI process
   ```

   On macOS, `location` is the `Unity.app` bundle; run
   `Unity.app/Contents/MacOS/Unity` inside it.
3. Prove readiness as [Connect to a running Editor](./SKILL.md#connect-to-a-running-editor) describes.
4. Tell the user that the Editor is tied to this session: ending the session
   or stopping the task can close it without saving, so they save their work
   before they end the session.

When the harness cannot run background tasks, open it with `unity open .`
instead and tell the user it will outlive the session and that they close it
themselves.

When the task ends while the agent did not stop it, check `unity status` and
the end of `Logs/Editor.log` to tell a crash from the user closing it, and
reopen it only when the user needs it again.

When a main-thread command fails with `EDITOR_NOT_READY` quoting a dialog, the
Editor is waiting for the user. Tell the user which dialog to answer, then
wait.

## Agent work while the Editor is open

Batch runs need this Editor closed. When the agent needs
tests, a build, or generation, ask the user to choose:

- **Close the Editor**: the user saves and closes it, or agrees that the agent
  closes it as [End the trial](#end-the-trial) describes. The agent then runs
  headless and reopens the Editor afterwards when the user needs it.
- **Wait**: the agent waits until the user is done with the Editor.
- **Run in this Editor**: only with the user's explicit agreement, following
  [Run tests in the open Editor](#run-tests-in-the-open-editor).

Before a recompile, which reloads the Editor's code, check
`EditorApplication.isPlaying` through `eval`; when the user is in Play Mode,
ask first. Then run `unity recompile` after editing code. When it exits
non-zero, read the errors and fix them first.

When the agent's headless runs are done and the user wants to try the result,
open the Editor as [Open the Editor for the session](#open-the-editor-for-the-session)
describes, then [prepare the user's trial](#prepare-the-users-trial).

## Run tests in the open Editor

Only with the user's agreement. A test run interrupts the user's trial, and a
PlayMode run or a test that opens scenes raises the "Scene(s) Have Been
Modified" dialog when a scene is dirty. Check `isDirty` in
`unity command scene list_open` first; when a scene is dirty, tell the user the
run will ask to save, then start it.

1. Run `unity vcs affected . --json` (add `--since <ref>` to include committed
   branch work). It reads the project without an Editor and lists the affected
   `testAssemblies`; `unity command test list` gives each assembly's mode.
2. Run each affected assembly with
   `unity command test run --mode <editor|playmode> --filter <assembly> --filter_type assembly --async_tests true`.
   A synchronous run fails when the CLI's 30-second command timeout expires,
   and its results are lost.
3. Poll `unity command test status`. Until the new run reports `running`, it
   still returns the previous run's result, such as a total of 0 or another
   fixture's results: wait for `running` before treating `completed` as this
   run's result.
4. Bound the poll with a total time limit sized to the suite. A dialog keeps
   `test status` at `running` and `unity status` at `ready`, so pair each poll
   with `unity command scene list_open`, which fails with `EDITOR_NOT_READY`
   while a dialog blocks the Editor. At the limit, run
   `unity command test cancel` and report the run as unfinished.
5. Read failures from the `results` of `test status` (`Message`, `StackTrace`)
   and from `unity command console get --level error`.

A `testName` filter set to a fixture name runs that fixture's plain tests but
can miss its parameterized cases; filter by assembly, or list the cases.

EditMode tests that write engine settings, such as `Time.fixedDeltaTime`, leave
the changed value in the Editor after the run, and a later
`AssetDatabase.SaveAssets()` can write it into `ProjectSettings/*.asset`.
Restore such settings in the test's teardown, and check `git status` for
`ProjectSettings` changes after a run.

`vcs affected` reports a lower bound: assets loaded by path, name, or
Addressables escape its analysis. Before handing back the finished result, run
the complete suite in both modes without a filter, headless when the Editor can
be closed, otherwise with the same asynchronous run and bounded poll.

## Prepare the user's trial

1. When `scene list_open` reports a dirty scene, tell the user a save prompt
   is coming, then run
   `UnityEditor.SceneManagement.EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()`
   through `eval` with a timeout long enough for the user to answer. Read
   `isDirty` again afterwards rather than trusting the return value, which is
   also `true` when the user declines to save.
2. When no scene is dirty, or the user agreed to discard the changes, open the
   scene under test with `scene open`. Otherwise leave the open scene as it is
   and name the scene to open in the steps. Select the object under test with
   `set_selection`, and leave entering Play Mode to the user.
3. Call `unity command console get --tail 1` and keep its `cursor` and
   `session`.
4. Give the user the steps to follow and the result to expect.

After the user reports, read the Console entries logged during the trial with
`console get --since <cursor> --since_session <session>`.

## End the trial

At the end of the task, leave the Editor open: the user may still be working
in it, and it closes with the session. Close it only when the user asks or
agrees. Then, when `scene list_open` reports unsaved changes, ask the user
whether to save them (`save_all`) or discard them. After saving, check
`isDirty` again, and close with `unity close .` only when no scene is dirty or
the user agreed to discard: the close saves nothing. A normal close ends the
background task on its own; stop the task only when the close fails.
