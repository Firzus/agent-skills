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
- The attribute is an obligation on the author who renames, not a state every type maintains. A type that never lived at another address has nothing to redirect: absence of `[MovedFrom]` is the normal case, and adding one that names an address the type never had is a false claim in the asset format.
- Reviewing it means checking a condition, not a presence. Ask whether *this change* renames or moves the type, and whether the declared former address really existed — `git log` on the type and its asmdef answers both. A count of how many neighbouring types carry the attribute answers neither; copy-paste spreads it just as fast as intent.
- Audit with `SerializationUtility.HasManagedReferencesWithMissingTypes`.
- Leave a missing reference in place while diagnosing: `ClearManagedReferenceWithMissingType` discards the serialized payload Unity was holding for recovery.
- Fix compile errors before opening affected assets, since a type that fails to compile reads as a missing type.

## Custom graphics

`generateVisualContent` with `MeshGenerationContext.painter2D` draws timeline
strips, keyframe markers, and curves as a first-class UI Toolkit path — paths,
strokes, fills, and Bézier curves, no IMGUI needed.

- Call `MarkDirtyRepaint()` when the data changes; the callback runs only when the element is dirty.
- Read layout and data inside the callback and draw from it. The element is read-only there, so resolve geometry before drawing.

## Icons

Reach for icons in this order, so a redistributable tool carries no binary
assets it does not need:

| Icon | Reach for |
| --- | --- |
| Generic UI — play, warning, settings, folder | Built-in Editor icons |
| Domain state — hitbox open, i-frame, cancel window | `painter2D` |
| Artwork a path cannot express | An imported PNG sprite |

Built-in icons come from `EditorGUIUtility.IconContent("name")` in C#, or a
USS `background-image`. They already follow the Light and Dark skins through
the `d_` prefix convention, so they stay legible in both without a second asset.

`painter2D` draws domain markers — a diamond, a ring, a bar — from
`MoveTo`/`LineTo`/`Arc`/`BezierCurveTo` inside `generateVisualContent`. It
**produces no file**: the paths are tessellated into UI Toolkit's render command
stream and the generated geometry is not exposed, so nothing is stored or
retrievable. That is what makes it resolution-independent and free of DPI
variants, and it puts colour under code control — tint by state and call
`MarkDirtyRepaint()`.

Separate the icon's shape from its colour, so one drawn shape covers many
states through tinting rather than shipping a file per variant.

For an imported PNG: Sprite (2D and UI), Single mode, Alpha Is Transparency on,
Full Rect, mipmaps off, square at 64, 128, or 256. SVG is a core module from
6.3, so vector files are an option without adding a package dependency.

`[Icon("path")]` on a `MonoBehaviour` or `ScriptableObject` sets the script's
icon in the Project window and Inspector, which is what gives authored assets a
recognisable badge in a list.

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
