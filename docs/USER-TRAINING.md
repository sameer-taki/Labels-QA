# Golden QA — User Training Guide

A role-based training programme for the GOLDEN Labels & Flexible QA system. Pair this with
the **[USER-MANUAL.md](USER-MANUAL.md)** (screen-by-screen manual), the
[KNOWLEDGE-BASE.md](KNOWLEDGE-BASE.md) (quick how-tos) and the
[SYSTEM-GUIDE.md](SYSTEM-GUIDE.md) (technical reference).

**Suggested format:** a 30–45 min hands-on session per role, in order — each role builds on
the previous one. Use a **training Job #** (prefix practice jobs with `TRN-` so they are easy
to spot and delete afterwards).

---

## 0. Before you start (everyone)

**Learning outcomes:** sign in, navigate the app, and understand your role's responsibilities.

1. **Install the app** — open the site on your tablet → **Add to Home Screen / Install**.
2. **Sign in** — username + password, or **Sign in with Microsoft 365**.
3. **Orient yourself** — the left sidebar groups everything: **Overview · Inspection ·
   Quality · Reports · Settings**. The top-right shows your name/role, the online dot, and
   Logout. Items your role can't use don't appear.
4. **The golden rule:** everything is keyed to a **Job #**, tracked through **4 stages
   completed in order**, and every action lands in a tamper-evident **audit trail**. Work
   carefully and honestly.

**Connectivity:** green dot = online. If it goes red, keep working — your entries queue and a
**"⤿ N to sync"** badge appears; they upload automatically when you reconnect.

**The three presses:** every job is created against one printing press — **Flexo 450**
(F-040-A), **NilPeter** (F-016-E) or **Bobst** (F-027-A). The press decides which
print-station tables Stage 1 shows.

---

## 1. QA Officer — *the inspector* (core training)

You capture inspection data on the floor. Daily flow: **create or open a job → complete each
stage → photograph defects → sign off Stage 4**.

### 1.1 Create a job
**New Job →** select the **Product Type**, **scan (📷)** or type the **Job #**, pick the
**Printing Press**, confirm customer/product → **Create Job & Begin Stage 1**.

> If Stage 1 arrives pre-filled, a manager's **setup template** matched this press/product —
> the header shows *"Template: …"*. Check the values against the actual setup and correct
> anything that differs; nothing is locked.

### 1.2 Stage 1 — Printing
Fill Job Details, Material (one row per substrate — **always fill the Supplier**, it feeds
the supplier scorecards), Print Stations, Machine Settings, and the QC set-up tests. Watch
**COF (Film to Metal)** — it flags green ✓ / red ✗ against tolerance as you type. Record the
three-way **Status of Approval**, then add a **running QC test row per roll sampled** during
the run. Photograph any defect. **Save Draft** anytime; **Save & Mark Complete** when done
(needs Date, QA Officer, Proceed, and ≥1 material).

### 1.3 Stage 2 — Reel Inspection
Add a row per roll (meters, waste in/out, defect from the standard list, weight, sign). If
you have an **AVT report**, use **⤓ Import AVT report (CSV)** to fill the rows automatically.
Complete needs Date, QA Officer and ≥1 roll row.

### 1.4 Stage 3 — Sheeting / Slitting
Record the job run (start/finish times), infeed roll, in-process quality checks, the
**Production Summary** per roll (totals compute automatically), the **waste summary** and
**down-time** breakdown, then sign off. Complete needs Date, Operator, Start and Finish times.

### 1.5 Stage 4 — Finishing & Release
- Tap **+ Add hourly check (now)** each hour — the banner counts down and turns red when a
  check is overdue.
- Fill the Line Clearance section, **sign on the canvas** and tap **Save signature**.
- **Save & Mark Complete** (needs Date, ≥1 hourly check, and the signature). When Stage 4
  completes, the job is automatically **Released** — unless it is on hold.

### 1.6 Look up a record
**Job Lookup →** scan/type the Job # → **Search** → review all four stages → **📄 SQF PDF**
to print.

> **Exercise (QA Officer):** create `TRN-101` on the Bobst press, complete Stages 1–3 with
> sample data and one defect photo, then complete Stage 4 with two hourly checks and a
> signature. Confirm the job shows **Released**, look it up and print the SQF PDF.

**Checklist**
- [ ] I can create a job, pick the press and scan a Job #.
- [ ] I know what a pre-filled template looks like and that I must verify its values.
- [ ] I can complete all four stages and read the tolerance auto-flags.
- [ ] I can add a photo and capture a signature.
- [ ] I understand stages must be completed in order and what each stage requires.
- [ ] I can look up a job and print its SQF record.

---

## 2. Supervisor — *line quality control*

Everything a QA Officer does, **plus** managing exceptions, quality events and setup
templates.

### 2.1 Hold / clear / edit / clone a job
Open a job in **Data Entry**; the header gives you **Edit details**, **Clone**, **Hold**
(with a reason — this alerts managers) and — while a job is held — **Clear hold**, which
returns it to its automatic status. Use **Clone** to start a re-run with the same setup.

### 2.2 Raise an NCR
**NCR → + Raise NCR** when an inspection finds a nonconformance: job, description,
**disposition** (use-as-is / rework / reject / return to supplier / scrap) and severity.

### 2.3 Raise / progress a CAPA
**CAPA → + Raise CAPA** (or **Raise CAPA** from a job header, or **promote an NCR**). Fill
root cause and corrective/preventive actions, set an **owner** and **due date**, and move it
through **Open → In Progress → Closed**. Overdue CAPAs escalate to managers automatically;
after closure, record the **effectiveness verification**.

### 2.4 Equipment & calibration
**Equipment → + Add equipment** for gauges/anilox/verifiers; record calibrations with
**Calibrate**. Keep everything **OK** — overdue items show on the Executive dashboard and in
the digest.

### 2.5 Setup templates
**Templates → + New template.** Key it by press and/or product type (leave "Any" for a
fallback — the most specific match wins on job creation), then set default machine settings,
raw materials and per-station values. New jobs matching the keys get Stage 1 pre-filled.

> **Exercise (Supervisor):** place `TRN-101` on **Hold** with a reason, raise an **NCR** for
> it, **promote** the NCR to a **CAPA** with yourself as owner and a due date, **clear the
> hold**, record a calibration on a gauge, then build a template for the Bobst press and
> create `TRN-102` to watch it auto-fill.

**Checklist**
- [ ] I can place a job on hold, clear a hold, and edit/clone jobs.
- [ ] I can raise an NCR and promote it to a CAPA.
- [ ] I can own and progress a CAPA to closure and effectiveness check.
- [ ] I can add equipment and record calibrations.
- [ ] I can build a setup template and verify it auto-fills a new job.

---

## 3. Quality Manager — *oversight & improvement*

Everything a Supervisor does, **plus** the management view, analytics, and people.

### 3.1 Executive dashboard
**Executive** scores the KPIs **Red/Amber/Green** against your targets (first-pass yield,
open CAPAs, overdue calibrations, hold/reject) and lists what needs action. Start your day
here; use **📄 Print / PDF** for reviews.

### 3.2 Reports, trends & SPC
- **Reports** — filter by **date range / shift**; read the defect Pareto, waste, down-time,
  FPY and the **quality trend**. **Export CSV/Excel** or **✉ e-mail the digest** to managers.
- **SPC** — check **Cp/Cpk** and the control chart for COF and registration; investigate any
  out-of-limit points it names.
- **Suppliers** — compare suppliers by FPY and defect/waste kg (make sure officers fill the
  Stage-1 **Supplier** field).

### 3.3 People & qualifications
**Team & Access** — add users, set roles, and tick each person's **qualified stages**.
Delete jobs when necessary (it is recorded in the audit trail).

### 3.4 Verify the audit trail
**Audit Trail → Verify integrity** before audits/reviews to prove the log hasn't been
altered.

> **Exercise (Quality Manager):** set the KPI targets in Settings, open **Executive** and
> note any red items, run an **SPC** chart for COF, e-mail the **digest**, add a test user
> qualified for Stages 1–2 only, then verify the **audit trail** integrity.

**Checklist**
- [ ] I can read the Executive RAG dashboard and act on red items.
- [ ] I can filter Reports and interpret SPC Cp/Cpk.
- [ ] I can manage users and assign stage qualifications.
- [ ] I can verify audit-trail integrity.

---

## 4. Administrator — *system owner*

Everything above, **plus** configuration, integrations, and recovery.

### 4.1 Settings
- **Tolerances** — COF range, registration max, barcode grade (also drive the SPC limits).
- **KPI targets** — thresholds for the Executive RAG scoring.
- **Competency control** — turn on to **block a stage sign-off unless the signer is
  qualified** (set qualifications per user first; Administrators bypass).
- **Product types** — the New Job dropdown, one per line.
- **Defect types** — the Stage-2 defect picklist.

### 4.2 Integrations
- **API keys** — issue **read-only** keys for BI tools (copy at creation — shown once;
  revoke anytime).
- **Webhooks** — POST signed events (`job.released`, `job.hold`, `capa.opened`,
  `capa.closed`, `equipment.calibrated`) to other systems.
- **Metrics** — Prometheus at `/metrics` (set `METRICS_TOKEN` to require a token).

### 4.3 Backups & restore
Confirm rotating backups are running (Settings → Backups & storage). To recover, use
**Restore from backup** — it takes a safety snapshot first, then replaces all data. Always
copy backups **off the box**.

### 4.4 Security hygiene
- Change all **default passwords**; set a strong `SECRET_KEY` and `ADMIN_PASSWORD` (env).
- Keep the app behind **HTTPS**.
- Configure **Microsoft Entra ID SSO** (`deploy/ENTRA-SSO-SETUP.md`) for real Microsoft
  logins.
- Review the **login-lockout** thresholds (`config.security`).

> **Exercise (Administrator):** turn on competency enforcement and confirm the Stage-1–2
> test user is blocked on Stage 3, issue a read-only API key and fetch `/api/jobs` with it,
> add a product type and see it appear in New Job, then disable enforcement, revoke the key
> and delete the `TRN-` jobs.

**Checklist**
- [ ] I can configure tolerances, targets, product types and the defect list.
- [ ] I can enforce competency and manage qualifications.
- [ ] I can issue/revoke API keys and add webhooks.
- [ ] I can run and restore backups.
- [ ] I understand the security checklist (HTTPS, secrets, SSO, lockout).

---

## 5. Quick reference card (print this)

**Sign in:** username + password, or *Sign in with Microsoft 365*. · **Logout:** top-right.
**Online?** green dot = online; red = offline (keep working, it syncs later — watch the
**⤿ sync** badge).

| I want to… | Go to |
|---|---|
| Start a job | **New Job** (product type + Job # + press) |
| Enter/complete stages | **Data Entry** → job → stage tile → *Save & Mark Complete* |
| Add a defect photo | 📷 **Add photo** in any stage |
| Sign off & release | **Stage 4** → hourly checks → line clearance → sign → complete |
| Put a job on / off hold | Job header → **Hold** / **Clear hold** *(Supervisor+)* |
| Find a job's full record | **Job Lookup** → scan/type → *SQF PDF* |
| Log a quality event | **NCR** (→ promote to **CAPA**) *(Supervisor+)* |
| Track corrective action | **CAPA** |
| Log/calibrate a gauge | **Equipment** → *Calibrate* *(Supervisor+)* |
| Pre-fill Stage 1 setups | **Templates** *(Supervisor+)* |
| Check process capability | **SPC** |
| See KPIs vs targets | **Executive** *(Supervisor+)* |
| Filter & export data | **Reports** → CSV / Excel |
| Manage people | **Team & Access** *(Quality Manager+)* |
| Prove the log is intact | **Audit Trail → Verify integrity** *(Supervisor+)* |

**Remember:** complete stages **in order**; fill **required fields**; **photograph** defects;
**hourly checks** in Stage 4 are mandatory; a job **releases automatically** when all four
stages are complete; everything you do is **audited**.

---

*Questions or training requests → Quality Manager (Ateet Roshan). System/setup → Administrator.*
