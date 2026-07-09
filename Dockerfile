# Golden QA App — container image
#
# NOTE: intentionally no `# syntax=docker/dockerfile:1` directive. This Dockerfile uses only
# classic instructions (no BuildKit-only features), so the directive would only add a build-time
# fetch of the docker/dockerfile frontend from Docker Hub — a needless failure point on an
# offline / rate-limited / classic-builder host (the shared host builds without buildx).
# -------------------------------------------------------------------
# Single-stage build. ONE Node process serves both the REST API and
# the static PWA (public/) on a single port — there is NO frontend
# build step, so no multi-stage / build toolchain is required.
#
# Runtime model (see CONTAINER-DEPLOY contract):
#   - Postgres is provided as a sibling container (service 'db').
#   - The app waits for the DB itself and seeds on first run, so there
#     is NO migration/entrypoint script.
#   - Persistent uploads live on a named volume mounted at
#     /app/data/uploads; nightly DB dumps are mounted read-only at
#     /backups (BACKUP_DIR) by the stack, not baked into the image.
# -------------------------------------------------------------------

FROM node:24-slim

# gosu lets the root entrypoint drop privileges to the 'node' user after
# fixing volume ownership (see entrypoint.sh).
RUN apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/*

# Run inside /app; everything below is relative to it.
WORKDIR /app

# ---- Dependencies -------------------------------------------------
# Copy ONLY the manifests first so this layer (the slow npm install)
# is cached and only re-runs when dependencies actually change.
# Both package.json and package-lock.json exist -> use a clean,
# reproducible, lockfile-driven install with dev deps omitted.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Application code ---------------------------------------------
# Copy the rest of the build context (filtered by .dockerignore):
# server.js, public/, integrations/, config.json, etc.
COPY . .

# ---- Persistent data dir -----------------------------------------
# The server creates /app/data/uploads on startup, but it runs as the
# unprivileged 'node' user (built into node:slim). Pre-create the data
# tree and hand ownership to 'node' so it can write here even when the
# goldenqa_uploads volume is freshly initialized from this path.
RUN mkdir -p /app/data/uploads \
    && chown -R node:node /app/data \
    && sed -i 's/\r$//' /app/entrypoint.sh \
    && chmod +x /app/entrypoint.sh

# ---- Runtime configuration ---------------------------------------
# NODE_ENV=production enables prod behavior (and the app's SECRET_KEY
# requirement). PORT matches the Traefik service target. Other env
# (DATABASE_URL, SECRET_KEY, ADMIN_*, BACKUP_DIR, ...) is injected by
# the Portainer stack / .env at deploy time — never baked in here.
ENV NODE_ENV=production \
    PORT=3000

# Document the container-internal port. Traefik reaches the app
# container-to-container on this port; NO host port is published.
EXPOSE 3000

# ---- Healthcheck --------------------------------------------------
# Use the READINESS probe (200 only when Postgres is reachable).
# node:slim has no curl, so use Node's global fetch (Node >=18).
HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=30s \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# ---- Start --------------------------------------------------------
# entrypoint.sh runs as root: it fixes /app/data ownership for freshly
# mounted named volumes, then drops to the unprivileged 'node' user via
# gosu before running the CMD below ("npm start" equivalent).
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "server.js"]
