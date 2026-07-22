# MCP authoring (Unity_RunCommand)

How to create, copy, build, and test Magica Cloth setups entirely from C# run through
the Unity MCP. All snippets are validated on v2.8.0. Every script template uses the
mandatory shape:

```csharp
using UnityEngine; using UnityEditor; using MagicaCloth2;
internal class CommandScript : IRunCommand {        // MUST be named CommandScript, internal
  public void Execute(ExecutionResult result) { /* ... */ }
}
```

Rules: register changes (`result.RegisterObjectCreation/Modification`), keep **output tiny**
(big logs / serialized SkinnedMeshRenderer dumps crash Unity — see pitfalls.md), and prefer
field reads over runtime calls on uninitialized prefab content (e.g. `GetSize()` throws NRE
on `LoadPrefabContents` objects).

## When to use which build context

| Goal | Context | How |
| --- | --- | --- |
| Persist setup into a **prefab** | edit mode | `PrefabUtility.LoadPrefabContents` → add/configure → `SaveAsPrefabAsset` → `UnloadPrefabContents` |
| Persist setup into a **scene** instance | edit mode | add/configure on the scene GameObject → `EditorSceneManager.SaveScene` |
| Actually simulate | **Play mode** | `Start()` auto-builds, or call `cloth.BuildAndRun()` (Play only) |

`BuildAndRun()` and most runtime APIs early-return/throw outside Play mode. Edit-mode
authoring only writes serialized data; the proxy mesh + constraints are (re)built at play.

## 1. Lightweight inspection (never crash Unity)

List component **type names** only. Do NOT call `Unity_ManageGameObject get_components`
on a SkinnedMeshRenderer (serializes bone/mesh arrays → crash).

```csharp
var go = GameObject.Find("Lyra_TestSimu");
var sb = new System.Text.StringBuilder();
foreach (var c in go.GetComponentsInChildren<Component>(true))
  if (c is MagicaCloth || c is MagicaCloth2.ColliderComponent)
    sb.AppendLine($"{c.GetType().Name} @ {c.name}");
result.Log(sb.ToString());
```

## 2. Author cloth in edit mode (BoneCloth, persists in scene)

```csharp
var go = new GameObject("Magica_Hair");
go.transform.SetParent(GameObject.Find("Character").transform, false);
var cloth = go.AddComponent<MagicaCloth>();
var sd = cloth.SerializeData;
sd.clothType = ClothProcess.ClothType.BoneCloth;
sd.rootBones.Add(GameObject.Find("hair_root_L").transform);
sd.rootBones.Add(GameObject.Find("hair_root_R").transform);
sd.gravity = 3f;
sd.damping.SetValue(0.05f);
sd.angleRestorationConstraint.stiffness.SetValue(0.15f, 1.0f, 0.15f, true);
result.RegisterObjectCreation(go);
UnityEditor.SceneManagement.EditorSceneManager.MarkSceneDirty(go.scene);
// Enter Play afterward: Start() auto-builds. No selection data needed for BoneCloth.
```

## 3. Colliders (add on body bones, register on the cloth)

`MagicaCapsuleCollider.SetSize(startRadius, endRadius, length)` + `direction` (X/Y/Z).
`MagicaSphereCollider.SetSize(radius)`. **Global scale must be uniform** on the bone chain
or collisions silently fail.

```csharp
var bone = GameObject.Find("thigh01.L").transform;
var col = new GameObject("Magica_Leg_L"){}.AddComponent<MagicaCapsuleCollider>();
col.transform.SetParent(bone, false);
col.transform.localPosition = new Vector3(0f, 0.07f, 0f);
col.direction = MagicaCapsuleCollider.Direction.Y;
col.SetSize(0.08f, 0.06f, 0.30f);
sd.colliderCollisionConstraint.mode = ColliderCollisionConstraint.Mode.Point; // Point default; Edge only if slipping
sd.colliderCollisionConstraint.colliderList.Add(col);
result.RegisterObjectCreation(col.gameObject);
```

## 4. Copy an existing setup onto another character (same/identical mesh)

The most reliable way to replicate a working cloth (e.g. from a player prefab onto a test
duplicate). `JsonUtility` carries **both** `serializeData` (params) **and** `serializeData2`
(the painted selection) — but Unity.Object references point at the source, so **re-target**
renderers and colliders afterward. Selection data only transfers cleanly when topology is
identical (a true mesh duplicate).

```csharp
// dst = scene character; src = LoadPrefabContents("Assets/.../P_Player.prefab")
Transform FindDeep(Transform r, string n){ if(r.name==n)return r;
  foreach(Transform c in r){var x=FindDeep(c,n); if(x)return x;} return null; }

// 4a. colliders: recreate under matching bones, copy fields via Json
foreach (var sc in src.GetComponentsInChildren<MagicaCloth2.ColliderComponent>(true)) {
  var parent = FindDeep(dst.transform, sc.transform.parent.name);
  var g = new GameObject(sc.name); g.transform.SetParent(parent, false);
  g.transform.localPosition = sc.transform.localPosition;
  g.transform.localRotation = sc.transform.localRotation;
  var nc = (MagicaCloth2.ColliderComponent)g.AddComponent(sc.GetType());
  JsonUtility.FromJsonOverwrite(JsonUtility.ToJson(sc), nc);
  result.RegisterObjectCreation(g);
}
// 4b. cloth: copy data, then RE-TARGET renderer + colliders by name
var body = FindDeep(dst.transform, "Lyra").GetComponent<Renderer>();
var colMap = new System.Collections.Generic.Dictionary<string, MagicaCloth2.ColliderComponent>();
foreach (var c in dst.GetComponentsInChildren<MagicaCloth2.ColliderComponent>(true)) colMap[c.name]=c;
foreach (var sCloth in src.GetComponentsInChildren<MagicaCloth>(true)) {
  var names = new System.Collections.Generic.List<string>();
  foreach (var x in sCloth.SerializeData.colliderCollisionConstraint.colliderList)
    if (x) names.Add(x.name);
  var g = new GameObject(sCloth.name); g.transform.SetParent(dst.transform, false);
  var nCloth = g.AddComponent<MagicaCloth>();
  JsonUtility.FromJsonOverwrite(JsonUtility.ToJson(sCloth), nCloth);
  nCloth.SerializeData.sourceRenderers = new System.Collections.Generic.List<Renderer>{ body };
  var lst = new System.Collections.Generic.List<MagicaCloth2.ColliderComponent>();
  foreach (var n in names) if (colMap.ContainsKey(n)) lst.Add(colMap[n]);
  nCloth.SerializeData.colliderCollisionConstraint.colliderList = lst;
  result.RegisterObjectCreation(g);
}
PrefabUtility.UnloadPrefabContents(src);
```

After copy, verify selection carried: `cloth.GetSerializeData2().selectionData.IsValid()`.

## 5. MeshCloth selection data (when NOT copying)

MeshCloth needs vertex attributes. Three ways (no manual painting):
- **Copy** from an identical mesh's setup (section 4) — easiest.
- **Paint map**: assign `serializeData.paintMode` + `paintMaps` (Texture2D per renderer; RGB
  encodes Move/Fixed/Invalid).
- **Attribute array** (runtime build): fill `serializeData2.vertexAttributeList` — one list
  per registered renderer, one `VertexAttribute` per mesh vertex (`Move`/`Fixed`/`Invalid`),
  then set `selectionData.userEdit = true`.

BoneCloth needs none of this. For per-bone control on BoneCloth, set
`serializeData2.boneAttributeDict[transform] = VertexAttribute.Fixed/Move` before build.

## 6. Test in Play mode + capture

```text
1. EditorSceneManager.SaveScene(...)                      // persist first (Play reverts edits)
2. Unity_ManageEditor  Action:"Play"  WaitForCompletion:true
3. (sleep ~3s for async build)  Unity_RunCommand: foreach cloth log cloth.IsValid()  // expect True
4. Unity_RunCommand: EditorApplication.ExecuteMenuItem("Window/General/Scene");
                     SceneView.lastActiveSceneView.Focus();      // Scene View must be active in Play
5. Unity_SceneView_CaptureMultiAngleSceneView  focusObjectIds:[<id>]
6. Unity_ManageEditor  Action:"Stop"
7. Unity_ReadConsole   Types:["Error","Warning","Log"]
```

**Capture notes (validated):** `Unity_Camera_Capture` by camera ID fails under URP here
("Failed to render scene preview"); use `Unity_SceneView_CaptureMultiAngleSceneView`. It needs
an **active Scene View** — in Play mode force focus via the menu item above first. Get the
focus object's `instanceID` from a `Unity_RunCommand` (`go.GetInstanceID()`); IDs can change
across domain reload.

**Proving motion without an animation:** a character in bind pose barely moves under normal
gravity (cloth already hangs there). Temporarily tilt gravity to reveal the sim, then restore:

```csharp
foreach (var c in go.GetComponentsInChildren<MagicaCloth>(true)) {
  c.SerializeData.gravity = 10f;
  c.SerializeData.gravityDirection = new Unity.Mathematics.float3(1,0,0); // sideways
  c.SetParameterChange();                                                  // required after runtime change
}
```

The skirt/hair streams to the side and settles → unambiguous proof. Capture, then set
`gravityDirection` back to `(0,-1,0)` and the original gravity. (Play-mode changes don't persist.)
