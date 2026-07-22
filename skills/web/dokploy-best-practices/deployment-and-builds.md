# Deployment & Builds

Build types, production CI/CD, zero downtime, rollbacks, preview deployments, auto-deploy,
patches, and watch paths for Dokploy Applications.

## Build types

Dokploy builds an Application image using one of these builders:

| Type | Use for | Notes |
| --- | --- | --- |
| **Nixpacks** | Prototyping (default) | Auto-detects stack. Override via `NIXPACKS_*` env vars or `nixpacks.toml`. Supports monorepos (NX, Turborepo, Moon). |
| **Railpack** | Successor to Nixpacks | Configure via `RAILPACK_*` env vars. Pin a version in the *Railpack Version* field for reproducible builds. Supports Node, Python, Go, PHP, static, shell. |
| **Dockerfile** | Full control | Set *Dockerfile Path*, *Context Path*, optional *Build Stage*. Enables Build Args + Build Secrets. |
| **Buildpack** | Heroku/Paketo migration | Heroku (default v24) or Paketo cloud-native buildpacks. |
| **Static** | Static sites | Copies `Root` into NGINX (`/usr/share/nginx/html`). **Use port `80` for the domain.** |

**Publish Directory** (Nixpacks): for static output (e.g. Astro `dist`), set the publish
directory and Dokploy serves it via an optimized NGINX Dockerfile (domain port `80`).

### Build secrets vs build args

Build **args** and env vars persist in the final image — **never** use them for secrets.
Use **Build-time Secrets** (Dockerfile build type) for API tokens, passwords, SSH keys;
they are not baked into the image or build history.

## Production: build in CI/CD, not on the server

On-server Nixpacks/Buildpack builds consume heavy RAM/CPU and can freeze the box, taking all
apps down. **Strongly recommended**: build + push in a pipeline, deploy by image.

Pipeline shape (GitHub Actions example, applies to GitLab CI / Gitea Actions too):

1. CI checks out, logs into the registry, `docker/build-push-action` builds and pushes
   `namespace/app:tag` (set `platforms: linux/amd64`).
2. In Dokploy create an Application with **Source Type = Docker**, image
   `namespace/app:tag`, deploy, then add a domain (port = app's port, e.g. `3000`).
3. Trigger redeploys automatically:
   - **Docker Hub**: copy the app's *Webhook URL* into the Docker Hub repo's *Webhooks*.
     Deploy fires only when the pushed **tag matches** the one configured in Dokploy.
   - **Any registry**: from CI, `POST https://<domain>/api/application.deploy` with header
     `x-api-key` and body `{"applicationId": "..."}` (or use `dokploy/dokploy-action`).

Use a multi-stage Dockerfile (build stage + slim runtime stage) and BuildKit cache mounts
(`RUN --mount=type=cache,...`) to keep images small and builds fast.

## Zero-downtime deployments

By default Swarm stops the old task before the new one is ready → **Bad Gateway** during
deploys. To get zero downtime:

1. Expose a health route (e.g. `GET /health` → `200`) in your app, listening on the app port.
2. **Advanced → Swarm Settings → Health Check** (values are **nanoseconds**):

```json
{
  "Test": ["CMD", "curl", "-f", "http://localhost:3000/health"],
  "Interval": 30000000000,
  "Timeout": 10000000000,
  "StartPeriod": 30000000000,
  "Retries": 3
}
```

Requirement: `curl` must exist in the image (Alpine images need it installed explicitly).

## Rollbacks

Two independent mechanisms:

### 1. Swarm automatic rollback (on failed health check)

Add the health check above, then **Advanced → Swarm Settings → Update Config**:

```json
{
  "Parallelism": 1,
  "Delay": 10000000000,
  "FailureAction": "rollback",
  "Order": "start-first"
}
```

`Order: start-first` is what actually delivers zero downtime; `FailureAction: rollback`
auto-reverts to the previous version when the new task is unhealthy. Only triggers on
health-check failure of a *new* deploy.

### 2. Registry-based rollback (to any past version)

Enable **Deployments → Rollback Settings** and pick a registry. Every deploy's image is
tagged + pushed there, so you can roll back to **any** previous deployment (not just the
last), independent of health checks. Requires a configured registry + credentials.

## Preview deployments (GitHub)

- Disabled by default; enable per app. **Do not enable for public repos** — external users
  could run builds on your server.
- Auto-creates an isolated deployment per PR targeting your configured branch (PRs to other
  branches are ignored). Updates on each commit, cleans up on close/merge. Cap the number
  per app (default 3).
- Free dynamic domains via `traefik.me` (`preview-${appName}-${uniqueId}.traefik.me`), or a
  wildcard custom domain `*.mydomain.com` (point the wildcard DNS to the server).
- Reference the generated URL in env via `${{DOKPLOY_DEPLOY_URL}}`
  (e.g. `APP_URL=https://${{DOKPLOY_DEPLOY_URL}}`).
- Optional PR **label filter** to only preview labeled PRs. Manual **Rebuild** (hammer icon)
  re-runs the build with current settings without pulling new code. Security/redirect rules
  are inherited by previews.

## Auto-deploy

Auto-deploy is only for **Applications** and **Docker Compose**.

- **GitHub**: zero-config auto-deploy. Other Git providers: enable *Auto Deploy*, copy the
  *Webhook URL* from the deployment logs, add it as a repo webhook.
- **Branch must match** the branch configured in Dokploy, else "Branch Not Match".
- **Docker Hub** tags must match the configured tag.
- **API method**: list IDs via `GET /api/project.all`, then `POST /api/application.deploy`
  (both with `x-api-key`). Ideal for CI/CD or external registries.

## Patches

Apply file-level overrides **after clone, before build**, without touching the source repo.
Use for env-specific config, injected files, or pre-build source edits. Patches are
temporary (applied every build) and persistent in config — remove stale ones. Editing a
non-existent file (edit op) fails the build.

## Watch paths

Trigger deploys only when matching files change (zero-config on GitHub; other providers need
auto-deploy set up first). Accepts an array of glob patterns: `src/*`, `src/index.js`, `**`,
negation (`!a/*.js`), extglob, brace expansion (`foo/{1..5}.md`), POSIX classes, regex
alternation (`foo/(abc|xyz).js`).

## Resources (Advanced → Resources)

Set Memory/CPU **Limit** (hard cap; container killed if exceeded) and **Reservation**
(guaranteed minimum). Reservation ≤ Limit, always. Enter human units (`256MB`, `1GB`,
`0.5 CPU`); Dokploy converts to bytes / NanoCPUs. **Redeploy** to apply.
