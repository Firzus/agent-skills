# Iteration: changing code while the user tests in the Editor

In this loop the agent changes code and the user tries the result in the Editor.
The Editor stays open for the whole loop: tests run inside it rather than in a
batch-mode Editor that would require closing it. Command names and arguments
come from `unity list --json`, as [cli.md](./cli.md) requires.

## Open and track the Editor

1. When the project's Editor is already open but was not opened by the agent
   (by the user or an earlier session), connect to it and tell the user the
   harness does not track it. Run the `isHumanControllingUs` check from
   [cli.md](./cli.md#connect-to-a-running-editor): when it returns `false`, the
   Editor cancels every dialog, so tell the user and let them decide whether to
   reopen it without `-automated`.
2. Otherwise open it with `unity open .`, without `-automated`: the user works in
   this Editor, and each dialog waits for the user's answer.
3. Read its `pid` from `unity status --until-ready --json --project-path .`,
   then start a harness background task that waits for that process, so the
   user sees the Editor in the harness's task list. On Windows, run
   `Wait-Process -Id <pid>` in PowerShell; `unity open --wait` fails there with
   "The --wait option isn't supported on Windows yet" (CLI 1.0.0-beta.13). On
   macOS and Linux, run `while kill -0 <pid> 2>/dev/null; do sleep 5; done`.
   When the harness cannot run background tasks, skip tracking and tell the
   user: run in the foreground, the wait blocks the agent until the Editor
   exits.
4. Prove readiness as [cli.md](./cli.md#connect-to-a-running-editor) describes.

Stopping that task ends the tracking only: the Editor keeps running, and the
user closes it from its window or asks the agent. When the task ends while the
Editor still runs, such as at the harness's time limit, tell the user the
Editor now runs untracked. When the task completes and the agent did not close
the Editor, check `unity status` and the end of `Logs/Editor.log` to tell a
crash from the user closing it, and reopen it only when the loop needs it again.

When a main-thread command fails with `EDITOR_NOT_READY` quoting a dialog, the
Editor is waiting for the user. Tell the user which dialog to answer, then
wait.

## Run tests in the open Editor

Before recompiling or running tests, check `EditorApplication.isPlaying`
through `eval`. When the user is in Play Mode, ask first: both interrupt the
trial.

1. Run `unity recompile` after editing code. When it exits non-zero, read the
   errors and fix them first: tests would otherwise run the last assemblies
   that compiled.
2. Run `unity vcs affected . --json` (add `--since <ref>` to include committed
   branch work). It reads the project without an Editor and lists the affected
   `testAssemblies`; `unity command list_tests` gives each assembly's mode.
3. Run each affected assembly with
   `unity command run_tests --mode <editor|playmode> --filter <assembly> --filter_type assembly --async_tests true`,
   then poll `unity command test_status` until `status` is `completed`. A
   synchronous `run_tests` fails when the CLI's 30-second command timeout
   expires, and its results are lost: `test_status` then reports no run in
   progress.
4. Bound the poll with a total time limit sized to the suite. A dialog keeps
   `test_status` at `running` and `unity status` at `ready`, so pair each poll
   with `unity command list_open_scenes`, which fails with `EDITOR_NOT_READY`
   while a dialog blocks the Editor. At the limit, run
   `unity command cancel_tests` and report the run as unfinished.
5. Read failures from the `results` of `test_status` (`Message`, `StackTrace`)
   and from `unity command console --level error`.

`vcs affected` reports a lower bound: assets loaded by path, name, or
Addressables escape its analysis. Before handing back the finished result (see
[End the task](#end-the-task)), run the complete suite in both modes without a
filter, with the same asynchronous run and bounded poll.

A PlayMode run with a modified scene open raises the "Scene(s) Have Been
Modified" dialog, and the run waits for the user's answer. Check `isDirty` in
`unity command list_open_scenes` first; when a scene is dirty, tell the user
that the run will ask to save, then start it.

## Prepare the user's trial

1. When `list_open_scenes` reports a dirty scene, tell the user a save prompt
   is coming, then run
   `UnityEditor.SceneManagement.EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()`
   through `eval` with a timeout long enough for the user to answer. Read
   `isDirty` again afterwards rather than trusting the return value, which is
   also `true` when the user declines to save.
2. When no scene is dirty, or the user agreed to discard the changes, open the
   scene under test with `open_scene`. Otherwise leave the open scene as it is
   and name the scene to open in the steps. Select the object under test with
   `set_selection`, and leave entering Play Mode to the user.
3. Call `unity command console --tail 1` and keep its `cursor` and `session`.
4. Give the user the steps to follow and the result to expect.

After the user reports, read the Console entries logged during the trial with
`console --since <cursor> --since_session <session>`.

## End the task

At the end of the task, whatever its outcome, close the Editor the agent
opened. When `list_open_scenes` reports unsaved changes, ask the user whether
to save them (`save_all`) or discard them. After saving, check `isDirty`
again, and close with `unity close .` only when no scene is dirty or the user
agreed to discard: the close saves nothing. Leave open an Editor the agent
only connected to.
