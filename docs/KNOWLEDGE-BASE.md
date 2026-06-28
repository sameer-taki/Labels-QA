# Golden QA — Knowledge Base

Practical how-to articles, FAQs, and troubleshooting for day-to-day use. For the full system
reference see [SYSTEM-GUIDE.md](SYSTEM-GUIDE.md); for structured training see
[USER-TRAINING.md](USER-TRAINING.md).

---

## A. Getting started

### A1. Open & install the app on a tablet
1. In Chrome/Edge/Safari, go to your site URL (e.g. `https://qa.gml.com.fj`).
2. Tap the browser menu → **Add to Home Screen / Install**. It opens full-screen like a native app.
3. After the first load it works **offline**; the dot top-right shows green (online) or red (offline).

### A2. Sign in
- **Username + password:** enter your username and password, tap **Sign in**.
- **Microsoft 365 / Entra:** tap **Sign in with Microsoft 365**. If real Entra SSO isn't configured
  yet, this asks for your `@golden.com.fj` e-mail (demo mode) — unknown e-mails get **QA Officer**
  access. For full role access before SSO is set up, sign in with your username/password instead.

### A3. Change your password
**My Account → Change password.** Enter current + new (min 6 characters) twice. (Microsoft 365
accounts manage their password in Microsoft, not here.)

---

## B. Inspection workflow

### B1. Create a new job
**New Job →** choose the **Printing Machine**, type or **scan (📷)** the **Job #**, set
customer/product → **Create Job & Begin Stage 1**.

### B2. Enter a stage
**Data Entry →** pick the job → tap the stage tile (1–4) → fill the form.
- **Save Draft** keeps your work without completing the stage.
- **Save & Mark Complete** validates required fields and marks the stage done.
- Stages must be completed **in order** (you can't complete Stage 3 before Stage 2).

### B3. Add a defect photo / capture a signature
- **Photos:** in any stage tap **📷 Add photo** (uses the camera on a tablet).
- **Signature (Stage 4):** sign on the canvas → **Save signature**. Required to complete Stage 4.

### B4. Record the four stages
1. **Printing** — material, print stations, machine settings, QC checks. COF and registration show
   a green ✓ / red ✗ **auto-flag** against tolerances as you type.
2. **Reel Inspection** — add a row per roll (defect, waste, weight). You can **Import AVT report
   (CSV)** to fill rows automatically.
3. **Sheeting / Slitting** — infeed roll, in-process checks, production summary, waste summary, down-time.
4. **Finishing & Release** — add **hourly checks** (the banner reminds you when one is due), complete
   the **Line Clearance** (quantity on-hold, disposition, handover) and **sign**. The job is **Released**
   automatically once all four stages are complete; use **Hold** to stop a release.

### B5. Look up a job's full record
**Job Lookup →** type/scan the Job # → **Search**. You get every stage on one page. Tap
**📄 SQF PDF** to print/save the consolidated record.

### B6. Hold, edit, clone or delete a job *(role-gated)*
Open the job in **Data Entry**; the header has **Edit details**, **Clone**, **Raise CAPA**,
**Hold** (Supervisor+) and **Delete** (Quality Manager/Administrator).

---

## C. Quality modules

### C1. Raise & close a CAPA
**CAPA → + Raise CAPA.** Set title, severity, owner, due date, root cause, corrective & preventive
actions. To close: open it → set **Status = Closed**; afterwards set **Effectiveness**
(Verified / Not effective). Overdue open CAPAs are **escalated automatically** (Teams/e-mail).
> Tip: from a held/rejected job, use **Raise CAPA** in the Data-Entry header to pre-fill the Job #.

### C2. Raise an NCR and promote it to a CAPA
**NCR → + Raise NCR** (job, description, disposition, severity). To drive corrective action, click
**Raise CAPA** on the NCR — it creates a linked CAPA and records the link both ways.

### C3. Register equipment & record a calibration
**Equipment → + Add equipment** (name, type, machine, last-calibrated date, interval days). Status
is computed automatically: **OK**, **Due soon** (within 14 days), **Overdue**, **Retired**.
To recalibrate: **Calibrate →** date, result, interval, notes → **Save** (logged in history).

### C4. Read an SPC chart
**SPC →** pick **COF** or **Print registration**. You get the control chart (points + mean + ±3σ
UCL/LCL + spec USL/LSL), **Cp/Cpk** (Cpk ≥ 1.33 green, ≥ 1.0 amber, otherwise red) and a list of
any out-of-limit jobs. Needs at least 2 recorded readings.

---

## D. Reports & exports

### D1. Filter and export job data
**Reports →** set **From/To** dates and **Shift** to filter. **Export CSV** (raw rows) or
**Export Excel** (a multi-sheet `.xls` workbook: Jobs, CAPAs, Equipment, Suppliers).

### D2. Email the manager digest
**Reports → ✉ Email digest to managers** (Supervisor+) sends KPIs, holds, overdue CAPAs/calibrations
and top defects to the configured recipients (and Teams). To automate it, set `config.reports.schedule`.

### D3. Executive overview & PDF
**Executive** *(manager+)* shows KPIs scored Red/Amber/Green vs targets, plus action lists. Use
**📄 Print / PDF** for a one-page management summary. Targets are set in **Settings → KPI targets**.

### D4. Supplier scorecards
**Suppliers** ranks material suppliers by jobs, released, hold/reject, first-pass yield and
defect/waste kg (sourced from the Stage-1 **Supplier** field — fill it in to populate this).

---

## E. Administration

### E1. Add a user & set their stage qualifications
**Team & Access → + Add user** (manager). Set role and tick the **stages they may sign off**. The
qualified stages only bite when competency enforcement is on (see E2).

### E2. Turn on competency enforcement
**Settings → Competency control → tick the box → Save.** Now a stage sign-off is blocked unless the
signer is qualified for that stage. Administrators always bypass. Set qualifications per user first.

### E3. Set tolerances and KPI targets
**Settings → Tolerances** (COF range, registration max, barcode grade — these also drive SPC
limits) and **KPI targets** (FPY min, max open CAPAs / overdue calibrations / hold-reject for the
Executive RAG scoring).

### E4. Verify the audit trail
**Audit Trail → Verify integrity** (manager). Green = the HMAC chain is intact; red names the first
altered entry.

### E5. Issue / revoke an API key (read-only)
**Integrations → + New key** (Administrator). **Copy the key once** — it's never shown again. Apps
send it as `x-api-key: gqa_…` on GET endpoints. **Revoke** stops it immediately.

### E6. Add a webhook
**Integrations → + Add webhook** (Administrator): payload URL, optional secret (signs the body), and
the events to receive. Delivery status shows in the list.

### E7. Restore from a backup
**Settings → Restore from backup** (Administrator, JSON storage). Pick a snapshot → confirm. A
safety backup of current data is taken first. **This replaces all live data.**

---

## F. Offline use

- The app caches itself and the latest job data; you can keep inspecting offline.
- Changes made offline are **queued**; a gold **"⤿ N to sync"** badge appears top-right. They sync
  automatically when you're back online, or tap the badge to sync now.
- A queued change that the server later **rejects** (e.g., validation) is dropped with a notice —
  re-enter it.

---

## G. Troubleshooting

| Symptom | Cause & fix |
|---|---|
| **"Too many failed attempts… try again in N min"** (429) | Login lockout after repeated wrong passwords. Wait out the cool-off, or an admin can restart the app (the throttle is in-memory). |
| **"Not qualified to sign off Stage N"** (403) | Competency enforcement is on and you aren't qualified for that stage. An admin adds the stage in **Team & Access**, or an Administrator signs off. |
| **Charts are blank / "Charts need internet"** | Chart.js loads from a CDN on first use. Open the app online once; it's then cached for offline. |
| **Camera/scan doesn't work** | The camera needs **HTTPS**. Use the `https://` site (Traefik/Caddy), not plain `http://<ip>`. |
| **Microsoft 365 button just asks for an email** | Real Entra SSO isn't configured — that's demo mode. Set `sso.tenantId`/`sso.clientId` (`deploy/ENTRA-SSO-SETUP.md`). |
| **Signed in but menu is limited / no Executive/Settings** | You're a **QA Officer** (e.g., via demo SSO with an unknown e-mail). Sign in as a manager account, or have an admin set your role. |
| **Stage won't complete — "missing: …"** | Required fields aren't filled. The toast lists them; complete and retry. |
| **Stage won't complete — "Complete Stage X first"** | Stages are sequential; finish the earlier stage. |
| **Offline changes not syncing** | Check the network dot is green; tap the **sync badge**. A dropped item means the server rejected it — re-enter. |
| **Excel/CSV won't download** | Export needs to be online (it streams from the server). |

### Deployment (for IT)

| Symptom | Cause & fix |
|---|---|
| **Portainer: "Unable to retrieve stack file: Could not get the contents of the file 'docker-compose.traefik.yml'"** | Portainer's cached git clone is stale. **Pull and redeploy**; if it persists, **recreate the stack** (delete *without* removing volumes, re-add from Repository — same name reuses the data volume; keep the same `DB_PASSWORD`). |
| **New features not showing after a merge** | Portainer hasn't pulled the latest `main`. Trigger **Pull and redeploy** (GitOps polls every ~5 min). Confirm "Deployed Version" shows the new commit. |
| **App won't start in production** | `SECRET_KEY` must be ≥16 alphanumeric chars and `ADMIN_PASSWORD` must be set (first run). Check the container logs. |
| **`git ls-remote https://…/Labels-QA refs/heads/main` hangs on the host** | The host can't reach GitHub (firewall/DNS/proxy). Fix egress; Portainer can't deploy without it. |

---

## H. FAQ

**Is my data safe if the tablet loses connection mid-inspection?** Yes — it's queued locally and
syncs when you're back online.

**Can two people work the same job?** Yes, but on the same Job #; last save wins per stage. Use the
audit trail to see who changed what.

**How long are records kept?** Indefinitely in the database; set your SQF document-retention policy
and back up the `data/` folder (or PostgreSQL) regularly.

**Who can delete a job?** Only a Quality Manager or Administrator — and it's recorded in the audit
trail.

**What happened to Business Central?** The BC integration has been removed from this build. Jobs are
created manually (or scanned).

**Can I get the data into Power BI?** Yes — create a read-only **API key** (Integrations) and point
your tool at `/api/jobs`, `/api/analytics`, etc., with the `x-api-key` header.

**Does scheduling reports spam everyone?** Only the configured recipients, and only on the cadence
you set (`config.reports`); it's **off** by default.
