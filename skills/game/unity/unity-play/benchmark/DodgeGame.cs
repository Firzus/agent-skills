using System.Collections.Generic;
using System.Globalization;
using System.Text;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PlayFixture
{
    // Benchmark fixture: reach the goal across a wall with one gap while two hazards patrol.
    // Built from code so the scene needs no authoring; movement reads a real Input System action.
    public sealed class DodgeGame : MonoBehaviour
    {
        public static DodgeGame Instance { get; private set; }

        const float Speed = 4f;
        const float PlayerRadius = 0.5f;
        const float HazardRadius = 0.6f;
        static readonly Vector3 Start = new Vector3(0f, 0.5f, 0f);
        static readonly Vector3 GoalPos = new Vector3(-4f, 0.5f, 12f);
        const float WallZ = 6f, GapMinX = 2f, GapMaxX = 4f, ArenaHalfWidth = 6f;

        Transform player, goal;
        readonly List<Transform> hazards = new List<Transform>();
        readonly List<(float z, float amplitude, float period, float phase)> hazardPaths = new()
        {
            (3f, 5f, 4f, 0f),
            (9f, 5f, 3f, 1.5f),
        };
        InputAction move;
        float gameTime;
        public int Deaths { get; private set; }
        public int InputFrames { get; private set; }
        public bool Won { get; private set; }

        // Runs only in a scene named DodgeBench, so several fixtures can share one project.
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (Instance == null && UnityEngine.SceneManagement.SceneManager.GetActiveScene().name == "DodgeBench")
                new GameObject("DodgeGame").AddComponent<DodgeGame>();
        }

        void Awake()
        {
            Instance = this;
            Time.captureDeltaTime = 1f / 50f;
            move = new InputAction("Move", InputActionType.Value);
            move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/w").With("Down", "<Keyboard>/s")
                .With("Left", "<Keyboard>/a").With("Right", "<Keyboard>/d");
            move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/upArrow").With("Down", "<Keyboard>/downArrow")
                .With("Left", "<Keyboard>/leftArrow").With("Right", "<Keyboard>/rightArrow");
            move.Enable();

            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.transform.position = new Vector3(0f, 0f, 6f);
            ground.transform.localScale = new Vector3(1.4f, 1f, 1.6f);
            Wall(-ArenaHalfWidth, GapMinX);
            Wall(GapMaxX, ArenaHalfWidth);
            player = Make(PrimitiveType.Cube, "Player", Start, Color.cyan);
            Destroy(player.GetComponent<Collider>());
            goal = Make(PrimitiveType.Cylinder, "Goal", GoalPos, Color.green);
            foreach (var p in hazardPaths)
            {
                var h = Make(PrimitiveType.Sphere, "Hazard", new Vector3(0f, 0.5f, p.z), Color.red);
                h.localScale = Vector3.one * HazardRadius * 2f;
                hazards.Add(h);
            }
            var cam = Camera.main;
            if (cam != null)
            {
                cam.transform.position = new Vector3(0f, 18f, 6f);
                cam.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            }
        }

        // Puts every run of the benchmark in the same starting state.
        public void Restart()
        {
            gameTime = 0f;
            Deaths = 0;
            InputFrames = 0;
            Won = false;
            player.position = Start;
            Update();
        }

        void OnDestroy()
        {
            move?.Dispose();
            if (Instance == this) Instance = null;
        }

        void Update()
        {
            if (Won) return;
            gameTime += Time.deltaTime;
            for (int i = 0; i < hazards.Count; i++)
            {
                var p = hazardPaths[i];
                var x = p.amplitude * Mathf.Sin((gameTime + p.phase) * 2f * Mathf.PI / p.period);
                hazards[i].position = new Vector3(x, 0.5f, p.z);
            }

            var input = move.ReadValue<Vector2>();
            if (input != Vector2.zero) InputFrames++;
            var next = player.position + new Vector3(input.x, 0f, input.y) * Speed * Time.deltaTime;
            next.x = Mathf.Clamp(next.x, -ArenaHalfWidth + PlayerRadius, ArenaHalfWidth - PlayerRadius);
            next.z = Mathf.Clamp(next.z, -1f, 13f);
            if (CrossesWall(player.position.z, next.z, next.x)) next.z = player.position.z;
            player.position = next;

            foreach (var h in hazards)
            {
                if (Vector3.Distance(h.position, player.position) < HazardRadius + PlayerRadius)
                {
                    Deaths++;
                    player.position = Start;
                    return;
                }
            }
            if (Vector3.Distance(player.position, goal.position) < 1f) Won = true;
        }

        static bool CrossesWall(float fromZ, float toZ, float x)
        {
            var near = Mathf.Abs(toZ - WallZ) < PlayerRadius + 0.25f;
            var inGap = x - PlayerRadius >= GapMinX && x + PlayerRadius <= GapMaxX;
            return near && !inGap && Mathf.Abs(toZ - WallZ) < Mathf.Abs(fromZ - WallZ);
        }

        // Compact JSON an agent reads instead of a screenshot.
        public string Observe()
        {
            var c = CultureInfo.InvariantCulture;
            var sb = new StringBuilder();
            sb.Append("{\"status\":\"").Append(Won ? "won" : "playing").Append('"');
            sb.Append(",\"time\":").Append(gameTime.ToString("0.00", c));
            sb.Append(",\"frame\":").Append(Time.frameCount);
            sb.Append(",\"deaths\":").Append(Deaths);
            sb.Append(",\"inputFrames\":").Append(InputFrames);
            sb.Append(",\"player\":").Append(V(player.position));
            sb.Append(",\"goal\":").Append(V(goal.position));
            sb.Append(",\"wall\":{\"z\":").Append(WallZ.ToString(c)).Append(",\"gapX\":[")
              .Append(GapMinX.ToString(c)).Append(',').Append(GapMaxX.ToString(c)).Append("]}");
            sb.Append(",\"hazards\":[");
            for (int i = 0; i < hazards.Count; i++)
            {
                var p = hazardPaths[i];
                if (i > 0) sb.Append(',');
                var vx = p.amplitude * 2f * Mathf.PI / p.period * Mathf.Cos((gameTime + p.phase) * 2f * Mathf.PI / p.period);
                sb.Append("{\"pos\":").Append(V(hazards[i].position)).Append(",\"vx\":").Append(vx.ToString("0.0", c))
                  .Append(",\"xRange\":[").Append((-p.amplitude).ToString(c)).Append(',').Append(p.amplitude.ToString(c)).Append("]}");
            }
            sb.Append("],\"rules\":\"WASD moves at 4 u/s on X/Z (W=+z, D=+x); touching a hazard (radius 0.6, player 0.5) resets you to start; pass the wall only through gapX; reach goal within 1 u\"}");
            return sb.ToString();
        }

        static string V(Vector3 v) =>
            string.Format(CultureInfo.InvariantCulture, "[{0:0.00},{1:0.00}]", v.x, v.z);

        void Wall(float minX, float maxX)
        {
            var w = Make(PrimitiveType.Cube, "Wall", new Vector3((minX + maxX) / 2f, 0.5f, WallZ), Color.gray);
            w.localScale = new Vector3(maxX - minX, 1f, 0.5f);
        }

        static Transform Make(PrimitiveType type, string name, Vector3 pos, Color color)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.position = pos;
            var r = go.GetComponent<Renderer>();
            r.material.color = color;
            return go.transform;
        }
    }
}
