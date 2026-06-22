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

### Default sign-ins (change before go-live)
| User | Role | PIN |
|------|------|-----|
| A. Kumar / P. Devi | QA Officer | 1234 |
| R. Prasad | Supervisor | 2345 |
| Ateet Roshan | Quality Manager | 9999 |
| Administrator | Administrator | 0000 |

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
| `businessCentral` | Set `enabled:true` and confirm `jobService` (the published OData web service holding the print Job# + item). The server queries `bc-test.gml.com.fj` directly — run it on a host that can reach BC |
| `notify` | Paste a **Teams Incoming Webhook URL** and/or SMTP details to get hold/reject alerts |
| `tolerances` | COF range, registration max, barcode min grade — drive the auto pass/fail flags (also editable in Admin) |

---

## 5. Integrations

- **Business Central**: `integrations/businessCentral.js` queries BC14 OData V4 by Job #.
  Until enabled it returns sample data so the UI works. Confirm the exact service name with
  your BC admin and set `businessCentral.enabled=true`.
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

- [ ] Change all default PINs (Admin > Users / edit `seedDB`), set strong manager PINs.
- [ ] Put the server behind **HTTPS** (reverse proxy: IIS/ARR, nginx, or Caddy) so the camera
      and PWA install work reliably and credentials are encrypted.
- [x] Real **Microsoft Entra ID** `id_token` validation is built in — set `sso.tenantId`/`sso.clientId` in `config.json` ([deploy/ENTRA-SSO-SETUP.md](deploy/ENTRA-SSO-SETUP.md)). Leave blank for the demo sign-in.
- [ ] Run as a service (pm2 / systemd / Windows service) with auto-restart — see [DEPLOYMENT.md](DEPLOYMENT.md) and [`deploy/install-windows-service.ps1`](deploy/install-windows-service.ps1).
- [x] **Automatic rotating backups** of `data/db.json` run on a timer (`config.json` → `backup`). Optional **SQLite** storage via `storage.driver` (Node 22.5+). Still back up `data/uploads/`; move to **PostgreSQL** for high concurrency.
- [ ] Confirm the **Business Central** web service and enable it.
- [ ] Set the **SQF document-retention** period and confirm with your auditor.

---

## 8. What's included (feature list)

Tablet-first PWA (installable, offline + sync) · PIN + Microsoft 365 sign-in · role-based access ·
machine-driven Stage-1 forms · all 4 stages with real form fields · barcode/QR Job# scanning ·
defect photo capture · on-screen signatures · auto pass/fail vs tolerances · mandatory hourly-check
reminders · Job# lookup with consolidated record · one-tap SQF PDF (Print) · dashboards (defect
Pareto, waste, downtime, first-pass yield) · Business Central + AVT import · hold/reject alerts ·
immutable audit trail · admin master-data editor · **user management** (add/edit, PIN reset) ·
**stage-in-sequence enforcement** · **required-field validation** · **dashboard search/filter** ·
**CSV export** · **manager e-mail/Teams digest** · **automatic rotating backups** · optional
**SQLite** storage · real **Microsoft Entra ID** SSO · smoke tests (`npm test`) · on-prem
**deployment kit** ([DEPLOYMENT.md](DEPLOYMENT.md)).

---

*Golden Manufacturers Pte Ltd — built with Ateet Roshan (Quality Manager) & Sameer Mohammed Taki (AI Engineer).*
