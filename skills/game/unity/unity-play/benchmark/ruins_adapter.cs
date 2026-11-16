// Skill adapter for RuinsGame, passed with `turn.py install --adapter`. It finds objects by
// name, as an adapter for an existing game would, and reads the player's health by reflection.
var ruinsObjects = new System.Collections.Generic.Dictionary<string, string>
{
    ["key"] = "Key", ["gate"] = "Gate", ["chest"] = "Chest",
    ["skeletonA"] = "skeletonA", ["skeletonB"] = "skeletonB",
};
var ruinsPlayer = UnityEngine.GameObject.Find("Player").transform;
var ruinsHp = typeof(PlayFixture.RuinsGame).GetField("hp", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);

playerPosition = () => ruinsPlayer.position;
playerYaw = () => ruinsPlayer.eulerAngles.y;
locate = id =>
{
    if (!ruinsObjects.TryGetValue(id, out var name)) return null;
    var found = UnityEngine.GameObject.Find(name);
    return found != null ? found.transform.position : (UnityEngine.Vector3?)null;
};
health = () => (int)ruinsHp.GetValue(PlayFixture.RuinsGame.Instance);
hostiles = () => new[] { "skeletonA", "skeletonB" };
// The yard (z > 2.5) opens only through the gate at x=0: cross it through two waypoints.
pathTo = (from, to) =>
{
    var path = new System.Collections.Generic.List<UnityEngine.Vector3>();
    if ((from.z > 2.5f) != (to.z > 2.5f))
    {
        var near = from.z > 2.5f ? 3.7f : 0.3f;
        path.Add(new UnityEngine.Vector3(0f, 0f, near));
        path.Add(new UnityEngine.Vector3(0f, 0f, 4f - near));
    }
    path.Add(to);
    return path;
};
lookDegreesPerUnit = 0.2f;
attackRange = 2f;
attackEverySeconds = 0.65f;
interactRange = 1.8f;
