---
name: dokploy-best-practices
description: >-
  Best practices for Dokploy, the open-source self-hostable PaaS (Heroku/Vercel/Netlify
  alternative) built on Docker Swarm and Traefik. Covers installation and server sizing,
  the Organization → Project → Environment → Service hierarchy, build types (Nixpacks,
  Railpack, Dockerfile, Buildpack, Static), production CI/CD builds, zero-downtime
  deployments, health checks and rollbacks, preview deployments, domains and Traefik
  routing, Docker Compose vs Stack, persistent volumes and backups, databases, scheduled
  jobs, remote/build servers, environment variables, and server hardening. Use when the
  user mentions Dokploy, deploys apps/databases with it, writes a docker-compose.yml or
  Traefik labels for Dokploy, configures Swarm health checks, sets up auto-deploy
  webhooks, or troubleshoots Bad Gateway, domains, or volume issues on Dokploy.
---

# Dokploy Best Practices

Apply these rules when deploying or reviewing applications, databases, Docker Compose
stacks, domains, or infrastructure managed by Dokploy.

Dokploy is a self-hostable PaaS that orchestrates **Docker Swarm** behind a **Traefik**
reverse proxy, with a **PostgreSQL** + **Redis** control plane and a Next.js UI. Most
behaviors (zero downtime, rollbacks, domains) are thin wrappers over Swarm and Traefik
primitives — understanding both explains most pitfalls.

## Core mental model

- A **Service** is one app/database/compose stack. Services live in an
  `Organization → Project → Environment → Service` hierarchy. Use Environments
  (`production`, `staging`) for isolation; never mix prod and staging in one environment.
- **Variables cascade**: project → environment → service, each level overriding the last.
  Put shared secrets at project level, stage-specific values at environment level.
  Reference with `${{project.VAR}}`, `${{environment.VAR}}`, `${{VAR}}`.
- **Applications** route via Traefik **file provider** (hot-reload, no redeploy for domain
  changes). **Docker Compose / templates** route via Traefik **labels** (redeploy required
  for any domain change). This single distinction explains most "domain not working" 404s.

## Golden rules

1. **Never build on the production server for real workloads.** Nixpacks/Buildpack builds
   are RAM/CPU heavy and can freeze the server. Build + push images in CI/CD (or a dedicated
   build server) and deploy by image. See [deployment-and-builds.md](./deployment-and-builds.md).
2. **Listen on `0.0.0.0`, not `127.0.0.1`.** The #1 cause of Bad Gateway, especially Vite/
   Astro/Vue. Match the domain's container port to the app's real port.
3. **Zero downtime needs a health check + `start-first`.** Without a `/health` endpoint and
   Swarm update config, Swarm stops the old container before the new one is ready → Bad Gateway.
4. **Persist data in named volumes or `../files`, never absolute host paths.** Absolute paths
   and repo-relative mounts get wiped on each `git clone` redeploy. Only **named volumes** can
   be backed up by Volume Backups.
5. **Use `expose`, not `ports`, for domain-routed Compose services.** `ports` publishes to the
   host and causes conflicts; Traefik routes over the internal network.
6. **Harden the host: Docker bypasses UFW.** Container-published ports stay public despite UFW.
   Use `ufw-docker` or the VPS provider firewall.

## Quick reference

| Goal | Approach | Reference |
| --- | --- | --- |
| Prototype fast | Nixpacks (default) or Railpack | [deployment-and-builds.md](./deployment-and-builds.md) |
| Production deploy | CI builds image → registry → deploy by image | [deployment-and-builds.md](./deployment-and-builds.md) |
| No-downtime deploy | Swarm health check + `FailureAction: rollback`, `Order: start-first` | [deployment-and-builds.md](./deployment-and-builds.md) |
| Domains / HTTPS / paths | Traefik file provider (apps) vs labels (compose) | [domains-and-traefik.md](./domains-and-traefik.md) |
| Multi-container app | Compose (`build` ok) vs Stack (registry images, `deploy.labels`) | [docker-compose.md](./docker-compose.md) |
| Persist & back up data | Named volumes + Volume Backups / DB Backups to S3 | [databases-backups-storage.md](./databases-backups-storage.md) |
| Auto-deploy | Webhook (push) or API (`application.deploy`) | [deployment-and-builds.md](./deployment-and-builds.md) |
| Scheduled tasks | App/Compose/Server/Dokploy-server cron jobs | [platform-ops-security.md](./platform-ops-security.md) |
| Scale out / cheap builds | Deployment servers + dedicated build server | [platform-ops-security.md](./platform-ops-security.md) |
| Harden the server | UFW + ufw-docker, SSH keys only, Fail2Ban | [platform-ops-security.md](./platform-ops-security.md) |

## Server & install baseline

- Minimum **2 GB RAM / 30 GB disk**; more if you build on the server. Ports **80, 443, 3000**
  must be free (install fails otherwise). Supported: Ubuntu/Debian, Fedora, CentOS.
- Install: `curl -sSL https://dokploy.com/install.sh | sh`. Pin versions with
  `DOKPLOY_VERSION`. Update with `... | sh -s update`.
- **Secure before exposing**: configure a domain with HTTPS, then disable `ip:port` access
  via `docker service update --publish-rm "published=3000,target=3000,mode=host" dokploy`.
- Avoid disk exhaustion (causes DB recovery mode / UI lockout): schedule
  `docker system prune` jobs and enable Docker Cleanup.

## When stuck

Most failures fall into a few buckets — domain/Traefik, mounts, Swarm health, or disk.
See the Troubleshooting section of [platform-ops-security.md](./platform-ops-security.md)
for symptom → cause → fix tables (Bad Gateway, 404 on compose/templates, empty mounts,
UI inaccessible, Swarm init failure).

## References

- [deployment-and-builds.md](./deployment-and-builds.md) — build types, production CI/CD, zero downtime, rollbacks, preview deployments, auto-deploy, patches, watch paths.
- [domains-and-traefik.md](./domains-and-traefik.md) — domain management, HTTPS/certificates, internal/strip path middlewares, www redirects, Traefik internals.
- [docker-compose.md](./docker-compose.md) — Compose vs Stack, isolated deployments, manual Traefik labels, volumes, private registries.
- [databases-backups-storage.md](./databases-backups-storage.md) — databases, DB backups, volume backups, full-instance backups, S3 destinations, registries.
- [platform-ops-security.md](./platform-ops-security.md) — multi-tenancy, variables, remote/build servers, scheduled jobs, server security, troubleshooting.
