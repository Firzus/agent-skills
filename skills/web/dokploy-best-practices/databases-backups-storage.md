# Databases, Backups & Storage

Managed databases, the three backup mechanisms, S3 destinations, and registries.

## Databases

Dokploy provisions managed instances of **PostgreSQL, MySQL, MariaDB, MongoDB, Redis** as
first-class services with their own Environment, Monitoring, Logs, Backups, and Advanced tabs.

- **Connect from other services** via a project-level shared variable, e.g.
  `DATABASE_URL=postgresql://postgres:postgres@database:5432/postgres`, referenced as
  `${{project.DATABASE_URL}}`. Use the service name as the host on the internal network.
- **Advanced** lets you change the Docker image, run commands, set resources/volumes, and
  (Danger Zone) wipe all data.
- Multiline env values: wrap in double quotes, e.g. `'"-----BEGIN KEY-----..."'`.

## Three backup mechanisms — pick the right one

| Mechanism | Backs up | Use when |
| --- | --- | --- |
| **Database Backups** | A managed DB (pg_dump-style) → S3 | Service is a Dokploy-managed Postgres/MySQL/MariaDB/MongoDB |
| **Volume Backups** | A Docker **named volume** → S3 | App/Compose uses SQLite or no DB, or any data in a named volume |
| **Full Instance Backup** | Dokploy's own Postgres + `/etc/dokploy` → S3 | Disaster recovery / migrating the whole Dokploy install |

All three require a configured **S3 destination** first
(`/dashboard/settings/destinations`).

### Database backups

**Backup** tab → choose S3 destination, database name, cron schedule, prefix, enabled. Use
**Test** to push a one-off backup and verify it lands in the bucket before relying on it.
Restore from **Databases → Restore** (from an S3 bucket).

### Volume backups (named volumes only)

Bind mounts (`../files`) **cannot** be backed up — migrate to named volumes first.

- **Applications**: Advanced → Mounts → Volume Mount.
- **Compose**: declare a top-level named volume.

Config: Name, Schedule (cron, e.g. `0 0 * * *`), S3 destination, Service Name, Volume Name
(auto-filled), optional prefix, **Turn off Container**, Enabled.

- **Turn off Container = ON (recommended)**: stops the container during backup to avoid
  corruption from active writes, then restarts it.
- **ON (running)**: faster but risks inconsistency if the app writes mid-backup.

**Restore**: pick S3 destination + backup, give a target volume name. The target volume must
**not** already exist and must be unused. For Compose, volume names follow
`{appName}_{volumeName}` (e.g. `n8n-n8n-kqlble_n8n_data`).

### Full instance backup (Web Server → Backups)

Backs up `dokploy-postgres` + `/etc/dokploy`, zipped to S3 on an optional cron. Restore
clears `/etc/dokploy`, drops/recreates the DB. After restoring to a **new server/IP**: update
the IP in *Web Server → Server → Update IP*, reconfigure IP-based Git providers, update DNS,
and recreate any `traefik.me` domains. Domain-name-based Git providers need no change.

## S3 destinations

Configure once in Settings → Destinations (access key, secret, bucket, region, endpoint).
Supported providers include AWS S3, Backblaze B2, Google Cloud Storage, Cloudflare R2.
All backup features point at these destinations.

## Registries (Settings → Registries)

Connect any Docker registry (Docker Hub, GHCR, Digital Ocean, custom): Name, Username,
Password, optional **Image Prefix** (for the Cluster feature, e.g. `dokploy` →
`dokploy/my-app:latest`), Registry URL (e.g. `https://index.docker.io/v1`).

Registries are **required** for: build servers, registry-based rollbacks, and Cluster
(multi-replica) deployments — the image must live somewhere all deployment nodes can pull.
Credentials are stored on the machine and reused across apps and remote servers.
