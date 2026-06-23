#!/bin/sh
# Golden QA container entrypoint.
# Runs as root so it can fix ownership of freshly-mounted named volumes
# (Docker may create them root-owned), then drops to the unprivileged
# 'node' user to run the app. The server itself waits for Postgres and
# seeds on first run, so nothing else is needed here.
set -e
mkdir -p /app/data/uploads
chown -R node:node /app/data 2>/dev/null || true
exec gosu node "$@"
