# Memory leaks and heap snapshots

Adapted from the upstream `memory-leak-debugging` skill for the CLI; see
[NOTICE](../NOTICE). Use it for growing memory, out-of-memory errors, and heap
snapshot capture, comparison, or inspection.

The analysis commands are on by default (`start --memoryDebugging=false` removes
them). They take a `.heapsnapshot` path, so they also analyze snapshots written by
Node.js (for example with `v8.writeHeapSnapshot()`).

- Never read a `.heapsnapshot` file directly: it is too large. Use the analysis
  commands.
- Heap snapshots contain page memory, including tokens and personal data. Keep them
  in the task's output directory and do not share them.
- Release every loaded snapshot with `close_heapsnapshot <filePath>` when finished.

## 1. Capture

1. Bring the page to a stable starting state and take the baseline:
   `take_heapsnapshot <pageId> <abs>/baseline.heapsnapshot`.
2. Repeat the suspected action about 10 times (`click`, `navigate_page`, `fill`) to
   amplify the leak, then take `<abs>/target.heapsnapshot`.
3. Undo the action (close the dialog, navigate back), then take
   `<abs>/final.heapsnapshot`. Memory that should have been released but persists
   in this snapshot is the suspect.

## 2. Compare

1. `get_heapsnapshot_summary <file>` for each snapshot: confirms that it loads and
   gives totals.
2. `compare_heapsnapshots <baseline> <target>` for the summary diff, then
   `--classIndex <n>` only for classes with suspicious growth.
3. `get_heapsnapshot_details <file> --filterName <filter>` targets typical causes:
   `objectsRetainedByDetachedDomNodes`, `objectsRetainedByEventHandlers`,
   `objectsRetainedByContexts`, `objectsRetainedByConsole`.
4. `query_heapsnapshot_objects <file> --isDetached true` or
   `--className <regex> --retainedSize 1MB-` finds large or detached objects;
   `analyze_heapsnapshot_contexts <file>` ranks closures holding values no live code
   can read.

## 3. Explain retention

1. `get_heapsnapshot_class_nodes <file> <classId>` lists instances (class ids come
   from `get_heapsnapshot_details`).
2. For a representative node id: `get_heapsnapshot_retaining_paths`,
   `get_heapsnapshot_retainers`, `get_heapsnapshot_dominators`,
   `get_heapsnapshot_edges`, and `get_heapsnapshot_object_details` (size, distance,
   detachedness), each as `<file> <nodeId>`.
3. When strings dominate the growth, use `get_heapsnapshot_duplicate_strings <file>`.
4. Follow the retaining path to application code before proposing a fix.

## Common causes

| Cause | Fix |
| --- | --- |
| Event listeners on `window`, `document`, or long-lived objects never removed | `removeEventListener` on teardown or unmount |
| Detached DOM nodes still referenced from JavaScript | Release the reference when the node is removed. Some sites cache detached trees on purpose: report them and ask before changing that code. |
| Accidental globals (undeclared variables, properties on `window`) | Strict mode, declared variables, no global state |
| Closures capturing large outer objects | Do not capture what is unused; release large objects when done |
| Unbounded caches, arrays, or maps | Size limits, LRU eviction, `WeakMap`/`WeakSet` for data tied to object lifetimes |

## Reporting

Give the growth between snapshots (class, count, retained size), the retaining path
to application code, the snapshot paths, and the number of repetitions. Without a
retaining path into application code, the cause is a hypothesis.
