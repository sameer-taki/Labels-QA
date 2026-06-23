# Golden QA — System Guide

**Starkist Label In-Process Inspection System**
Golden Manufacturers Pte Ltd · Quality Department

This is the reference manual for the Golden QA application: what it is, how it's built,
every feature, who can do what, and how it's configured and deployed. Companion documents:
[KNOWLEDGE-BASE.md](KNOWLEDGE-BASE.md) (how-to + troubleshooting) and
[USER-TRAINING.md](USER-TRAINING.md) (role-based training).

---

## 1. What the system is

Golden QA is a **tablet-first Progressive Web App (PWA)** for in-process quality inspection of
the Starkist paper-label line. Every label job is keyed to a single **Job #** and tracked through
**four production stages**. Typing or scanning a Job # returns the full cross-stage record.

- **Runs on-premise** with zero external runtime dependencies (Node.js built-ins; PostgreSQL is
  optional for higher concurrency).
- **Works offline** on the floor — data entered offline is queued and synced when the network
  returns.
- **Audit-grade** — every action is recorded in a tamper-evident (HMAC-chained) audit trail.

## 2. Architecture at a glance

```
   Tablet / desktop browser (PWA, offline cache + sync queue)
                     │  HTTPS
                     ▼
              Traefik v3  (TLS, host routing)        ← shared reverse proxy
                     │  http :3000 (no host port)
                     ▼
        Golden QA app container  (Node.js HTTP server)
            ├── REST API  (/api/*)
            ├── static PWA  (public/)
            └── /metrics  (Prometheus)
                     │
                     ▼
        Storage (one JSON document):
            JSON file (default)  |  SQLite  |  PostgreSQL
```

- **Front-end:** a single-page app (`public/app.js`, `index.html`, `styles.css`) — no framework,
  no build step. Chart.js is loaded from a CDN for analytics (cached for offline).
- **Back-end:** one Node.js file (`server.js`) serving a JSON REST API and the static PWA.
- **Storage abstraction** (`integrations/storage.js`) stores the **entire database as a single
  JSON document**, so the data model is identical across the JSON-file, SQLite and PostgreSQL
  drivers. Single-writer (one app container).
- **Integrations** live in `integrations/`: `entraId.js` (SSO), `email.js` (SMTP), `notify.js`
  (Teams), `backup.js` (rotating snapshots), `webhooks.js` (outbound events), `avtImport.js`.

## 3. The four inspection stages

| # | Stage | Form | Captures |
|---|-------|------|----------|
| 1 | **Printing** | F-040-A / F-016-E / F-027-A (per machine) | Job details, material, per-station print setup, machine settings, QC inspection (COF, print registration, GS1 barcode, scuff/tape tests) with **auto pass/fail vs tolerances**, photos |
| 2 | **Reel Inspection** | F-021 | Header, **per-roll defect & waste log**, AVT report CSV import, photos |
| 3 | **Sheeting / Slitting** | PRD002 | Job run, rolls produced, random quality checks, **down-time** breakdown, remarks, photos |
| 4 | **Finishing & Release** | F-038-A | Header, **mandatory hourly QC checks**, rejection log, **final release decision** (Released / Hold / Rejected), on-screen **signature**, photos |

**Rules enforced**
- **Stage-in-sequence:** a stage can only be marked *complete* after the previous one is complete.
- **Required fields:** marking a stage complete validates its mandatory fields (server + client).
- **Release decision:** a Stage-4 decision of Hold/Rejected sets the job status and fires alerts.

## 4. Feature catalogue (by sidebar section)

**Overview**
- **Dashboard** — KPI cards (total / in-progress / released / hold-reject), searchable & filterable
  job list (by status, machine), CSV export.
- **Executive** *(manager+)* — KPIs scored **Red/Amber/Green vs configurable targets**
  (first-pass yield, open CAPAs, overdue calibrations, hold/reject) plus action lists
  (overdue CAPAs, overdue/due-soon calibrations, current holds). Print/PDF.

**Inspection**
- **New Job** — create a job (machine + Job #, barcode scan, customer/product).
- **Data Entry** — open a job and fill stages 1–4 (forms, photos, signature). Edit/Clone/Hold/Delete/Raise-CAPA from the header (role-gated).
- **Job Lookup** — type/scan a Job # → consolidated cross-stage record; one-tap **SQF PDF** (print).

**Quality**
- **CAPA** — corrective & preventive actions: severity, owner, due date, root cause, corrective &
  preventive actions, status (Open / In Progress / Closed), **SLA escalation** on overdue, and
  **effectiveness verification**.
- **NCR** — non-conformance reports: disposition (use-as-is / rework / reject / return / scrap),
  severity, status; **promote an NCR to a linked CAPA** in one click.
- **Equipment** — equipment & calibration register (machines, anilox, gauges, verifiers, scales):
  calibration interval, **status auto-computed** (OK / Due soon / Overdue / Retired), calibration
  history, "Record calibration".
- **SPC** — statistical process control chart for COF or print registration: mean, ±3σ control
  limits, spec limits, **Cp/Cpk** capability, out-of-limit points.

**Reports**
- **Reports** — live analytics: defect Pareto, waste by machine, down-time, first-pass yield, a
  **quality trend** line, **date-range / shift filters**, CSV + **Excel** export, e-mail digest.
- **Suppliers** — supplier scorecards: jobs, released, hold/reject, FPY, defect & waste kg.

**Settings**
- **Team & Access** *(manager+)* — users, roles, and **per-user stage qualifications**.
- **Audit Trail** *(manager+)* — last 300 actions; **Verify integrity** checks the HMAC chain.
- **Integrations** *(admin)* — read-only **REST API keys**, outbound **webhooks**, metrics info.
- **Settings** *(manager+)* — tolerances, KPI targets, **competency enforcement** toggle, defect
  list, **backups & storage**, **restore from backup** (admin, JSON storage).
- **My Account** — profile and password change.

## 5. Roles & permissions

Four roles, increasing privilege: **QA Officer → Supervisor → Quality Manager → Administrator**.

| Capability | QA Officer | Supervisor | Quality Manager | Administrator |
|---|:--:|:--:|:--:|:--:|
| View dashboards, reports, lookup, SPC, suppliers | ✅ | ✅ | ✅ | ✅ |
| Create / clone jobs, enter & complete stages, upload photos | ✅ | ✅ | ✅ | ✅ |
| View CAPA / NCR / Equipment | ✅ | ✅ | ✅ | ✅ |
| Change own password | ✅ | ✅ | ✅ | ✅ |
| Edit job details, place **Hold** | – | ✅ | ✅ | ✅ |
| Create/update **CAPA**, **NCR**, **Equipment**, calibrations | – | ✅ | ✅ | ✅ |
| Edit master data (tolerances, targets, defect list, competency toggle) | – | ✅ | ✅ | ✅ |
| **Executive** dashboard, **Audit verify**, send digest, backups status | – | ✅ | ✅ | ✅ |
| Manage **users**, delete jobs | – | – | ✅ | ✅ |
| **API keys**, **webhooks**, **restore from backup** | – | – | – | ✅ |
| Bypass competency gating | – | – | – | ✅ |

> **Competency gating** (opt-in, Settings): when on, a stage sign-off is blocked unless the signer
> has that stage in their **qualified stages** (set per user in Team & Access). Administrators bypass.

**Sign-in:** username + password (salted **scrypt**), or **Microsoft 365 / Entra ID** SSO. With SSO
unconfigured, the "Sign in with Microsoft 365" button runs a demo e-mail sign-in; unknown users get
least-privilege **QA Officer**.

## 6. Data model

The database is one JSON document with these collections:

| Collection | Holds |
|---|---|
| `users` | id, name, role, scrypt salt+hash, `qualifiedStages[]` |
| `jobs` | jobNo, machine, customer, product, created, `stage1..4`, `statusOverride` |
| `capas` | id, jobNo, title, severity, status, root cause, actions, owner, dueDate, effectiveness, escalation |
| `ncrs` | id, jobNo, description, disposition, severity, status, `capaId` link |
| `equipment` | id, name, type, machine, calibratedOn, intervalDays, history[] (status computed) |
| `apikeys` | id, name, prefix, **keyHash** (sha256), scopes, active |
| `webhooks` | id, url, events[], secret, lastStatus |
| `masterdata` | machines, defectTypes, products, tolerances, KPI targets, competencyEnforced |
| `audit` | ts, user, action, jobNo, detail, **hash** (HMAC chain) + `auditAnchor` |

Photos and signatures are stored as files under `data/uploads/`.

## 7. Configuration (`config.json`)

| Key | Purpose |
|---|---|
| `port` / `host` | Server address (default `3000` on all interfaces) |
| `orgName` | Organisation name shown in the UI and reports |
| `sso` | Microsoft 365 sign-in. Blank `tenantId`/`clientId` = demo e-mail sign-in; fill both to require real Entra ID `id_token` validation (`deploy/ENTRA-SSO-SETUP.md`) |
| `notify.email` | SMTP for hold/reject alerts + digests (`secure:true`=465 implicit TLS, `false`=587 STARTTLS) |
| `notify.teamsWebhookUrl` | Microsoft Teams Incoming Webhook for alerts/digest |
| `tolerances` | COF min/max, registration max (mm), barcode min grade — drive auto pass/fail and SPC limits |
| `storage` | `driver:"json"` (default) or `"sqlite"` (Node 22.5+) |
| `backup` | Rotating snapshots of `data/db.json`: `intervalMin`, `keep` |
| `security` | Login throttle: `maxLoginFails`, `windowMin`, `lockMin` |
| `reports` | Scheduled digest: `schedule` (off/daily/weekly/monthly), `hour`, `dayOfWeek`, `dayOfMonth` |

**Environment overrides** (for container deploys): `PORT`, `HOST`, `NODE_ENV=production`,
`SECRET_KEY` (required in prod — signs session tokens & the audit chain), `SESSION_HOURS`,
`DATABASE_URL` (enables PostgreSQL), `ADMIN_USERNAME` / `ADMIN_PASSWORD` (seed the first admin),
`BACKUP_DIR`, `METRICS_TOKEN`.

## 8. Security

- **Authentication** — scrypt password hashing; stateless HMAC-signed session tokens (survive
  restarts, work across replicas); optional Microsoft Entra ID `id_token` verification.
- **Login brute-force lockout** — N failed attempts per username+IP lock that login for a cool-off
  window (`config.security`); failures are audited; locked attempts get HTTP 429.
- **Tamper-evident audit trail** — each entry is HMAC-chained (key = `SECRET_KEY`) to the previous;
  `GET /api/audit/verify` (or the **Verify integrity** button) detects any edit/insert/delete and
  names the broken entry. Strength depends on `SECRET_KEY` staying secret.
- **RBAC** — see §5. **API keys are read-only** (GET) and scoped to operational data.
- **Competency gating** — optional sign-off gate by qualification (§5).
- Run behind **HTTPS** (Traefik/Caddy/nginx) so the camera, PWA install and credentials are secure.

## 9. Integrations & automation

- **Microsoft Entra ID SSO** — `deploy/ENTRA-SSO-SETUP.md`.
- **Alerts** — hold/reject events and the manager digest go to Teams (webhook) and/or e-mail (SMTP).
- **Scheduled reports** — automatic digest on a daily/weekly/monthly cadence (`config.reports`).
- **REST API keys** — `x-api-key: gqa_…` header, **read-only**, for BI tools. Manage in Integrations.
- **Webhooks** — signed JSON POST (`X-GQA-Signature` HMAC) on `job.released`, `job.hold`,
  `capa.opened`, `capa.closed`, `equipment.calibrated`.
- **Prometheus `/metrics`** — jobs, FPY, open/overdue CAPAs, equipment, overdue calibrations, uptime.
  Optional `METRICS_TOKEN`.
- **AVT reel report import** — Stage 2 → *Import AVT report (CSV)*; headers (any order):
  `Roll, TotalMeters, WasteIn, WasteOut, Defect, WeightKg`.

## 10. Backups & restore

- Rotating snapshots of `data/db.json` are written to `data/backups/` on a timer (`config.backup`).
- **Restore** (Administrator, JSON storage): Settings → *Restore from backup* takes a safety
  snapshot of current data first, then swaps in the chosen snapshot.
- Always copy backups **off the box** (a backup on the same disk is not a backup). For PostgreSQL,
  use the `db-backup` sidecar's nightly `pg_dump` (see `CONTAINER-DEPLOY.md`).

## 11. Deployment

- **On-prem (simple):** `node server.js` → `http://<server-ip>:3000`. See `DEPLOYMENT.md`.
- **Container (production):** Portainer **GitOps** + Traefik v3 — see `CONTAINER-DEPLOY.md`.
  Portainer polls `main` and redeploys on each new commit; Traefik terminates TLS and routes by host.
- **CI:** `.github/workflows/ci.yml` runs `node --check` on all JS plus the smoke test
  (`npm test`) on Node 20 & 24 for every PR/push to `main`.

## 12. REST API reference (summary)

All endpoints are under `/api`. Auth: `x-token: <session>` (login) or `x-api-key: gqa_…` (read-only).

| Method & path | Purpose | Min role |
|---|---|---|
| `POST /api/login` | Username/password or SSO sign-in | – |
| `GET /api/me` · `POST /api/me/password` | Profile · change password | authed |
| `GET /api/jobs` · `GET /api/jobs/:no` | List · fetch a job | authed |
| `POST /api/jobs` · `POST /api/jobs/:no/clone` | Create · clone | authed |
| `PUT /api/jobs/:no` · `DELETE /api/jobs/:no` | Edit metadata · delete | Supervisor · QM |
| `PUT /api/jobs/:no/stage/:n` | Save/complete a stage | authed (+competency) |
| `POST /api/jobs/:no/hold` | Place on hold | Supervisor |
| `POST /api/upload` | Photo/signature upload | authed |
| `GET/POST/PUT /api/capas[/:id]` | CAPA list/create/update | view: authed · write: Supervisor |
| `GET/POST/PUT /api/ncrs[/:id]` · `POST /api/ncrs/:id/capa` | NCR + promote | view: authed · write: Supervisor |
| `GET/POST/PUT /api/equipment[/:id]` · `POST /api/equipment/:id/calibrate` | Equipment + calibrate | view: authed · write: Supervisor |
| `GET /api/analytics` · `GET /api/spc` · `GET /api/suppliers` | Analytics / SPC / suppliers | authed |
| `GET /api/exec` | Executive RAG summary | Supervisor |
| `GET /api/audit` · `GET /api/audit/verify` | Audit log · integrity check | authed · Supervisor |
| `GET /api/masterdata` · `PUT /api/masterdata` | Master data | view: authed · write: Supervisor |
| `GET/POST/PUT/DELETE /api/admin/users[/:id]` | User management | GET: Supervisor · write: QM |
| `GET /api/admin/backups` · `POST /api/admin/restore` | Backups · restore | Supervisor · Administrator |
| `GET/POST/DELETE /api/admin/apikeys[/:id]` | API keys | Administrator |
| `GET/POST/DELETE /api/admin/webhooks[/:id]` | Webhooks | Administrator |
| `GET /api/export/jobs.csv` · `GET /api/export/workbook.xls` | CSV · Excel export | authed |
| `GET /api/digest` · `POST /api/digest/send` | Build · send digest | authed · Supervisor |
| `POST /api/avt-import` | Parse AVT CSV | authed |
| `GET /metrics` | Prometheus metrics | open / `METRICS_TOKEN` |

---

*Golden Manufacturers Pte Ltd — built with Ateet Roshan (Quality Manager) & Sameer Mohammed Taki (AI Engineer).*
