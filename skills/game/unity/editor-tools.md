# Editor tools — authoring UI for the gaps you fill yourself

Some needs have no Unity tool, so the project builds one — animation notifies,
ability definitions, combo trees, dialogue graphs. That tool needs an authoring
UI, and the stack below is the one to build it on.

Build on **UI Toolkit**, with no third-party inspector dependency. Unity ships
everything this needs, and a tool other people install must not drag a paid or
foreign license behind it.

| Need | Reach for |
| --- | --- |
| Inspector for a component or asset | `Editor.CreateInspectorGUI` |
| Inspector for one serialized type | `PropertyDrawer.CreatePropertyGUI` |
| Layout and styling | UXML + USS, authored in UI Builder |
| Heterogeneous items in one list | `[SerializeReference]` |
| Reorderable list | `ListView` with `reorderable = true` |
| Nested or hierarchical items | `TreeView` / `MultiColumnTreeView` |
| Fields bound to serialized data | `PropertyField` |
| Timeline strips, curves, custom graphics | `generateVisualContent` + `painter2D` |
| A control reused across tools | `[UxmlElement]` / `[UxmlAttribute]` |
| An API with no UI Toolkit equivalent yet | `IMGUIContainer` |

## Master-detail

The layout that scales past a flat inspector: items on the left, the selected
item's properties on the right.

- Split with `TwoPaneSplitView`.
- Drive the left pane with a `ListView`, or a `TreeView` when items nest.
- Rebuild the right pane on `selectionChanged`, binding `PropertyField`s to the selected element's `SerializedProperty`.
- Render list rows with `makeItem` and `bindItem`, which is where row icons, badges, and state colouring go.

This is what production authoring tools actually look like — a list, a detail
pane, and a custom strip — rather than a node canvas.

## Polymorphic lists

`[SerializeReference]` is what lets one list hold different concrete types —
the "Add Instruction…" pattern. Without it, a list holds one type.

- Declare the field as a `List<TBase>` with `[SerializeReference]`, where `TBase` is an interface or abstract class.
- Populate an `AdvancedDropdown` from the types deriving from `TBase`, and assign a new instance through `SerializedProperty.managedReferenceValue`.
- Let each type carry its own `PropertyDrawer`, so the detail pane draws whatever the user picked.

### Keep references alive

`[SerializeReference]` stores the concrete type identity — assembly, namespace,
class name — inside the asset. Renaming a type, changing its namespace, or
moving it between assemblies breaks every asset referencing it.

- Apply `[MovedFrom]` **before** the refactor that renames or moves a type. Applied afterwards, the assets are already broken.
- Audit with `SerializationUtility.HasManagedReferencesWithMissingTypes`.
- Leave a missing reference in place while diagnosing: `ClearManagedReferenceWithMissingType` discards the serialized payload Unity was holding for recovery.
- Fix compile errors before opening affected assets, since a type that fails to compile reads as a missing type.

## Custom graphics

`generateVisualContent` with `MeshGenerationContext.painter2D` draws timeline
strips, keyframe markers, and curves as a first-class UI Toolkit path — paths,
strokes, fills, and Bézier curves, no IMGUI needed.

- Call `MarkDirtyRepaint()` when the data changes; the callback runs only when the element is dirty.
- Read layout and data inside the callback and draw from it. The element is read-only there, so resolve geometry before drawing.

## Node graphs

Author on lists, trees, and timelines rather than a node canvas: Unity has no
production-ready graph foundation to build on. `UnityEditor.Experimental.GraphView`
is still experimental and carries the warning that it may change or be removed,
and its successor **Graph Toolkit** (`com.unity.graphtoolkit`) is `0.1.0-exp.1`,
explicitly not for production, and Editor-time authoring only with no execution
backend.

Keep the data model independent of the authoring UI — serialized types that know
nothing about `VisualElement`. A graph front-end then becomes a second view over
the same data once a stable foundation ships, rather than a rewrite.

## Editor code placement

Editor code lives under `Editor/` folders or Editor asmdefs, and the runtime
types it edits stay in runtime assemblies — see
[project-structure.md](./project-structure.md). A tool meant to be reused ships
as a UPM package with that split already in place.
