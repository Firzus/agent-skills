# Rules: UI

Adapted from CyberAgent's unity-perf-review (MIT); see [NOTICE](../NOTICE.md).

### UI08 IMGUI for player-facing UI
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: runtime
- Check: `void\s+OnGUI\s*\(`
- Reason: IMGUI keeps no UI tree: `OnGUI` runs several times per frame, rebuilds the UI on each event, and allocates on the heap each time. Unity does not intend it for in-game UI.
- Fix: Build player-facing UI in UI Toolkit. Keep `OnGUI` to debug overlays compiled out of release builds.
- Source: [Unity Performance Tuning Tips 2026: choosing between UI systems](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-2.html)

### UI09 IMGUI Editor window
- Level: Info
- Scope: any
- When: -
- Files: *.cs
- Code: editor
- Check: `void\s+OnGUI\s*\(\s*\)`
- Reason: An `EditorWindow` drawn in `OnGUI` allocates on every repaint, which loads the GC in windows that repaint continuously.
- Fix: Build the window in `CreateGUI` with UI Toolkit. Keep IMGUI for controls that must look like Unity's own and have no UI Toolkit equivalent, hosted in an `IMGUIContainer`.
- Source: [Unity Performance Tuning Tips 2026: choosing between UI systems](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-2.html)

### UI10 UGUI and UI Toolkit overlaid on one screen
- Level: Critical
- Scope: any
- When: -
- Files: *.unity, *.prefab
- Code: any
- Check: MANUAL
- Reason: Each system orders only its own content, and no property orders one against the other; UI composited through a render texture receives no input. A screen that relies on their overlap loses control of draw order and input.
- Fix: Keep each screen in one system, UI Toolkit for new screens, and order overlapping UI Toolkit elements with `z-index`. See [unity-ui](../../unity-ui/SKILL.md#stacking-order).
- Source: [Unity Performance Tuning Tips 2026: choosing between UI systems](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-2.html)

### UI11 PropertyDrawer with only CreatePropertyGUI
- Level: Warning
- Scope: any
- When: -
- Files: *.cs
- Code: editor
- Check: `override\s+VisualElement\s+CreatePropertyGUI`
- Reason: IMGUI cannot host a UI Toolkit tree, so an IMGUI inspector or drawer that reaches this drawer shows "No GUI Implemented". It matters only while IMGUI inspectors remain in the project.
- Fix: Also override `OnGUI` in the drawer, or convert the remaining IMGUI inspectors to UI Toolkit.
- Source: [Unity Performance Tuning Tips 2026: choosing between UI systems](https://cyberagentgameentertainment.github.io/UnityPerformanceTuningTips2026/en/zaitsu-hiromu-2.html)

### UI12 UGUI or TextMeshPro added
- Level: Warning
- Scope: any
- When: -
- Files: *.cs, *.unity, *.prefab
- Code: any
- Check: `\bUnityEngine\.UI\b|\bTMPro\b|\bCanvas\b|^Canvas:`
- Reason: The default stack builds new UI in UI Toolkit with the Advanced Text Generator. New UGUI or TextMeshPro brings Canvas rebuild costs and a second UI system to keep apart from the first. Existing UGUI screens being maintained are expected hits.
- Fix: Build the new UI in UI Toolkit, with its own text. See [unity-ui](../../unity-ui/SKILL.md#text).
- Source: [unity-ui](../../unity-ui/SKILL.md)

### UI13 Inline style written per frame
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.style\.\w+\s*=(?!=)`
- Reason: A direct `style` write marks the element for layout and repaint each time it runs.
- Fix: Toggle USS classes and let transitions animate, or bind the value. See [unity-ui](../../unity-ui/SKILL.md#performance).
- Source: [unity-ui](../../unity-ui/SKILL.md#performance)

### UI14 Text rebuilt as a new string per frame
- Level: Warning
- Scope: frame
- When: -
- Files: *.cs
- Code: runtime
- Check: `\.text\s*=(?!=)\s*[^;]*(\$"|\+|ToString\(|string\.(Format|Concat|Join))`
- Reason: Formatting or concatenating a string for `.text` allocates on every update, which adds GC pressure on a per-frame path.
- Fix: Use the non-allocating `TextElement.SetText` overloads with a `StringBuilder`, a `ReadOnlySpan<char>`, or a number and format, or bind the value. See [unity-ui](../../unity-ui/SKILL.md#performance).
- Source: [unity-ui](../../unity-ui/SKILL.md#performance)

### UI15 ScrollView filled with data-driven content
- Level: Warning
- Scope: any
- When: -
- Files: *.cs, *.uxml
- Code: runtime
- Check: `\bnew\s+ScrollView\s*\(|<(\w+:)?ScrollView\b`
- Reason: A `ScrollView` builds and lays out every child, including those off screen, so its cost grows with the data. Layout in UI Toolkit scales with element count.
- Fix: When the item count follows the data, use a `ListView`, which creates only the visible rows and recycles them. See [unity-ui](../../unity-ui/SKILL.md#performance).
- Source: [unity-ui](../../unity-ui/SKILL.md#performance)

### UI16 :hover selector on repeated elements
- Level: Info
- Scope: any
- When: -
- Files: *.uss
- Code: any
- Check: `:hover\b`
- Reason: Hover selectors re-evaluate as the pointer moves, which costs most over long lists of matching elements.
- Fix: Keep hover styles off list items where possible and check the selector cost in the USS Stats Profiler. See [unity-ui](../../unity-ui/SKILL.md#performance).
- Source: [unity-ui](../../unity-ui/SKILL.md#performance)
