# Platform, Ops & Security

Multi-tenancy, environment variables, remote/build servers, scheduled jobs, server
hardening, and a troubleshooting playbook.

## Multi-tenancy hierarchy

```
Organization ──► Project ──► Environment ──► Service
   users &        logical      isolation       apps,
   billing        grouping     (prod/stg)       DBs, compose
```

- **Organization**: top-level tenant — users, billing, SSO, servers, registries, SSH keys,
  certificates, S3 destinations, audit logs. Installer becomes Owner.
- **Project**: logical group of services (per product, per client, or per team). Holds shared
  variables and is the primary unit of access control.
- **Environment**: isolation layer (`production`, `staging`, feature, regional, per-client).
  Services in different environments are fully isolated.
- **Service**: an Application, Database, or Compose stack, each with its own domains, env,
  deployments, logs, backups.

### Best practices

- Consistent naming: `acme-ecommerce / production / storefront, api, postgres-main`.
- **Never** run staging and production in the same environment.
- Scope variables: shared secrets at project level, stage values at environment level.
- Least privilege; review access periodically (Audit Logs / Custom Roles are Enterprise).

## Environment variables & inheritance

Three levels, each overriding the previous: **project → environment → service**.

```
Project   DATABASE_HOST=db.internal
  └ Env Production  DATABASE_HOST=db-prod.internal   (override)
      └ Service API → db-prod.internal
  └ Env Staging     (no override)
      └ Service API → db.internal
```

Reference syntax:

- `${{project.VAR}}` — project-level shared var.
- `${{environment.VAR}}` — environment-level var.
- `${{VAR}}` — service-level var (also used to compose other service vars).
- `${{DOKPLOY_DEPLOY_URL}}` — preview deployment URL (service-level, previews only).

Keep names descriptive, document purpose, prefer shared vars for repeated credentials.

## Remote & build servers

Run Dokploy UI on a small box (~250 MB RAM if only managing remote deploys) and deploy to
separate servers. Two server roles:

| Role | Purpose | Notes |
| --- | --- | --- |
| **Deployment server** | Runs containers, Traefik routing, volumes | Multiple allowed for HA / geo distribution |
| **Build server** | Clones + builds + pushes images only | **Applications only** (no Compose); requires a registry |

All features work on remote servers **except** remote-server monitoring (perf reasons).

### Build server flow

Build server installs Nixpacks/Docker/Railpack/Heroku Buildpacks (no running containers).
Deploy flow: SSH to build server → clone → build image → push to registry → deployment
server pulls + runs. Enable in app **Advanced → Build Server** + select a registry under
Cluster Settings. Keep disk clear: enable Docker Cleanup or schedule `docker image prune -af`.

## Scheduled jobs

Four job types, cron-scheduled, each run logged:

| Type | Runs | Example |
| --- | --- | --- |
| **Application** | `docker exec` inside an app container (must be running) | `nginx -v` |
| **Compose** | Inside a compose service (keep `COMPOSE_PROJECT_NAME` unchanged) | migration command |
| **Server** | Bash on the host of a remote server | host maintenance |
| **Dokploy Server** | Inside the Dokploy container (has Docker socket) | `docker image prune -af` |

Common uses: `docker system prune --force` every `*/15 * * * *` to reclaim disk; custom DB
backups for engines Dokploy doesn't natively support (e.g. ClickHouse → S3). Always test
commands manually first and add error handling.

## Server security

Baseline hardening (validated by Dokploy's security checks on Ubuntu/Debian):

- **UFW**: installed, active, default-deny incoming, only needed ports open.
- **Docker bypasses UFW** ⚠️ — published container ports stay public despite UFW rules.
  Fix with **`ufw-docker`** or the **VPS provider firewall** (AWS SG, DO Firewall) which
  acts before Docker's iptables.
- **SSH**: key-based auth on, password auth off, PAM off when using keys, optional non-
  standard port.
- **Fail2Ban**: installed, enabled, SSH jail on (aggressive mode for more protection).
- Keep the OS updated.

## Troubleshooting playbook

| Symptom | Cause | Fix |
| --- | --- | --- |
| **Bad Gateway** | App on `127.0.0.1`, or wrong port | Bind `0.0.0.0` (Vite: `server/preview.host=true`); match domain port |
| **404 on template/compose** | Traefik labels not refreshed | Redeploy after every domain change |
| **Domain works then breaks** | Failing health check blocks routing | Fix or remove the health check |
| **Mounted files empty after 2nd deploy** | Repo-relative mount wiped by `git clone` | Move to File Mounts, use `../files/...` |
| **App "deployed" but not running** | Invalid mount | Check General Swarm section for the real error |
| **Logs/monitoring blank on remote** | App on a different node, or slow/full disk | Expected for other nodes; free disk / check SSL handshake |
| **UI inaccessible** | Disk full → Postgres recovery mode | `docker system prune -a`, `docker builder prune -a`, `docker image prune -a` |
| **UI inaccessible** | Container start race (`ENOTFOUND dokploy-postgres`) | `docker service scale dokploy=0` then `=1` |
| **UI inaccessible** | Bad Traefik config (`field not found`) | Fix `/etc/dokploy/traefik`, `docker restart dokploy-traefik` |
| **Swarm init failed** | Advertise address not resolved | Reinstall with `ADVERTISE_ADDR=<ip>` |

The four healthy control-plane containers are `dokploy`, `dokploy-postgres`,
`dokploy-redis`, `dokploy-traefik`. Inspect with `docker service logs dokploy[-postgres|-redis]`
and `docker logs dokploy-traefik`. Dokploy Cloud removes this operational burden entirely.
