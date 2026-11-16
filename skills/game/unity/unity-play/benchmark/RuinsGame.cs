using System.Collections.Generic;
using System.Globalization;
using System.Text;
using UnityEngine;
using UnityEngine.InputSystem;

namespace PlayFixture
{
    // Benchmark fixture: a third-person action RPG quest built from code. Fetch the key on top of
    // a crate (jump), open the gate (interact), defeat two skeletons (turn with the mouse, attack),
    // then open the chest. Every control goes through Input System actions, as in a real game.
    public sealed class RuinsGame : MonoBehaviour
    {
        public static RuinsGame Instance { get; private set; }

        const float WalkSpeed = 4f, SprintSpeed = 7f, JumpSpeed = 6.5f, Gravity = -18f;
        const float LookDegreesPerUnit = 0.2f;
        const float AttackRange = 2.2f, AttackHalfAngle = 60f, AttackCooldown = 0.6f;
        const float InteractRange = 2f;
        const float EnemyAggro = 7f, EnemySpeed = 2.5f, EnemyReach = 1.6f, EnemyHitInterval = 1f;
        const int EnemyDamage = 15, EnemyMaxHp = 3, PotionHeal = 40;
        static readonly Vector3 SpawnPoint = new Vector3(0f, 1f, -10f);

        sealed class Enemy
        {
            public string Id;
            public Transform Body, HpBar;
            public Vector3 Home;
            public int Hp;
            public float HitTimer;
        }

        CharacterController controller;
        Transform player, sword, cam, key, gate, chest;
        readonly List<Enemy> enemies = new List<Enemy>();
        InputAction move, look, sprint, jump, attack, interact, heal;
        float yaw, pitch = 15f, verticalSpeed, stamina = 100f, attackTimer, swingTimer, gameTime;
        int hp = 100, potions = 2;
        bool hasKey, gateOpen, chestOpen;
        string lastEvent = "";

        public int Deaths { get; private set; }
        public int Attacks { get; private set; }

        // Runs only in a scene named RuinsBench, so several fixtures can share one project.
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Boot()
        {
            if (Instance == null && UnityEngine.SceneManagement.SceneManager.GetActiveScene().name == "RuinsBench")
                new GameObject("RuinsGame").AddComponent<RuinsGame>();
        }

        void Awake()
        {
            Instance = this;
            Time.captureDeltaTime = 1f / 50f;
            BindInput();
            BuildLevel();
        }

        void OnDestroy()
        {
            foreach (var action in new[] { move, look, sprint, jump, attack, interact, heal }) action?.Dispose();
            if (Instance == this) Instance = null;
        }

        void BindInput()
        {
            move = new InputAction("Move", InputActionType.Value);
            move.AddCompositeBinding("2DVector")
                .With("Up", "<Keyboard>/w").With("Down", "<Keyboard>/s")
                .With("Left", "<Keyboard>/a").With("Right", "<Keyboard>/d");
            look = new InputAction("Look", InputActionType.Value, "<Mouse>/delta");
            sprint = new InputAction("Sprint", InputActionType.Button, "<Keyboard>/leftShift");
            jump = new InputAction("Jump", InputActionType.Button, "<Keyboard>/space");
            attack = new InputAction("Attack", InputActionType.Button, "<Mouse>/leftButton");
            interact = new InputAction("Interact", InputActionType.Button, "<Keyboard>/e");
            heal = new InputAction("Heal", InputActionType.Button, "<Keyboard>/q");
            foreach (var action in new[] { move, look, sprint, jump, attack, interact, heal }) action.Enable();
        }

        void BuildLevel()
        {
            Block("Ground", new Vector3(0f, -0.5f, 0f), new Vector3(32f, 1f, 32f), new Color(0.35f, 0.42f, 0.3f));
            var stone = new Color(0.55f, 0.53f, 0.5f);
            Block("WallN", new Vector3(0f, 1.5f, 16f), new Vector3(32f, 3f, 1f), stone);
            Block("WallS", new Vector3(0f, 1.5f, -16f), new Vector3(32f, 3f, 1f), stone);
            Block("WallE", new Vector3(16f, 1.5f, 0f), new Vector3(1f, 3f, 32f), stone);
            Block("WallW", new Vector3(-16f, 1.5f, 0f), new Vector3(1f, 3f, 32f), stone);
            Block("WallMidL", new Vector3(-9f, 1.5f, 2f), new Vector3(14f, 3f, 1f), stone);
            Block("WallMidR", new Vector3(9f, 1.5f, 2f), new Vector3(14f, 3f, 1f), stone);
            gate = Block("Gate", new Vector3(0f, 1.5f, 2f), new Vector3(4f, 3f, 0.4f), new Color(0.35f, 0.22f, 0.1f));
            Block("Pillar1", new Vector3(-5f, 1.5f, -5f), new Vector3(1.2f, 3f, 1.2f), stone);
            Block("Pillar2", new Vector3(-6f, 1.5f, 9f), new Vector3(1.2f, 3f, 1.2f), stone);
            Block("Crate", new Vector3(8f, 0.5f, -6f), new Vector3(1.6f, 1f, 1.6f), new Color(0.6f, 0.4f, 0.2f));
            key = Prop(PrimitiveType.Cube, "Key", new Vector3(8f, 1.25f, -6f), new Vector3(0.3f, 0.3f, 0.6f), Color.yellow);
            chest = Block("Chest", new Vector3(0f, 0.4f, 13f), new Vector3(1.4f, 0.8f, 0.9f), new Color(0.75f, 0.55f, 0.1f));

            player = new GameObject("Player").transform;
            controller = player.gameObject.AddComponent<CharacterController>();
            controller.height = 1.8f;
            controller.radius = 0.4f;
            controller.center = new Vector3(0f, 0.9f, 0f);
            controller.stepOffset = 0.3f;
            var body = Prop(PrimitiveType.Capsule, "Body", Vector3.zero, new Vector3(0.8f, 0.9f, 0.8f), new Color(0.2f, 0.45f, 0.9f));
            body.SetParent(player, false);
            body.localPosition = new Vector3(0f, 0.9f, 0f);
            var visor = Prop(PrimitiveType.Cube, "Visor", Vector3.zero, new Vector3(0.5f, 0.15f, 0.2f), Color.white);
            visor.SetParent(player, false);
            visor.localPosition = new Vector3(0f, 1.5f, 0.35f);
            sword = Prop(PrimitiveType.Cube, "Sword", Vector3.zero, new Vector3(0.1f, 0.1f, 1.2f), new Color(0.85f, 0.85f, 0.9f));
            sword.SetParent(player, false);
            Teleport(SpawnPoint);

            SpawnEnemy("skeletonA", new Vector3(-4f, 0f, 8f));
            SpawnEnemy("skeletonB", new Vector3(4f, 0f, 10f));

            var main = Camera.main;
            if (main != null) cam = main.transform;
        }

        void SpawnEnemy(string id, Vector3 home)
        {
            var body = Prop(PrimitiveType.Capsule, id, home + Vector3.up, new Vector3(0.8f, 1f, 0.8f), new Color(0.85f, 0.85f, 0.75f));
            var bar = Prop(PrimitiveType.Cube, id + "Hp", Vector3.zero, new Vector3(1f, 0.12f, 0.12f), Color.red);
            bar.SetParent(body, false);
            bar.localPosition = new Vector3(0f, 1.3f, 0f);
            enemies.Add(new Enemy { Id = id, Body = body, HpBar = bar, Home = home, Hp = EnemyMaxHp });
        }

        // Puts every benchmark run in the same starting state.
        public void Restart()
        {
            gameTime = 0f;
            Deaths = Attacks = 0;
            hp = 100;
            potions = 2;
            stamina = 100f;
            hasKey = gateOpen = chestOpen = false;
            yaw = 0f;
            lastEvent = "";
            key.gameObject.SetActive(true);
            gate.gameObject.SetActive(true);
            foreach (var e in enemies) ResetEnemy(e, true);
            Teleport(SpawnPoint);
            LateUpdate();
        }

        void Update()
        {
            if (chestOpen) return;
            gameTime += Time.deltaTime;
            var dt = Time.deltaTime;

            var lookDelta = look.ReadValue<Vector2>();
            yaw = Mathf.Repeat(yaw + lookDelta.x * LookDegreesPerUnit, 360f);
            pitch = Mathf.Clamp(pitch - lookDelta.y * LookDegreesPerUnit, -10f, 60f);
            player.rotation = Quaternion.Euler(0f, yaw, 0f);

            var input = move.ReadValue<Vector2>();
            var sprinting = sprint.IsPressed() && input.sqrMagnitude > 0f && stamina > 0f;
            stamina = Mathf.Clamp(stamina + (sprinting ? -25f : 15f) * dt, 0f, 100f);
            var planar = player.rotation * new Vector3(input.x, 0f, input.y) * (sprinting ? SprintSpeed : WalkSpeed);
            if (controller.isGrounded)
            {
                verticalSpeed = -1f;
                if (jump.WasPressedThisFrame()) verticalSpeed = JumpSpeed;
            }
            verticalSpeed += Gravity * dt;
            controller.Move((planar + Vector3.up * verticalSpeed) * dt);
            if (player.position.y < -5f) Teleport(SpawnPoint);

            attackTimer -= dt;
            swingTimer -= dt;
            if (attack.WasPressedThisFrame() && attackTimer <= 0f) Attack();
            if (interact.WasPressedThisFrame()) Interact();
            if (heal.WasPressedThisFrame()) Heal();
            UpdateEnemies(dt);
        }

        void LateUpdate()
        {
            var swing = swingTimer > 0f ? Mathf.Lerp(-70f, 70f, 1f - swingTimer / 0.25f) : 30f;
            sword.localRotation = Quaternion.Euler(0f, swing, 0f);
            sword.localPosition = Quaternion.Euler(0f, swing, 0f) * new Vector3(0f, 0f, 0.7f) + new Vector3(0.45f, 1.1f, 0f);
            if (cam == null) return;
            var orbit = Quaternion.Euler(pitch, yaw, 0f);
            cam.position = player.position + Vector3.up * 1.6f + orbit * new Vector3(0f, 0f, -6f);
            cam.LookAt(player.position + Vector3.up * 1.4f);
        }

        void Attack()
        {
            Attacks++;
            attackTimer = AttackCooldown;
            swingTimer = 0.25f;
            foreach (var e in enemies)
            {
                if (e.Hp <= 0) continue;
                var to = Flat(e.Body.position - player.position);
                if (to.magnitude > AttackRange || Vector3.Angle(player.forward, to) > AttackHalfAngle) continue;
                e.Hp--;
                e.HpBar.localScale = new Vector3((float)e.Hp / EnemyMaxHp, 0.12f, 0.12f);
                lastEvent = e.Hp > 0 ? "hit " + e.Id : "defeated " + e.Id;
                if (e.Hp <= 0) e.Body.gameObject.SetActive(false);
            }
        }

        void Interact()
        {
            if (key.gameObject.activeSelf && Distance(key.position) < InteractRange && player.position.y > 0.7f)
            {
                hasKey = true;
                key.gameObject.SetActive(false);
                lastEvent = "picked up key";
            }
            else if (key.gameObject.activeSelf && Distance(key.position) < InteractRange)
                lastEvent = "key is out of reach: stand on the crate";
            else if (!gateOpen && Distance(gate.position) < InteractRange + 1f)
            {
                if (hasKey) { gateOpen = true; gate.gameObject.SetActive(false); lastEvent = "opened gate"; }
                else lastEvent = "gate is locked";
            }
            else if (Distance(chest.position) < InteractRange)
            {
                if (enemies.TrueForAll(e => e.Hp <= 0)) { chestOpen = true; lastEvent = "opened chest"; }
                else lastEvent = "chest is sealed while skeletons live";
            }
            else lastEvent = "nothing to interact with";
        }

        void Heal()
        {
            if (potions <= 0) { lastEvent = "no potion left"; return; }
            potions--;
            hp = Mathf.Min(100, hp + PotionHeal);
            lastEvent = "drank potion";
        }

        void UpdateEnemies(float dt)
        {
            foreach (var e in enemies)
            {
                if (e.Hp <= 0) continue;
                var to = Flat(player.position - e.Body.position);
                var reachable = gateOpen || player.position.z > 2.5f;
                if (to.magnitude < EnemyAggro && reachable)
                {
                    if (to.magnitude > EnemyReach)
                    {
                        var next = e.Body.position + to.normalized * EnemySpeed * dt;
                        next.z = Mathf.Max(next.z, gateOpen ? -15f : 3f);
                        e.Body.position = next;
                        e.HitTimer = 0.4f;
                    }
                    else if ((e.HitTimer -= dt) <= 0f)
                    {
                        e.HitTimer = EnemyHitInterval;
                        hp -= EnemyDamage;
                        lastEvent = e.Id + " hit you";
                    }
                    e.Body.rotation = Quaternion.LookRotation(to);
                }
            }
            if (hp <= 0)
            {
                Deaths++;
                hp = 100;
                stamina = 100f;
                lastEvent = "you died and respawned";
                foreach (var e in enemies) ResetEnemy(e, false);
                Teleport(SpawnPoint);
            }
        }

        void ResetEnemy(Enemy e, bool revive)
        {
            if (revive) e.Hp = EnemyMaxHp;
            if (e.Hp <= 0) return;
            e.Hp = EnemyMaxHp;
            e.HitTimer = 0f;
            e.Body.gameObject.SetActive(true);
            e.Body.position = e.Home + Vector3.up;
            e.HpBar.localScale = new Vector3(1f, 0.12f, 0.12f);
        }

        void Teleport(Vector3 position)
        {
            controller.enabled = false;
            player.position = position;
            controller.enabled = true;
            verticalSpeed = 0f;
        }

        // Compact JSON an agent reads instead of a screenshot. Bearings are degrees from the
        // player's facing, positive to the right, so a turn of b degrees is b / 0.2 mouse units.
        public string Observe()
        {
            var c = CultureInfo.InvariantCulture;
            var sb = new StringBuilder();
            var objective = chestOpen ? "done" : !hasKey ? "get the key on top of the crate"
                : !gateOpen ? "open the gate with the key" : enemies.Exists(e => e.Hp > 0) ? "defeat both skeletons" : "open the chest";
            sb.Append("{\"status\":\"").Append(chestOpen ? "won" : "playing").Append('"');
            sb.Append(",\"objective\":\"").Append(objective).Append('"');
            sb.Append(",\"time\":").Append(gameTime.ToString("0.00", c));
            sb.Append(",\"deaths\":").Append(Deaths);
            sb.Append(",\"lastEvent\":\"").Append(lastEvent).Append('"');
            sb.Append(",\"player\":{\"pos\":").Append(V(player.position))
              .Append(",\"yaw\":").Append(yaw.ToString("0", c))
              .Append(",\"hp\":").Append(hp)
              .Append(",\"stamina\":").Append(stamina.ToString("0", c))
              .Append(",\"grounded\":").Append(controller.isGrounded ? "true" : "false")
              .Append(",\"hasKey\":").Append(hasKey ? "true" : "false")
              .Append(",\"potions\":").Append(potions)
              .Append(",\"attackReady\":").Append(attackTimer <= 0f ? "true" : "false").Append('}');
            sb.Append(",\"things\":[");
            var first = true;
            void Thing(string id, Vector3 pos, string extra)
            {
                if (!first) sb.Append(',');
                first = false;
                sb.Append("{\"id\":\"").Append(id).Append("\",\"pos\":").Append(V(pos))
                  .Append(",\"dist\":").Append(Distance(pos).ToString("0.0", c))
                  .Append(",\"bearing\":").Append(Bearing(pos).ToString("0", c)).Append(extra).Append('}');
            }
            if (key.gameObject.activeSelf) Thing("key", key.position, ",\"note\":\"on a crate 1 m high: stand on the crate to pick it up\"");
            if (!gateOpen) Thing("gate", gate.position, ",\"note\":\"in the wall at z=2, x from -2 to 2\"");
            foreach (var e in enemies)
                if (e.Hp > 0) Thing(e.Id, e.Body.position, ",\"hp\":" + e.Hp);
            Thing("chest", chest.position, "");
            sb.Append("]");
            sb.Append(",\"controls\":\"W/S forward/back and A/D strafe relative to facing (4 m/s); LeftShift+move sprints at 7 m/s using stamina; ")
              .Append("Space jumps 1.2 m (enough to land on the crate); mouse delta ~dx,0 turns dx*0.2 degrees per frame, positive to the right; ")
              .Append("mouse.left attacks once per press (2.2 m, within 60 degrees of facing, 0.6 s cooldown, skeletons have 3 hp); ")
              .Append("E interacts within 2 m (key, gate needs the key, chest needs both skeletons defeated); Q drinks a potion (+40 hp). ")
              .Append("Skeletons chase within 7 m and hit 15 hp per second; dying respawns you at the start.\"}");
            return sb.ToString();
        }

        float Distance(Vector3 pos) => Flat(pos - player.position).magnitude;

        float Bearing(Vector3 pos) => Vector3.SignedAngle(player.forward, Flat(pos - player.position), Vector3.up);

        static Vector3 Flat(Vector3 v) => new Vector3(v.x, 0f, v.z);

        static string V(Vector3 v) =>
            string.Format(CultureInfo.InvariantCulture, "[{0:0.0},{1:0.0},{2:0.0}]", v.x, v.y, v.z);

        static Transform Block(string name, Vector3 pos, Vector3 size, Color color) =>
            Prop(PrimitiveType.Cube, name, pos, size, color, solid: true);

        static Transform Prop(PrimitiveType type, string name, Vector3 pos, Vector3 scale, Color color, bool solid = false)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            if (!solid) DestroyImmediate(go.GetComponent<Collider>());
            go.transform.position = pos;
            go.transform.localScale = scale;
            go.GetComponent<Renderer>().material.color = color;
            return go.transform;
        }
    }
}
