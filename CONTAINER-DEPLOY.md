# Golden QA — Container Deployment Guide (Portainer + Traefik)

Operator guide for deploying the Golden QA inspection app as a container on Golden
Manufacturers' standard host: **Portainer GitOps + Traefik v3** on a shared
Linux/Docker host. This mirrors the Fibre Mold Plant playbook — same network, same
GitOps stack pattern, same backup image — with names specific to Golden QA.

> **Looking for the non-container path?** To run the app directly with
> `node server.js` (foreground), as a **Windows service** (NSSM / Scheduled Task),
> or under **systemd / pm2** on Linux with a Caddy/nginx reverse proxy, use
> [`DEPLOYMENT.md`](DEPLOYMENT.md) instead. This guide is the containerised
> alternative and assumes Postgres as the system of record.

## Files this guide uses

All committed at the repo root (secrets are **never** committed — see §2):

| File | Role |
|------|------|
| `Dockerfile` | Single-stage `node:24-slim` image; `npm ci --omit=dev`; runs `node server.js`; `HEALTHCHECK` hits `/api/health/ready`. |
| `docker-compose.traefik.yml` | **Production** stack for the Portainer + Traefik host. App + Postgres 16 + nightly backup. No host ports; Traefik routes to it. |
| `docker-compose.yml` | **Local** quick-test stack (publishes a host port; no Traefik). See §8. |
| `.env.example` | Template of the env vars the stack needs. Copy to `.env` for local; in Portainer set them in the stack's env section (§3). |

## At a glance

| Item | Value |
|------|-------|
| Image base | `node:24-slim` (single-stage; static UI served by the Node process) |
| Entry point | `node server.js` (package.json `start`) |
| App listen (in-container) | `0.0.0.0:3000` — **no host port published** in production |
| Router / service name | `goldenqa` |
| Hostname | `${APP_HOST}` (example `goldenqa.gml.com.fj`) |
| Shared Traefik network | `web` (external) |
| Database | Postgres `16-alpine`, user/db `goldenqa`, volume `goldenqa_pgdata` |
| Backups | `prodrigestivill/postgres-backup-local` → volume `goldenqa_backups` |
| Uploads volume | `goldenqa_uploads` → `/app/data/uploads` |
| Liveness | `GET /api/health` → 200 |
| Readiness (HEALTHCHECK) | `GET /api/health/ready` → 200 when DB reachable, else 503 |

---

## 1. Prerequisites

On the shared Docker host, confirm all of the following before adding the stack.

1. **Traefik v3 is already running** on this host (the standard Golden reverse proxy),
   with its HTTP/HTTPS entrypoints and certificate resolver configured. This stack
   does **not** deploy Traefik — it attaches to it.

2. **The shared external `web` network exists.** Traefik and every web-facing app
   share it. Create it once per host (idempotent — safe to re-run; ignore the error
   if it already exists):
   ```bash
   docker network create web
   ```
   Verify:
   ```bash
   docker network ls | grep web
   ```

3. **A DNS / host record for `APP_HOST`** resolves to this host's public/ingress IP.
   Example: an A record `goldenqa.gml.com.fj → <host IP>`. Internal-only? Add it to
   the corporate DNS or each tablet's hosts file. HTTPS is required for the camera and
   PWA install to work reliably.

4. **A TLS path for `APP_HOST`.** Either:
   - **Let's Encrypt via Traefik** — the host's Traefik ACME/HTTP-01 resolver issues
     the cert automatically (needs `APP_HOST` publicly resolvable + port 80/443
     reachable). The compose labels reference this resolver, or
   - **Traefik internal CA / a corporate cert** for internal-only names — distribute
     the CA root to each tablet so browsers trust it.

5. **Portainer** is installed and pointed at this Docker host, with access to this
   git repository (public, or a deploy token / SSH key added in Portainer).

---

## 2. Generate the secrets (do this before adding the stack)

Two secrets must be supplied at deploy time. They are **never committed** — the repo
`.gitignore` already excludes `.env`, `.env.*`, and `config.local.json`. In production
they are entered into the Portainer stack's environment fields (§3).

- **`SECRET_KEY`** — signs session tokens. The app **refuses to start** in production
  if it is missing or weak (needs **≥ 16 alphanumeric characters**). Use a long random
  value:
  ```bash
  openssl rand -hex 32        # 64 hex chars — comfortably strong
  ```
- **`DB_PASSWORD`** — the Postgres password for user `goldenqa`. The app composes its
  `DATABASE_URL` from it (`postgresql://goldenqa:${DB_PASSWORD}@db:5432/goldenqa`), and
  Postgres initialises its data volume with it on first run:
  ```bash
  openssl rand -hex 24
  ```

> **Record both in your password manager.** See §4 — once `goldenqa_pgdata` is
> initialised, the `DB_PASSWORD` **cannot change** without extra steps; the volume
> keeps the password it was first created with.

For a **local** test you can instead copy `.env.example` to `.env` and fill these in
(see §8). Never copy a real `.env` onto the shared host — production secrets live only
in Portainer.

---

## 3. Deploy via Portainer (GitOps from this repo)

In Portainer: **Stacks → Add stack → Repository**.

1. **Name:** `goldenqa` (matches the router/service naming used throughout).
2. **Repository URL:** this repo's URL. Add credentials (token / SSH key) if private.
3. **Reference:** `refs/heads/main`.
4. **Compose path:** `docker-compose.traefik.yml`.
5. **Enable GitOps updates (automatic polling):** interval **5m**. Portainer re-checks
   `refs/heads/main` every 5 minutes and redeploys when the commit changes.
   - **Force redeployment: ON** — rebuilds the image from source on each new commit.
   - **Re-pull image: OFF** ⚠️ — the app image (`goldenqa:latest`) is **built from the
     Dockerfile**, not pulled from a registry. With re-pull ON, Portainer tries to
     `docker pull goldenqa:latest` from Docker Hub, fails with *"pull access denied for
     goldenqa, repository does not exist"*, marks the deploy failed, and **reschedules it
     every minute — an endless rebuild/recreate loop.** (`pull_policy: build` in the compose
     file guards against this too, but leave the toggle OFF.) Re-pull only makes sense for
     stacks that pull pre-built images from a registry.
6. **Environment variables** — set these in the stack's env section:

   | Variable | Required | Notes |
   |----------|----------|-------|
   | `APP_HOST` | yes | Public hostname Traefik routes, e.g. `goldenqa.gml.com.fj`. |
   | `DB_PASSWORD` | yes | Postgres password for user `goldenqa` (from §2). |
   | `SECRET_KEY` | yes | Session-signing secret, ≥ 16 alphanumeric chars (from §2). |
   | `ADMIN_USERNAME` | optional | Seed admin login; defaults to `admin`. |
   | `ADMIN_PASSWORD` | yes (first run) | Seed admin password — used **only** to create the first admin on an empty DB. |

   Non-secret runtime values are fixed in the compose file (`NODE_ENV=production`,
   `PORT=3000`, `HOST=0.0.0.0`, `BACKUP_DIR=/backups`); the app's other non-secret
   settings live in the committed `config.json`. **Do not** put secrets in
   `config.json` — they come only from env.

7. **Deploy the stack.** Portainer creates the containers, the named volumes
   (`goldenqa_pgdata`, `goldenqa_uploads`, `goldenqa_backups`), and attaches the app
   to both the `web` and `default` networks. The app publishes **no host port** —
   Traefik reaches it container-to-container on port `3000`.

> **Topology recap:** the app container joins `[web, default]`; `db` and the backup
> sidecar are on `default` only (not exposed to Traefik). The router/service is named
> `goldenqa` and matches `Host(\`${APP_HOST}\`)`.

---

## 4. First-run notes

- **Single admin is seeded from env.** On the **first** start against an **empty**
  database, the app creates exactly one admin user from `ADMIN_USERNAME` (default
  `admin`) and `ADMIN_PASSWORD`. No demo users/jobs are seeded in production
  (`NODE_ENV=production`). On later starts the seed is skipped — the DB already has
  users.
- **Change the admin password after first login** (Admin → Users), then you may clear
  `ADMIN_PASSWORD` from the stack env on a subsequent redeploy; it is only consulted
  when the DB is empty.
- **The Postgres volume must keep the same `DB_PASSWORD`.** `goldenqa_pgdata` is
  initialised with the password on first creation. Changing `DB_PASSWORD` in the stack
  env afterwards does **not** change the stored Postgres password — the app would then
  fail readiness with an auth error. To rotate it, change the password **inside**
  Postgres (`ALTER ROLE goldenqa WITH PASSWORD '…';`, see §7) and update the env to
  match, or destroy and re-initialise the volume (data loss).
- **The app waits for Postgres itself** (retries ~30s) and seeds on first run — there
  is no migration/entrypoint script. Expect the app's readiness to flip to healthy
  shortly after `db` reports healthy.

---

## 5. Verify the deployment

1. **Containers are healthy.** On the host (or Portainer → Containers):
   ```bash
   docker ps --filter "name=goldenqa" --format "table {{.Names}}\t{{.Status}}"
   ```
   Expect `goldenqa-db-1` and `goldenqa-app-1` (or similar) showing `(healthy)`. The
   app's HEALTHCHECK uses readiness, so `healthy` means the DB is reachable. The
   backup sidecar runs on a schedule and may show its own status.

2. **Readiness from inside the app container** (no host port is published, so test
   in-container):
   ```bash
   docker exec goldenqa-app-1 \
     node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(e=>{console.error(e);process.exit(1)})"
   ```
   Expect `200`. (`/api/health` is the unauthenticated liveness probe; `/api/health/ready`
   returns 200 only when Postgres is reachable, else 503.)

3. **Traefik routes the host.** From a machine that can resolve `APP_HOST`:
   ```bash
   curl -fsS https://goldenqa.gml.com.fj/api/health && echo OK
   ```
   Then open `https://goldenqa.gml.com.fj` in a browser/tablet and sign in with the
   seeded admin. If you get a cert warning on an internal name, the Traefik internal/
   corporate CA root is not yet trusted on that device (§1.4).

---

## 6. Data & backups

**Named volumes survive redeploys.** Pulling a new commit (GitOps) recreates
containers but the volumes persist:

| Volume | Mounted at | Holds |
|--------|------------|-------|
| `goldenqa_pgdata` | Postgres `/var/lib/postgresql/data` | The database (jobs, stages, users, audit, master data). |
| `goldenqa_uploads` | app `/app/data/uploads` | Defect photos and on-screen signatures. |
| `goldenqa_backups` | backup sidecar (rw) + app `/backups` (ro) | Nightly `pg_dump` archives. |

**Nightly DB dumps.** The `prodrigestivill/postgres-backup-local` sidecar connects to
`db` (`POSTGRES_HOST=db`, user/db `goldenqa`) and writes a gzip `pg_dump` on a nightly
`SCHEDULE`, retaining **7 daily / 4 weekly / 6 monthly** archives in `goldenqa_backups`.
That volume is also mounted **read-only** into the app at `/backups`, and `BACKUP_DIR=/backups`
lets the admin panel report the latest dump.

**Copy backups OFF the box.** Volume-only backups die with the host. Schedule a host
cron job (or your standard backup agent) to pull the newest archive to a file share /
object storage. Example — copy out the latest archive:
```bash
docker run --rm -v goldenqa_backups:/b -v "$PWD":/out alpine \
  sh -c 'cp "$(ls -t /b/daily/*.sql.gz | head -1)" /out/'
```

**Restore a dump** (into the running stack — overwrites current data):
```bash
gunzip -c <dump>.sql.gz | docker exec -i <stack>-db-1 psql -U goldenqa -d goldenqa
```
Replace `<stack>` with the actual container prefix (e.g. `goldenqa-db-1`) and `<dump>`
with the archive. Restore `goldenqa_uploads` separately if you also need the photos
(it is not part of the `pg_dump`).

---

## 7. Ops quick reference

Replace `<stack>` with the real container prefix (find it with `docker ps`; with stack
name `goldenqa` it is typically `goldenqa-app-1` / `goldenqa-db-1`).

**Logs**
```bash
docker logs -f <stack>-app-1            # app (server startup, requests, seed)
docker logs -f <stack>-db-1             # Postgres
docker logs <stack>-db-backup-1         # backup sidecar (last run)
```

**Manual redeploy / pull latest** — in Portainer: the stack's **Pull and redeploy**
(rebuilds the app image from the current `main`). GitOps polling (§3) also does this
automatically every 5m. Leave **Re-pull image OFF** (see §3) — the app image is built,
not pulled; only `db`/`db-backup` come from a registry and those refresh on redeploy.

**Rotating the Git access token** (private repo) — Portainer authenticates to GitHub with
a token to read this repo. Tokens expire; when one does, GitOps silently stops advancing
(see the troubleshooting table below). To rotate:
1. Create a new token on GitHub — a **fine-grained PAT** scoped to this repo with
   **Contents: Read** (Metadata auto-added), or a **classic PAT** with the **`repo`** scope.
2. In Portainer, open the stack's **Git** settings (or **Settings → Shared credentials** if
   you use a shared entry) and re-enter the username + new token. Editing a git stack can
   blank the token field — make sure it's filled before saving.
3. **Save**, then **Pull and redeploy**. The stack jumps to the latest `main`.
4. Set a calendar reminder ahead of the new token's expiry (fine-grained PATs last ≤ 366 days).

**Rollback to a previous commit** — in Portainer, change the stack's **Reference** to
a specific commit (`<sha>`) or a tag instead of `refs/heads/main`, then update; or
`git revert` the bad commit on `main` and let GitOps redeploy. The image rebuilds from
that ref.

**DB shell**
```bash
docker exec -it <stack>-db-1 psql -U goldenqa -d goldenqa
# rotate the DB password from inside (then update DB_PASSWORD env to match — see §4):
#   ALTER ROLE goldenqa WITH PASSWORD 'newpassword';
```

**List / inspect volumes**
```bash
docker volume ls | grep goldenqa
docker volume inspect goldenqa_pgdata goldenqa_uploads goldenqa_backups
```

**Restart just the app** (e.g. after changing env in Portainer)
```bash
docker restart <stack>-app-1
```

**Self-healing** — the app image ships a `HEALTHCHECK` (readiness probe), and the stack
runs a small `autoheal` sidecar that **restarts the app automatically if it goes
unhealthy** (e.g. loses the DB). Confirm it's up: `docker ps --filter name=autoheal`.

### Troubleshooting deploys

| Symptom (Portainer log / behaviour) | Cause | Fix |
|---|---|---|
| `Unable to retrieve stack file: Could not get the contents of the file 'docker-compose.traefik.yml'`; stack stuck at an old commit while `main` moved on | Git credential **expired, revoked, or dropped** — Portainer can't read the private repo (the file exists; auth failed) | **Rotate the Git token** (§7 above), then Pull & redeploy. Confirm from the host: `git ls-remote https://<token>@github.com/<owner>/<repo> main`. |
| `pull access denied for goldenqa, repository does not exist or may require 'docker login'`; containers **rebuild/recreate every minute** | **"Re-pull image" is ON** for this build-based stack — Portainer tries to pull the locally-built `goldenqa:latest` from Docker Hub | Turn **"Re-pull image" OFF** on the stack (§3). `pull_policy: build` in the compose also guards this. |
| App container `unhealthy` or restart-looping | Postgres unreachable, wrong `DB_PASSWORD` (must match the `goldenqa_pgdata` volume — §4), or missing/weak `SECRET_KEY` (≥16 alphanumeric) | Check `docker logs <stack>-app-1` and `curl http://localhost:3000/api/health/ready` (from inside the network); fix env; the `autoheal` sidecar restarts it once healthy. |
| New commit merged to `main` but features don't appear | GitOps poll not yet fired (up to 5m), or the deploy is failing on one of the rows above | Wait one poll or hit **Pull and redeploy**; if it fails, check the log against this table. |
| Image build fails fetching `docker/dockerfile` frontend | (Legacy) BuildKit syntax directive on an offline/rate-limited host | Already removed from the Dockerfile — pull latest `main`. |

> Two apps, one host: this stack builds `goldenqa:latest`. If another app on the **same
> Docker host** also builds an image with that exact tag, they overwrite each other and a
> reboot can start the wrong app. Give each app a **distinct image tag** if they share a host.

More deployment FAQs (features not showing, egress checks) live in
[`docs/KNOWLEDGE-BASE.md`](docs/KNOWLEDGE-BASE.md) §G.

---

## 8. Local quick test (no Traefik)

Use `docker-compose.yml` to smoke-test the image on a laptop/dev host. Unlike the
production file, it **publishes a host port** and does not depend on Traefik or the
`web` network.

```bash
cp .env.example .env          # then fill SECRET_KEY, DB_PASSWORD, ADMIN_PASSWORD
docker compose up --build     # builds the image and starts app + db (+ backup)
```

Then verify on the published port (default `3000`, per `docker-compose.yml`):
```bash
curl -fsS http://localhost:3000/api/health/ready && echo READY
```
Open `http://localhost:3000` and sign in with the seeded admin. Tear down:
```bash
docker compose down           # keep volumes (data persists)
docker compose down -v        # ALSO delete volumes (fresh DB next time)
```

> The local stack uses the **same** image, env var names, volumes, and health checks
> as production — only Traefik labels and the published port differ. Validate changes
> here before pushing to `main`, where GitOps deploys them to the shared host.

---

*Golden Manufacturers Pte Ltd — application overview in [`README.md`](README.md);
non-container (on-prem / Windows-service) deployment in [`DEPLOYMENT.md`](DEPLOYMENT.md).*
