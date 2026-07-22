# Domains & Traefik

How Dokploy exposes services over HTTP(S) through Traefik, and the routing rules that
explain most "domain not working" cases.

## Two routing models (memorize this)

| Service type | Routing mechanism | Domain change requires redeploy? | Hot reload |
| --- | --- | --- | --- |
| **Applications** (Nixpacks, Dockerfile, Buildpack, Static) | Traefik **file provider** (per-domain config file) | **No** — applies immediately | Yes |
| **Docker Compose** & **templates** | Traefik **labels** (read from container metadata) | **Yes** — must redeploy | No |

This is the single most common source of `404`/stale routing. For Compose/templates,
**every** add/modify/remove of a domain needs a redeploy.

## Adding a domain

Two options:

1. **Free `traefik.me` domains** — HTTP only out of the box. For HTTPS, create a certificate
   (see below) and set the certificate provider to `None`.
2. **Custom domain** — buy a domain, create an `A` record to the server IP, then add it in
   Dokploy with HTTPS + Let's Encrypt.

Domain fields:

- **Host**: e.g. `api.example.com`.
- **Container Port**: which container port Traefik routes to internally. This is **not** a
  public port exposure — it differs from *Advanced → Ports*. Match it to the app's real port
  (`3000` Next.js, `8000` Laravel, `80` for Static / Nixpacks Publish Directory).
- **HTTPS** toggle + **Certificate** (`letsencrypt` or `None`).
- **Path**, **Internal Path**, **Strip Path** — see middlewares below.

### Let's Encrypt ordering

Point the domain's DNS to the server IP **before** adding the domain in Dokploy. If you add
it first, the cert won't be issued — recreate the domain or restart Traefik.

## Path middlewares

Dokploy uses Traefik middlewares to rewrite paths before they reach the container.

- **Internal Path** — *prepends* a prefix. Domain `api.example.com`, Path `/v1`, Internal
  Path `/backend/api`: request `/v1/users` → container sees `/backend/api/users`.
- **Strip Path** — *removes* the path prefix. Path `/dashboard`, Strip Path on: request
  `/dashboard/settings` → container sees `/settings`.
- **Both together** — Strip Path runs first, then Internal Path. `/public` stripped then
  `/app/v2` prepended: `/public/api/users` → `/app/v2/api/users`.

Caution: if the app emits absolute URLs/redirects that don't match the rewritten path, you
get redirect loops or broken assets. Test thoroughly.

## www ↔ non-www

1. DNS: add `CNAME www → example.com`.
2. Create the domain `www.example.com` in Dokploy.
3. **Advanced → Redirects** → choose the `www`-to-non-www preset → Save.

## Certificates (Settings → Certificates)

UI-managed certs (Name, Certificate Data, Private Key, optional Server). Creating the cert
writes the files but you must reference it in Traefik config for it to take effect.

**HTTPS for `traefik.me` domains**: download `fullchain.pem` and `privkey.pem` from
traefik.me (valid ~30 days), paste into Certificate Data / Private Key, enable the domain's
HTTPS toggle, and set the certificate provider to `None`.

## Application domain config (under the hood)

Each app domain produces a Traefik file-provider config with a `web` router (→
`redirect-to-https`) and a `websecure` router (`certResolver: letsencrypt`), plus a service
load-balancer with `passHostHeader: true`. Indentation matters: e.g. `passHostHeader` must
sit under `loadBalancer`, not under a server entry — a misplaced field throws
`field not found` in Traefik logs and can lock you out. Inspect/repair under
`/etc/dokploy/traefik` and `docker restart dokploy-traefik`.

## Common domain failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Domain 404 on Compose/template | Labels not refreshed | Redeploy the service after any domain change |
| Bad Gateway | App on `127.0.0.1` or wrong port | Bind `0.0.0.0`; match container port to app port |
| HTTPS cert never issued | Domain added before DNS pointed | Point DNS first, recreate domain or restart Traefik |
| Domain works then breaks | Failing health check blocks routing | Fix or remove the health check |

See [docker-compose.md](./docker-compose.md) for the full label syntax and Stack
(`deploy.labels`) specifics.
