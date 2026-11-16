// Roslyn script sent by `turn.py install` as an eval body: installs the turn driver for the
// current Play Mode session. turn.py fills in the observation, frame rate, record folder, and adapter
// placeholders before sending it.
// The driver lives in the AppDomain until `finish`, the end of Play Mode, or a domain reload.
var domain = System.AppDomain.CurrentDomain;
// A project can skip the domain reload when entering Play Mode, so an earlier driver may still
// be installed: finish it first so its settings are restored before new ones are swapped in.
(domain.GetData("unity-play.finish") as System.Func<string>)?.Invoke();
// Controls held down between frames, shared by controls turns and skills so that either one
// releases what the other left pressed.
var held = new System.Collections.Generic.HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
System.Func<string, string> jsonString = text =>
{
    var json = new System.Text.StringBuilder("\"");
    foreach (var c in text)
        if (c == '"' || c == '\\') json.Append('\\').Append(c);
        else if (c < ' ') json.Append("\\u").Append(((int)c).ToString("x4"));
        else json.Append(c);
    return json.Append('"').ToString();
};
// A JSON object or array from the game passes through; any other value becomes a JSON string.
System.Func<string> observe = () =>
{
    object value = (OBSERVE_EXPRESSION);
    var text = value?.ToString() ?? "null";
    var trimmed = text.TrimStart();
    if (value is string && (trimmed.StartsWith("{") || trimmed.StartsWith("["))) return text;
    return jsonString(text);
};
// The first install of a session keeps the game's own frame time for `finish` to restore.
if (domain.GetData("unity-play.frameTime") == null) domain.SetData("unity-play.frameTime", UnityEngine.Time.captureDeltaTime);
var fps = FRAMES_PER_SECOND;
if (fps > 0) UnityEngine.Time.captureDeltaTime = 1f / fps;

// With a record folder, every played frame of the main camera is saved as <frame>.jpg for
// video.py. Rendering into a texture works while the Editor is in the background, and the
// pauses between turns produce no frames, so the video runs in game time.
var recordFolder = RECORD_FOLDER;
UnityEngine.RenderTexture recordTarget = null;
UnityEngine.Texture2D recordPixels = null;
var lastRecorded = -1;
System.Action captureFrame = () =>
{
    var camera = UnityEngine.Camera.main;
    if (string.IsNullOrEmpty(recordFolder) || camera == null || UnityEngine.Time.frameCount == lastRecorded) return;
    lastRecorded = UnityEngine.Time.frameCount;
    if (recordTarget == null)
    {
        System.IO.Directory.CreateDirectory(recordFolder);
        recordTarget = new UnityEngine.RenderTexture(960, 540, 24);
        recordPixels = new UnityEngine.Texture2D(960, 540, UnityEngine.TextureFormat.RGB24, false);
    }
    var request = new UnityEngine.Rendering.RenderPipeline.StandardRequest { destination = recordTarget };
    UnityEngine.Rendering.RenderPipeline.SubmitRenderRequest(camera, request);
    var previous = UnityEngine.RenderTexture.active;
    UnityEngine.RenderTexture.active = recordTarget;
    recordPixels.ReadPixels(new UnityEngine.Rect(0, 0, 960, 540), 0, 0);
    UnityEngine.RenderTexture.active = previous;
    System.IO.File.WriteAllBytes(System.IO.Path.Combine(recordFolder, UnityEngine.Time.frameCount.ToString("D7") + ".jpg"),
        UnityEngine.ImageConversion.EncodeToJPG(recordPixels, 85));
};

// By default the keyboard reaches the game only while the Game view has focus, and the Input
// System disables devices when the Editor loses OS focus. The session swaps in an in-memory copy
// of the settings that lifts both: a copy has no asset path, so nothing is saved to the project.
// Replacing temporary (HideAndDontSave) settings destroys them, so `finish` restores the asset
// by path, or a copy taken before the swap.
if (domain.GetData("unity-play.settings") == null)
{
    var original = UnityEngine.InputSystem.InputSystem.settings;
    var path = UnityEditor.AssetDatabase.GetAssetPath(original);
    object restore = path;
    if (string.IsNullOrEmpty(path))
    {
        var backup = UnityEngine.Object.Instantiate(original);
        backup.hideFlags = UnityEngine.HideFlags.HideAndDontSave;
        restore = backup;
    }
    var session = UnityEngine.Object.Instantiate(original);
    session.hideFlags = UnityEngine.HideFlags.HideAndDontSave;
    session.editorInputBehaviorInPlayMode = UnityEngine.InputSystem.InputSettings.EditorInputBehaviorInPlayMode.AllDeviceInputAlwaysGoesToGameView;
    session.backgroundBehavior = UnityEngine.InputSystem.InputSettings.BackgroundBehavior.IgnoreFocus;
    UnityEngine.InputSystem.InputSystem.settings = session;
    domain.SetData("unity-play.settings", restore);
}

System.Func<string, UnityEngine.InputSystem.Controls.ButtonControl> resolve = name =>
{
    UnityEngine.InputSystem.Controls.ButtonControl button;
    if (name.StartsWith("mouse.", System.StringComparison.OrdinalIgnoreCase))
        button = UnityEngine.InputSystem.Mouse.current?.TryGetChildControl<UnityEngine.InputSystem.Controls.ButtonControl>(name.Substring(6) + "Button");
    // Enum parsing also accepts numbers ("1" is a value, not Digit1) and comma lists: refuse both.
    else if (name.Length > 0 && char.IsLetter(name[0]) && !name.Contains(",")
             && System.Enum.TryParse<UnityEngine.InputSystem.Key>(name, true, out var key) && key != UnityEngine.InputSystem.Key.None)
        button = UnityEngine.InputSystem.Keyboard.current?[key];
    else
        button = null;
    if (button == null)
        throw new System.ArgumentException("unknown control '" + name + "': use Input System key names or mouse.left/mouse.right, joined with + (W+D)");
    return button;
};

// Sends one state event per device: events queued in the same update are each captured
// from the device's last processed state, so a second event per device would undo the first.
// A device disabled "while in background" before the session started drops its events while
// `enabled` still reads true; enabling it again undoes that.
System.Action<UnityEngine.InputSystem.InputDevice, System.Action<UnityEngine.InputSystem.LowLevel.InputEventPtr>> send = (device, write) =>
{
    UnityEngine.InputSystem.InputSystem.EnableDevice(device);
    using (UnityEngine.InputSystem.LowLevel.StateEvent.From(device, out var ev))
    {
        write(ev);
        UnityEngine.InputSystem.InputSystem.QueueEvent(ev);
    }
};

// Holds the listed controls for `frames` frames, pauses, then returns the observation.
// Every turn is a new press: a control already held by the previous turn is released for the
// first frame and pressed again on the second, so attack, jump, or interact trigger each turn.
// Pressing every control again also covers the Editor resetting device state while paused.
System.Func<string, int, System.Threading.Tasks.Task<string>> turn = async (controls, frames) =>
{
    var wanted = new System.Collections.Generic.HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
    UnityEngine.Vector2? pointer = null, look = null;
    foreach (var token in (controls ?? "").Split(new[] { ' ', '+', ';' }, System.StringSplitOptions.RemoveEmptyEntries))
    {
        if (token.StartsWith("@") || token.StartsWith("~"))
        {
            var xy = token.Substring(1).Split(',');
            var value = new UnityEngine.Vector2(
                float.Parse(xy[0], System.Globalization.CultureInfo.InvariantCulture),
                float.Parse(xy[1], System.Globalization.CultureInfo.InvariantCulture));
            if (token[0] == '@') pointer = value; else look = value;
        }
        else wanted.Add(token);
    }
    var changes = new System.Collections.Generic.Dictionary<UnityEngine.InputSystem.InputDevice, System.Collections.Generic.List<(UnityEngine.InputSystem.Controls.ButtonControl, float)>>();
    foreach (var name in held) if (!wanted.Contains(name)) { var b = resolve(name); if (!changes.ContainsKey(b.device)) changes[b.device] = new(); changes[b.device].Add((b, 0f)); }
    var repress = new System.Collections.Generic.List<UnityEngine.InputSystem.Controls.ButtonControl>();
    foreach (var name in wanted)
    {
        var b = resolve(name);
        if (!changes.ContainsKey(b.device)) changes[b.device] = new();
        if (held.Contains(name)) { repress.Add(b); changes[b.device].Add((b, 0f)); }
        else changes[b.device].Add((b, 1f));
    }
    if (repress.Count > 0 && frames < 2) frames = 2;
    var mouse = UnityEngine.InputSystem.Mouse.current;
    if ((pointer.HasValue || (look.HasValue && frames > 0)) && mouse != null && !changes.ContainsKey(mouse)) changes[mouse] = new();
    foreach (var entry in changes)
        send(entry.Key, ev =>
        {
            foreach (var (button, value) in entry.Value)
                UnityEngine.InputSystem.InputControlExtensions.WriteValueIntoEvent<float>(button, value, ev);
            if (pointer.HasValue && entry.Key == mouse)
                UnityEngine.InputSystem.InputControlExtensions.WriteValueIntoEvent<UnityEngine.Vector2>(mouse.position, pointer.Value, ev);
            if (look.HasValue && frames > 0 && entry.Key == mouse)
                UnityEngine.InputSystem.InputControlExtensions.WriteValueIntoEvent<UnityEngine.Vector2>(mouse.delta, look.Value, ev);
        });
    held.Clear();
    held.UnionWith(wanted);

    // Per-frame input after the first event: the second press of re-pressed controls, and the
    // mouse delta, which resets every input update. One event per device, as above.
    System.Action<bool> queueFrame = firstFrame =>
    {
        var perDevice = new System.Collections.Generic.Dictionary<UnityEngine.InputSystem.InputDevice, System.Collections.Generic.List<UnityEngine.InputSystem.Controls.ButtonControl>>();
        if (firstFrame)
            foreach (var b in repress) { if (!perDevice.ContainsKey(b.device)) perDevice[b.device] = new(); perDevice[b.device].Add(b); }
        if (look.HasValue && mouse != null && !perDevice.ContainsKey(mouse)) perDevice[mouse] = new();
        foreach (var entry in perDevice)
            send(entry.Key, ev =>
            {
                foreach (var b in entry.Value) UnityEngine.InputSystem.InputControlExtensions.WriteValueIntoEvent<float>(b, 1f, ev);
                if (look.HasValue && entry.Key == mouse)
                    UnityEngine.InputSystem.InputControlExtensions.WriteValueIntoEvent<UnityEngine.Vector2>(mouse.delta, look.Value, ev);
            });
    };
    var start = UnityEngine.Time.frameCount;
    var target = start + System.Math.Max(0, frames);
    var watch = System.Diagnostics.Stopwatch.StartNew();
    var lastFrame = start;
    var pressedAgain = false;
    UnityEditor.EditorApplication.isPaused = false;
    try
    {
        while (UnityEngine.Time.frameCount < target && watch.ElapsedMilliseconds < 20000)
        {
            await System.Threading.Tasks.Task.Yield();
            if (UnityEngine.Time.frameCount == lastFrame) continue;
            lastFrame = UnityEngine.Time.frameCount;
            watch.Restart();
            captureFrame();
            if (lastFrame < target) { queueFrame(!pressedAgain); pressedAgain = true; }
        }
    }
    finally { UnityEditor.EditorApplication.isPaused = true; }
    var stalled = UnityEngine.Time.frameCount < target;
    return "{\"frame\":" + UnityEngine.Time.frameCount + (stalled ? ",\"stalled\":true" : "") + ",\"obs\":" + observe() + "}";
};

// Skills: the model names a goal ("goto key", "attack skeletonA") and the driver steers with
// real keyboard and mouse input frame by frame until an event ends the skill. A game adapter
// (turn.py install --adapter) tells the driver where the player and targets are; the defaults
// below fit a third-person game with WASD, mouse look, and a mouse-button attack.
System.Func<UnityEngine.Vector3> playerPosition = null;
System.Func<float> playerYaw = null;
System.Func<string, UnityEngine.Vector3?> locate = null;
System.Func<UnityEngine.Vector3, UnityEngine.Vector3, System.Collections.Generic.List<UnityEngine.Vector3>> pathTo = null;
System.Func<float> health = null;
System.Func<System.Collections.Generic.IEnumerable<string>> hostiles = null;
float lookDegreesPerUnit = 0.2f, maxTurnPerFrame = 12f, arriveDistance = 1.5f, interactRange = 1.8f;
float attackRange = 2f, attackEverySeconds = 0.65f, lowHealth = 35f, hostileAlert = 0f;
string forwardKey = "W", sprintKey = "LeftShift", jumpKey = "Space", attackControl = "mouse.left", interactKey = "E";
ADAPTER_CODE

// One event per device per frame, as `send` requires: the whole wanted button set plus the
// mouse delta.
System.Action<System.Collections.Generic.HashSet<string>, float> applyFrame = (wanted, lookUnits) =>
{
    var perDevice = new System.Collections.Generic.Dictionary<UnityEngine.InputSystem.InputDevice, System.Collections.Generic.List<(UnityEngine.InputSystem.Controls.ButtonControl, float)>>();
    foreach (var name in held) if (!wanted.Contains(name)) { var b = resolve(name); if (!perDevice.ContainsKey(b.device)) perDevice[b.device] = new(); perDevice[b.device].Add((b, 0f)); }
    foreach (var name in wanted) if (!held.Contains(name)) { var b = resolve(name); if (!perDevice.ContainsKey(b.device)) perDevice[b.device] = new(); perDevice[b.device].Add((b, 1f)); }
    var mouse = UnityEngine.InputSystem.Mouse.current;
    if (lookUnits != 0f && mouse != null && !perDevice.ContainsKey(mouse)) perDevice[mouse] = new();
    foreach (var entry in perDevice)
        send(entry.Key, ev =>
        {
            foreach (var (b, v) in entry.Value) UnityEngine.InputSystem.InputControlExtensions.WriteValueIntoEvent<float>(b, v, ev);
            if (entry.Key == mouse && lookUnits != 0f)
                UnityEngine.InputSystem.InputControlExtensions.WriteValueIntoEvent<UnityEngine.Vector2>(mouse.delta, new UnityEngine.Vector2(lookUnits, 0f), ev);
        });
    held.Clear();
    held.UnionWith(wanted);
};

System.Func<UnityEngine.Vector3, float> bearingTo = point =>
{
    var from = playerPosition();
    var heading = UnityEngine.Mathf.Atan2(point.x - from.x, point.z - from.z) * UnityEngine.Mathf.Rad2Deg;
    return UnityEngine.Mathf.DeltaAngle(playerYaw(), heading);
};
System.Func<UnityEngine.Vector3, float> flatDistance = point =>
{
    var from = playerPosition();
    return new UnityEngine.Vector2(point.x - from.x, point.z - from.z).magnitude;
};
// Half the remaining angle per frame: the event lands one frame later, so a full step overshoots.
System.Func<float, float> lookFor = bearing =>
    UnityEngine.Mathf.Clamp(bearing * 0.5f, -maxTurnPerFrame, maxTurnPerFrame) / lookDegreesPerUnit;

System.Func<string, string, int, System.Threading.Tasks.Task<string>> skill = async (verb, target, maxFrames) =>
{
    if (playerPosition == null || playerYaw == null || locate == null)
        throw new System.InvalidOperationException("skills need an adapter: run turn.py install --adapter <file>");
    verb = verb.ToLowerInvariant();
    if (verb != "wait" && locate(target) == null) return "{\"event\":" + jsonString("unknown or gone target: " + target) + ",\"obs\":" + observe() + "}";
    var start = UnityEngine.Time.frameCount;
    var startHealth = health != null ? health() : 0f;
    var waypoints = new System.Collections.Generic.List<UnityEngine.Vector3>();
    if (verb != "wait")
    {
        var goal = locate(target).Value;
        waypoints = pathTo?.Invoke(playerPosition(), goal);
        if (waypoints == null || waypoints.Count == 0) waypoints = new System.Collections.Generic.List<UnityEngine.Vector3> { goal };
    }
    var stuckCheckFrame = start;
    var stuckCheckPosition = playerPosition();
    var lastAttackFrame = -1000;
    var phase = 0;
    string result = null;
    var lastFrame = start;
    var watch = System.Diagnostics.Stopwatch.StartNew();
    UnityEditor.EditorApplication.isPaused = false;
    try
    {
        while (result == null)
        {
            await System.Threading.Tasks.Task.Yield();
            if (UnityEngine.Time.frameCount == lastFrame) { if (watch.ElapsedMilliseconds > 20000) result = "stalled"; continue; }
            lastFrame = UnityEngine.Time.frameCount;
            watch.Restart();
            captureFrame();
            var elapsed = lastFrame - start;
            if (elapsed >= maxFrames) { result = verb == "wait" ? "waited" : "timeout after " + elapsed + " frames"; break; }
            var wanted = new System.Collections.Generic.HashSet<string>(System.StringComparer.OrdinalIgnoreCase);
            var look = 0f;
            var hp = health != null ? health() : 0f;
            if (verb == "wait") { applyFrame(wanted, 0f); continue; }

            var targetPos = locate(target);
            if (targetPos == null)
            {
                result = verb == "attack" ? "target defeated" : verb == "interact" && phase >= 2 ? "interacted with " + target + ", which is now gone" : "target gone";
                break;
            }
            if (health != null && verb != "attack" && hp < startHealth) { result = "took damage (" + startHealth + " -> " + hp + ")"; break; }
            if (health != null && verb == "attack" && hp < lowHealth) { result = "low health (" + hp + ")"; break; }
            if (hostiles != null && hostileAlert > 0f && verb == "goto")
                foreach (var h in hostiles())
                {
                    var hp2 = h != target ? locate(h) : null;
                    if (hp2 != null && flatDistance(hp2.Value) < hostileAlert) { result = "enemy near: " + h; break; }
                }
            if (result != null) break;

            if (waypoints.Count > 1 && flatDistance(waypoints[0]) < 0.6f) waypoints.RemoveAt(0);
            waypoints[waypoints.Count - 1] = targetPos.Value;
            var aim = waypoints[0];
            var finalDistance = flatDistance(targetPos.Value);
            var stop = verb == "goto" ? arriveDistance : verb == "interact" ? interactRange * 0.8f
                     : verb == "attack" ? attackRange * 0.85f : verb == "jump_onto" ? 1.6f : 0f;
            var bearing = bearingTo(waypoints.Count > 1 && verb != "face" ? aim : targetPos.Value);

            if (verb == "face")
            {
                if (UnityEngine.Mathf.Abs(bearing) < 3f) result = "facing " + target;
                else look = lookFor(bearing);
            }
            else if (phase == 0 && (finalDistance > stop || waypoints.Count > 1))
            {
                look = lookFor(bearing);
                if (UnityEngine.Mathf.Abs(bearing) < 35f) wanted.Add(forwardKey);
                if (lastFrame - stuckCheckFrame >= 25)
                {
                    if (wanted.Contains(forwardKey) && flatDistance(stuckCheckPosition) < 0.15f) { result = "blocked"; break; }
                    stuckCheckFrame = lastFrame;
                    stuckCheckPosition = playerPosition();
                }
            }
            else
            {
                phase = System.Math.Max(phase, 1);
                var facing = bearingTo(targetPos.Value);
                look = UnityEngine.Mathf.Abs(facing) > 3f ? lookFor(facing) : 0f;
                if (verb == "goto") result = "arrived at " + target;
                else if (verb == "attack")
                {
                    if (finalDistance > attackRange) phase = 0;
                    else if (UnityEngine.Mathf.Abs(facing) < 20f && (lastFrame - lastAttackFrame) * UnityEngine.Time.deltaTime >= attackEverySeconds)
                    {
                        wanted.Add(attackControl);
                        lastAttackFrame = lastFrame;
                    }
                }
                else if (verb == "interact")
                {
                    if (UnityEngine.Mathf.Abs(facing) < 15f) { if (phase == 1) { wanted.Add(interactKey); phase = 2; } else result = "interacted with " + target; }
                }
                else if (verb == "jump_onto")
                {
                    if (phase == 1 && UnityEngine.Mathf.Abs(facing) < 10f) phase = 2;
                    if (phase >= 2) { wanted.Add(forwardKey); if (phase == 2) wanted.Add(jumpKey); phase++; if (phase > 26) result = "jumped toward " + target; }
                }
            }
            if (result == null) applyFrame(wanted, look);
        }
    }
    finally
    {
        // Also after an exception, such as an adapter error, so the game never runs on with keys down.
        try { applyFrame(new System.Collections.Generic.HashSet<string>(), 0f); }
        finally { UnityEditor.EditorApplication.isPaused = true; }
    }
    return "{\"event\":" + jsonString(result) + ",\"frames\":" + (UnityEngine.Time.frameCount - start) + ",\"frame\":" + UnityEngine.Time.frameCount + ",\"obs\":" + observe() + "}";
};
domain.SetData("unity-play.skill", skill);

// Releases held controls and restores the project's input settings; the game stays paused.
// Also runs when Play Mode exits, so the settings come back even if `finish` is never called.
System.Func<string> finish = null;
System.Action<UnityEditor.PlayModeStateChange> onPlayModeChanged = state =>
{
    if (state == UnityEditor.PlayModeStateChange.ExitingPlayMode) finish();
};
finish = () =>
{
    UnityEditor.EditorApplication.playModeStateChanged -= onPlayModeChanged;
    var restore = domain.GetData("unity-play.settings");
    domain.SetData("unity-play.settings", null);
    domain.SetData("unity-play.turn", null);
    domain.SetData("unity-play.skill", null);
    domain.SetData("unity-play.finish", null);
    try
    {
        var releases = new System.Collections.Generic.Dictionary<UnityEngine.InputSystem.InputDevice, System.Collections.Generic.List<UnityEngine.InputSystem.Controls.ButtonControl>>();
        foreach (var name in held) { var b = resolve(name); if (!releases.ContainsKey(b.device)) releases[b.device] = new(); releases[b.device].Add(b); }
        foreach (var entry in releases)
            send(entry.Key, ev => { foreach (var b in entry.Value) UnityEngine.InputSystem.InputControlExtensions.WriteValueIntoEvent<float>(b, 0f, ev); });
    }
    finally
    {
        held.Clear();
        if (domain.GetData("unity-play.frameTime") is float frameTime) UnityEngine.Time.captureDeltaTime = frameTime;
        domain.SetData("unity-play.frameTime", null);
        if (recordTarget != null)
        {
            recordTarget.Release();
            UnityEngine.Object.DestroyImmediate(recordTarget);
            UnityEngine.Object.DestroyImmediate(recordPixels);
            recordTarget = null;
        }
        var settings = restore as UnityEngine.InputSystem.InputSettings;
        if (restore is string path)
            settings = UnityEditor.AssetDatabase.LoadAssetAtPath<UnityEngine.InputSystem.InputSettings>(path);
        if (settings != null) UnityEngine.InputSystem.InputSystem.settings = settings;
    }
    return "{\"finished\":true,\"frame\":" + UnityEngine.Time.frameCount + "}";
};
UnityEditor.EditorApplication.playModeStateChanged += onPlayModeChanged;

domain.SetData("unity-play.turn", turn);
domain.SetData("unity-play.finish", finish);
UnityEditor.EditorApplication.isPaused = true;
captureFrame();
return "{\"installed\":true,\"frame\":" + UnityEngine.Time.frameCount + ",\"frameTime\":" + UnityEngine.Time.captureDeltaTime.ToString(System.Globalization.CultureInfo.InvariantCulture) + ",\"obs\":" + observe() + "}";
