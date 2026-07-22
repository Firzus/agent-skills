# Docker Compose & Stack

Deploying multi-container stacks on Dokploy, plus the volume and networking rules that keep
data and routing intact.

## Compose vs Stack

Dokploy offers two configuration methods:

| | **Docker Compose** | **Stack** (Swarm) |
| --- | --- | --- |
| `build:` directive | ✅ Supported | ❌ Not supported — use pre-built registry images |
| Traefik labels location | `labels:` | `deploy.labels:` |
| Replicas / Swarm orchestration | Limited | Full |
| Private registry on workers | — | Add `--with-registry-auth` to the deploy command |

For Stack with private images, append `--with-registry-auth` (Advanced → Command) so worker
nodes receive registry credentials; otherwise pulls fail with "no such image".

## Environment variables

UI-defined vars are written to a `.env` file next to `docker-compose.yml` but are **not**
auto-injected into containers. Either:

```yaml
services:
  app:
    env_file:
      - .env          # inject everything
```

or reference specific ones:

```yaml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}
```

## Domains: prefer native UI (Method 1)

Since v0.7.0, add domains in the **Domains** tab and Dokploy injects Traefik labels +
networks automatically at deploy time. Use **Preview Compose** to see the final file. Redeploy
after each domain change (labels are read at deploy). Without Isolated Deployments, Dokploy
adds `dokploy-network` to the selected service — add it to other services that need routing.

## Domains: manual labels (Method 2, advanced)

If configuring labels by hand:

1. Attach services to the external `dokploy-network`.
2. Use `expose:` (not `ports:`) so the port stays on the internal network.
3. Add labels:

```yaml
services:
  frontend:
    expose:
      - 3000
    networks:
      - dokploy-network
    labels:
      - traefik.enable=true
      - traefik.http.routers.frontend-app.rule=Host(`frontend.example.com`)
      - traefik.http.routers.frontend-app.entrypoints=web
      - traefik.http.services.frontend-app.loadbalancer.server.port=3000

networks:
  dokploy-network:
    external: true
```

For **Stack**, nest the same labels under `deploy.labels` and use `image:` (no `build:`).
Give each router/service a unique name.

## Isolated Deployments

Enabled by default for all templates. Creates a per-`appName` network and wires Traefik to
it, so you can run multiple instances of the same stack (e.g. two WordPress) without service-
name collisions. No need to declare `dokploy-network` manually.

Caveat: if you replaced the standalone Traefik container with a Traefik **service**, a host
restart can drop network references and require manual redeploys (GitHub issue #1004). The
official/standalone-Traefik install does not have this problem.

## Volumes — the persistence rules

| Method | Syntax | Backups (Volume Backups)? | Use for |
| --- | --- | --- | --- |
| **Bind mount via `../files`** | `../files/db:/var/lib/mysql` | ❌ No | Config files, simple persistence, direct host access |
| **Named volume** | `my-db:/var/lib/mysql` + top-level `volumes:` | ✅ Yes | Databases, large datasets, anything needing S3 backups |

**Never** use absolute host paths — they are wiped on deploy:

```yaml
volumes:
  - "/folder:/path/in/container"        # ❌ cleaned on deploy
  - "../files/my-database:/var/lib/mysql"  # ✅ persists
  - my-database:/var/lib/mysql             # ✅ persists + backupable
```

### Repo files must move to File Mounts

AutoDeploy runs `git clone` on every deploy, clearing the repo directory. Mounting repo files
by relative path (`./config/app.conf`) works on the **first** deploy then goes empty. Instead:
**Advanced → Mounts → File Mount**, paste the content, and reference it via `../files/`:

```yaml
volumes:
  - "../files/app.conf:/etc/my-app/config"   # ✅ survives redeploys
```

## Ports pitfall (Bad Gateway / conflicts)

For domain-routed services, don't publish to the host. Compose: list the internal port only
(`ports: [3000]` or `expose: [3000]`); Stack: use `expose:`. Then point the Dokploy domain at
`serviceName` + port. Publishing `3000:3000` causes host port conflicts and routing issues.

## Per-service features

Compose stacks support per-service Monitoring and Logs, plus Deployments, Backups, Schedules,
and Volume Backups tabs (keyboard nav prefixed with `g`). See
[databases-backups-storage.md](./databases-backups-storage.md) for backup setup.
