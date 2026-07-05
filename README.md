# Golden QA — Starkist Label In-Process Inspection System

A tablet-first quality-inspection app for the Starkist paper-label line. Operators and QA
Officers capture each of the four production stages on a tablet; every record is keyed to one
**Job #**, and typing a Job # returns the full cross-stage quality record.

Built to run on an **on-premise server** with **zero external dependencies** (Node.js only).

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

Passwords are salted and hashed with **scrypt**. Change them in **Admin → Users**, or sign in with **Microsoft 365** (Entra ID) instead.

---

## 2. Using it on a tablet

- Open the URL in Chrome/Edge/Safari, then **Add to Home Screen** — it installs as an app
  (full-screen, large touch targets).
- After the first load it works **offline**; data entered offline is **queued and synced**
  automatically when the network returns (watch the dot in the top-right: green = online).
- **Scan** the Job # barcode with the camera (📷), **snap defect photos**, and **sign** on screen.

---

## 3. The four stages (forms digitised)

1. **Printing** — F-040-A / F-016-E / F-027-A (machine chosen at job creation)
2. **Reel Inspection** — F-021 (per-roll defect & waste log; AVT import)
3. **Sheeting / Slitting** — PRD002
4. **Finishing & Release** — F-038-A (mandatory hourly checks, final release decision)

---

## 4. Configuration — `config.json`

| Key | What it does |
|-----|--------------|
| `port` / `host` | Server address (default 3000 on all interfaces) |
| `sso` | Microsoft 365 sign-in. Leave `tenantId`/`clientId` blank for the demo e-mail sign-in; fill both with your **Entra App registration** GUIDs to require real Microsoft Entra ID `id_token` validation (see [deploy/ENTRA-SSO-SETUP.md](deploy/ENTRA-SSO-SETUP.md)) |
| `notify.email` | SMTP details for hold/reject alerts and the manager digest. `secure:true` = implicit TLS (465); `secure:false` = STARTTLS (587); leave `user`/`pass` blank for an unauthenticated relay |
| `storage` | `driver:"json"` (default, `data/db.json`) or `"sqlite"` (built-in `node:sqlite`, Node 22.5+; falls back to JSON if unavailable) |
| `backup` | Automatic rotating snapshots of `data/db.json` into `data/backups/` — `intervalMin` between snapshots, `keep` = how many to retain |
| `notify` | Paste a **Teams Incoming Webhook URL** and/or SMTP details to get hold/reject alerts |
| `tolerances` | COF range, registration max, barcode min grade — drive the auto pass/fail flags (also editable in Admin) |

---

## 5. Integrations

- **AVT reel report**: Stage 2 → *Import AVT report (CSV)*. Expected headers (any order):
  `Roll, TotalMeters, WasteIn, WasteOut, Defect, WeightKg`.
- **Alerts**: hold/reject events call `integrations/notify.js` (Teams webhook now; SMTP email
  hook ready to wire to your relay).

---

## 6. Data, backup & database

- All data lives in `data/db.json`; uploaded photos/signatures in `data/uploads/`.
- **Back up the `data/` folder** on a schedule (it is the system of record).
- The storage layer is deliberately simple and **swappable**. For higher volume/concurrency,
  replace the `loadDB`/`saveDB` functions with **PostgreSQL** (recommended) or **SQLite**
  (`node:sqlite`). The data shapes already map cleanly to tables: `jobs`, `stage1..4`, `users`,
  `audit`, `masterdata`.

---

## 7. Production hardening checklist

- [ ] Change all default **passwords** (Admin > Users / edit `seedDB`), set strong manager passwords.
- [x] **Login brute-force lockout** is built in (`config.json` → `security`): repeated wrong attempts per username+IP lock that login for a cool-off window.
- [ ] Put the server behind **HTTPS** (reverse proxy: IIS/ARR, nginx, or Caddy) so the camera
      and PWA install work reliably and credentials are encrypted.
- [x] Real **Microsoft Entra ID** `id_token` validation is built in — set `sso.tenantId`/`sso.clientId` in `config.json` ([deploy/ENTRA-SSO-SETUP.md](deploy/ENTRA-SSO-SETUP.md)). Leave blank for the demo sign-in.
- [ ] Run as a service (pm2 / systemd / Windows service) with auto-restart — see [DEPLOYMENT.md](DEPLOYMENT.md) and [`deploy/install-windows-service.ps1`](deploy/install-windows-service.ps1).
- [x] **Automatic rotating backups** of `data/db.json` run on a timer (`config.json` → `backup`). Optional **SQLite** storage via `storage.driver` (Node 22.5+). Still back up `data/uploads/`; move to **PostgreSQL** for high concurrency.
- [ ] Set the **SQF document-retention** period and confirm with your auditor.

---

## 8. What's included (feature list)

Tablet-first PWA (installable, offline + sync) · username/password + Microsoft 365 sign-in · role-based access ·
machine-driven Stage-1 forms · all 4 stages with real form fields · barcode/QR Job# scanning ·
defect photo capture · on-screen signatures · auto pass/fail vs tolerances · mandatory hourly-check
reminders · Job# lookup with consolidated record · one-tap SQF PDF (Print) · dashboards (defect
Pareto, waste, downtime, first-pass yield, **date-range / shift trends**) · **AVT** reel-report
import · hold/reject alerts · **CAPA** corrective/preventive-action tracking (with SLA escalation &
effectiveness check) · **NCR** non-conformance reports (promote to CAPA) · **equipment &
calibration register** (due/overdue tracking) · **SPC** control charts (Cp/Cpk) · **supplier
scorecards** · **executive dashboard** (KPI targets + Red/Amber/Green) · **tamper-evident
(HMAC-chained) audit trail** with one-click integrity check · admin master-data editor ·
**user management** (add/edit, password reset) · **training/competency gating** · **login
brute-force lockout** · **stage-in-sequence enforcement** · **required-field validation** ·
**dashboard search/filter** · **CSV + Excel export** · **manager e-mail/Teams digest** +
**scheduled reports** · read-only **REST API keys** · outbound **webhooks** · Prometheus
**/metrics** · **automatic rotating backups** + admin **restore** · optional **SQLite** storage ·
real **Microsoft Entra ID** SSO · smoke tests (`npm test`) · on-prem
**deployment kit** ([DEPLOYMENT.md](DEPLOYMENT.md)).

---

## 9. Documentation

Full documentation lives in [`docs/`](docs):

- **[docs/USER-MANUAL.md](docs/USER-MANUAL.md)** — the end-user manual: signing in, offline use, and every screen (all four stages, CAPA/NCR, equipment, SPC, reports, templates, settings) step by step.
- **[docs/SYSTEM-GUIDE.md](docs/SYSTEM-GUIDE.md)** — architecture, every module, roles & permissions, data model, configuration, security, API reference.
- **[docs/KNOWLEDGE-BASE.md](docs/KNOWLEDGE-BASE.md)** — how-to articles, FAQ, and troubleshooting (incl. deployment).
- **[docs/USER-TRAINING.md](docs/USER-TRAINING.md)** — role-based training (QA Officer → Supervisor → Quality Manager → Administrator) with exercises and a quick-reference card.

Deployment specifics: [DEPLOYMENT.md](DEPLOYMENT.md) (on-prem) · [CONTAINER-DEPLOY.md](CONTAINER-DEPLOY.md) (Portainer + Traefik).

---

*Golden Manufacturers Pte Ltd — built with Ateet Roshan (Quality Manager) & Sameer Mohammed Taki (AI Engineer).*
