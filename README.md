# Golden QA — Starkist Label In-Process Inspection System

A tablet-first quality-inspection app for the Starkist paper-label line. Operators and QA
Officers capture each of the four production stages on a tablet; every record is keyed to one
**Job #**, and typing a Job # returns the full cross-stage quality record.

Runs as a single Node.js process. The standard (containerised) deployment stores everything in
**PostgreSQL** (provisioned as part of the stack); for local/dev use it falls back to a
zero-dependency **JSON file** — no separate database needed to try it out.

> **☁️ Cloud deployment (Vercel + Supabase):** the same code also runs serverless on Vercel with
> Supabase Postgres/Storage — see **[CLOUD-DEPLOY.md](CLOUD-DEPLOY.md)**. Sign-in uses **local
> accounts** (username + password); Clerk sign-in is built in but disabled by default
> (`CLERK_ENABLED=true` to re-enable).

---

## 1. Quick start (on-prem server)

1. Install **Node.js 18+** on the server (https://nodejs.org).
2. Copy this `Golden-QA-App` folder onto the server.
3. From a terminal in this folder, run:

   ```
   node server.js
   ```

4. You'll see: `Golden QA server on http://0.0.0.0:3000`.
5. On any tablet on the same network, open **http://<server-ip>:3000** (e.g. http://192.168.1.50:3000).

To keep it running after logoff, install it as a service (Windows: `nssm`, or Task Scheduler;
Linux: `systemd` or `pm2`). See section 7.

> **Full step-by-step install, HTTPS, service, backup and upgrade instructions are in [DEPLOYMENT.md](DEPLOYMENT.md) and the [`deploy/`](deploy) folder.** Run `npm test` for a quick smoke test of the API.

### Default sign-ins (username / password — change before go-live)
| Username | Name | Role | Password |
|----------|------|------|----------|
| `admin` | Administrator | Administrator | `admin123` |
| `ateet` | Ateet Roshan | Quality Manager | `ateet123` |
| `rprasad` | R. Prasad | Supervisor | `prasad123` |
| `akumar` | A. Kumar | QA Officer | `kumar123` |
| `pdevi` | P. Devi | QA Officer | `devi123` |

Passwords are salted and hashed with **scrypt**. Change them in **Admin → Users**. For production, wire the app to your **local Active Directory** so staff sign in with their domain accounts (see [deploy/AD-SSO-SETUP.md](deploy/AD-SSO-SETUP.md)); the seeded admin above stays as a local break-glass account.

---

## 2. Using it on a tablet

- Open the URL in Chrome/Edge/Safari, then **Add to Home Screen** — it installs as an app
  (full-screen, large touch targets).
- After the first load it works **offline**; data entered offline is **queued and synced**
  automatically when the network returns (watch the dot in the top-right: green = online).
- **Scan** the Job # barcode with the camera (📷), **snap defect photos**, and **sign** on screen.

---

## 3. The three stages (forms digitised)

1. **Printing** — F-040-A / F-016-E / F-027-A (machine chosen at job creation)
2. **Sheeting / Slitting** — PRD002
3. **Finishing & Release** — F-038-A (mandatory hourly checks, final release decision)

> Reel Inspection (F-021) was removed from the QA flow — it is the operator's record, not QA's.
> Historical F-021 data on existing jobs is preserved and shown read-only in the job summary.

### Other digitised forms (not tied to a Job #)

- **F-009 Calibration Recording Form** — recorded against each item in the **Equipment & Calibration**
  register: reference-vs-machine-output readings, pass/fail, sticker, next-due and out-of-service.
  The full **calibration history is extractable at any time** (per-item view, CSV, and an Excel sheet).
- **F-012-G Pre-Operational Hygiene Checklist** (daily, 17 items) and **F-013B GMP Checklist**
  (monthly, 6 sections / 59 items) — standalone **Checklists** with two-person sign-off (Completed by
  → Verified by). Both ship fully populated; items and sections are **admin-editable** (Settings →
  Checklist forms — a `## Section` line starts a new section).
  - **Photos** — attach as many images as needed, either to the whole submission or **per line item**
    (📷 in each row). Great for evidencing a defect or a cleaned surface.
  - **Instant e-mail** — completing (or verifying) a checklist immediately e-mails the inspection to
    the **Quality Manager, Supervisors and Administrators** (plus any digest recipients) and mirrors to
    Teams. *Requires SMTP configured in `config.json → notify.email`* (see §4); if SMTP is off it
    silently no-ops.
  - **Due-tracking & reminders** — the Checklists page shows a **"Checks due"** panel: daily forms are
    flagged **due before mid-day** (overdue after), monthly forms surface **toward month-end**. An
    hourly job e-mails a reminder for anything overdue/outstanding (same SMTP requirement). The daily
    cut-off hour is configurable per form (default noon).

### Amendments History

Every entry and change is recorded in a tamper-evident (HMAC-chained) **Amendments History** — who,
when, and the **field-level before → value → after**. Data stays editable (with a break-glass reality
for the floor), but nothing changes without a traceable record. Filter by record/job/date and export
to CSV. Open a single record's history via the **Amendments** button on any job, CAPA, NCR, equipment
item or checklist.

---

## 4. Configuration — `config.json`

| Key | What it does |
|-----|--------------|
| `port` / `host` | Server address (default 3000 on all interfaces) |
| `ldap` | **Local Active Directory** sign-in (LDAPS). Set `ldap.enabled` + the `LDAP_*` env vars and map AD groups to roles in `ldap.roleGroups` (see [deploy/AD-SSO-SETUP.md](deploy/AD-SSO-SETUP.md)). This is the recommended production auth. |
| `sso` | Cloud **Microsoft Entra ID** sign-in (needs internet), disabled by default. Fill `tenantId`/`clientId` with your Entra App registration GUIDs to require real `id_token` validation (see [deploy/ENTRA-SSO-SETUP.md](deploy/ENTRA-SSO-SETUP.md)) |
| `notify.email` | SMTP details for hold/reject alerts and the manager digest. `secure:true` = implicit TLS (465); `secure:false` = STARTTLS (587); leave `user`/`pass` blank for an unauthenticated relay |
| `storage` | Ignored when `DATABASE_URL` is set — the containerised deploy always uses **PostgreSQL**. Without `DATABASE_URL` the app uses a local `data/db.json` file (dev / single-box on-prem). |
| `backup` | Automatic rotating snapshots of `data/db.json` into `data/backups/` — `intervalMin` between snapshots, `keep` = how many to retain |
| `notify` | Paste a **Teams Incoming Webhook URL** and/or SMTP details to get hold/reject alerts |
| `tolerances` | COF range, registration max, barcode min grade — drive the auto pass/fail flags (also editable in Admin) |

---

## 5. Integrations

- **Alerts**: hold/reject events call `integrations/notify.js` (Teams webhook now; SMTP email
  hook ready to wire to your relay).

---

## 6. Data, backup & database

- **Production (containerised):** all data lives in **PostgreSQL** (the `db` service in the compose
  files, connected via `DATABASE_URL`). It is the system of record; back it up with the bundled
  nightly `db-backup` service (pg dumps into the `goldenqa_backups` volume). Uploaded
  photos/signatures live on the `goldenqa_uploads` volume (`data/uploads/`) — back that up too.
- **Local / single-box dev:** with no `DATABASE_URL`, the app uses a `data/db.json` file with
  crash-safe atomic writes (temp-file + fsync + rename, plus a `.bak` fallback) and rotating
  snapshots into `data/backups/`. Back up the `data/` folder on a schedule.
- The storage layer is a single JSON document either way, so the two backends are interchangeable
  (`integrations/storage.js`). SQLite is not supported.

---

## 7. Production hardening checklist

- [ ] Change all default **passwords** (Admin > Users / edit `seedDB`), set strong manager passwords.
- [x] **Login brute-force lockout** is built in (`config.json` → `security`): repeated wrong attempts per username+IP lock that login for a cool-off window.
- [ ] Put the server behind **HTTPS** (reverse proxy: IIS/ARR, nginx, or Caddy) so the camera
      and PWA install work reliably and credentials are encrypted.
- [x] Real **Microsoft Entra ID** `id_token` validation is built in — set `sso.tenantId`/`sso.clientId` in `config.json` ([deploy/ENTRA-SSO-SETUP.md](deploy/ENTRA-SSO-SETUP.md)). Leave blank for the demo sign-in.
- [ ] Run as a service (pm2 / systemd / Windows service) with auto-restart — see [DEPLOYMENT.md](DEPLOYMENT.md) and [`deploy/install-windows-service.ps1`](deploy/install-windows-service.ps1).
- [x] **PostgreSQL** is the production system of record (`DATABASE_URL`), with the bundled nightly `db-backup` service. On a single-box JSON deploy, **automatic rotating backups** of `data/db.json` run on a timer (`config.json` → `backup`). Always back up `data/uploads/` as well.
- [ ] Set the **SQF document-retention** period and confirm with your auditor.

---

## 8. What's included (feature list)

Tablet-first PWA (installable, offline + sync) · local **Active Directory (LDAPS)** sign-in with AD-group→role mapping (+ local/break-glass accounts, optional Entra SSO) · role-based access ·
machine-driven Stage-1 forms · all 3 stages with real form fields · barcode/QR Job# scanning ·
defect photo capture · on-screen signatures · auto pass/fail vs tolerances · mandatory hourly-check
reminders · Job# lookup with consolidated record · one-tap SQF PDF (Print) · dashboards (defect
Pareto, waste, downtime, first-pass yield, **date-range / shift trends**) · hold/reject alerts · **CAPA** corrective/preventive-action tracking (with SLA escalation &
effectiveness check) · **NCR** non-conformance reports (promote to CAPA) · **equipment &
calibration register** (due/overdue tracking) · **SPC** control charts (Cp/Cpk) · **supplier
scorecards** · **executive dashboard** (KPI targets + Red/Amber/Green) · **standalone checklists**
(hygiene / GMP) with admin-editable items and two-person sign-off · **F-009 calibration recording**
with extractable calibration history (CSV/Excel) · **Amendments History** — tamper-evident
(HMAC-chained), field-level who/when/before→after, filterable + exportable, per-record drill-down ·
admin master-data editor ·
**user management** (add/edit, password reset) · **training/competency gating** · **login
brute-force lockout** · **stage-in-sequence enforcement** · **required-field validation** ·
**dashboard search/filter** · **CSV + Excel export** · **manager e-mail/Teams digest** +
**scheduled reports** · read-only **REST API keys** · outbound **webhooks** · Prometheus
**/metrics** · **automatic rotating backups** + admin **restore** · **PostgreSQL** storage ·
local **Active Directory** (LDAPS) SSO · smoke tests (`npm test`) · on-prem
**deployment kit** ([DEPLOYMENT.md](DEPLOYMENT.md)).

---

## 9. Documentation

Full documentation lives in [`docs/`](docs):

- **[docs/SYSTEM-GUIDE.md](docs/SYSTEM-GUIDE.md)** — architecture, every module, roles & permissions, data model, configuration, security, API reference.
- **[docs/KNOWLEDGE-BASE.md](docs/KNOWLEDGE-BASE.md)** — how-to articles, FAQ, and troubleshooting (incl. deployment).
- **[docs/USER-TRAINING.md](docs/USER-TRAINING.md)** — role-based training (QA Officer → Supervisor → Quality Manager → Administrator) with exercises and a quick-reference card.

Deployment specifics: [DEPLOYMENT.md](DEPLOYMENT.md) (on-prem) · [CONTAINER-DEPLOY.md](CONTAINER-DEPLOY.md) (Portainer + Traefik).

---

*Golden Manufacturers Pte Ltd — built with Ateet Roshan (Quality Manager) & Sameer Mohammed Taki (AI Engineer).*
