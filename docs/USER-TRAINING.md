# Golden QA — User Training Guide

A role-based training programme for the Starkist label QA system. Pair this with the
[KNOWLEDGE-BASE.md](KNOWLEDGE-BASE.md) (quick how-tos) and [SYSTEM-GUIDE.md](SYSTEM-GUIDE.md)
(full reference). Suggested format: a 30–45 min hands-on session per role using a **training Job #**
(prefix real practice jobs with `TRN-` so they're easy to spot and remove).

---

## 0. Before you start (everyone)

**Learning outcomes:** sign in, navigate the app, and understand your role's responsibilities.

1. **Install the app** — open the site in your browser → **Add to Home Screen / Install**.
2. **Sign in** — username + password, or **Sign in with Microsoft 365**.
3. **Orient yourself** — the left sidebar groups everything: **Overview · Inspection · Quality ·
   Reports · Settings**. The top-right shows your name/role, the online dot, and Logout.
4. **The golden rule:** everything is keyed to a **Job #**, tracked through **4 stages**, and every
   action is logged in a tamper-evident **audit trail**. Work carefully and honestly.

**Connectivity:** green dot = online. If it goes red, keep working — your entries queue and a
**"⤿ N to sync"** badge appears; they upload automatically when you reconnect.

---

## 1. QA Officer — *the inspector* (core training)

You capture inspection data on the floor. Daily flow: **create or open a job → complete each stage
→ photograph defects → sign off Stage 4**.

### 1.1 Create a job
**New Job →** select the **Printing Machine**, **scan (📷)** or type the **Job #**, confirm
customer/product → **Create Job & Begin Stage 1**.

### 1.2 Stage 1 — Printing
Fill Job Details, Material, Print Stations, Machine Settings, QC Inspection. Watch the **COF** and
**Print Registration** fields — they show a green ✓ or red ✗ against tolerance as you type.
Add photos of any defect. **Save Draft** anytime; **Save & Mark Complete** when done.

### 1.3 Stage 2 — Reel Inspection
Add a row per roll (meters, waste in/out, defect, weight, sign). If you have an **AVT report**, use
**⤓ Import AVT report (CSV)** to fill rows automatically. Complete when ≥1 roll is logged.

### 1.4 Stage 3 — Sheeting / Slitting
Record rolls produced, random quality checks, and down-time hours. Complete with the required
fields (date, operator, start/finish).

### 1.5 Stage 4 — Finishing & Release
- Add an **hourly check** each hour — the warning banner tells you when the next is due.
- Log any rejections, **sign** on the canvas (**Save signature**), and set the **Final Release
  Decision** (Released / Hold / Rejected).
- A decision of **Hold/Rejected** alerts the managers automatically.

### 1.6 Look up a record
**Job Lookup →** scan/type the Job # → **Search** → review all four stages → **📄 SQF PDF** to print.

> **Exercise (QA Officer):** create `TRN-101`, complete Stages 1–3 with sample data and one defect
> photo, then complete Stage 4 with two hourly checks, a signature, and a **Released** decision.
> Finally, look it up and print the SQF PDF.

**Checklist**
- [ ] I can create a job and scan a Job #.
- [ ] I can complete all four stages and read the tolerance auto-flags.
- [ ] I can add a photo and capture a signature.
- [ ] I understand stages must be completed in order.
- [ ] I can look up a job and print its SQF record.

---

## 2. Supervisor — *line quality control*

Everything a QA Officer does, **plus** managing exceptions and quality events.

### 2.1 Hold / edit / clone a job
Open a job in **Data Entry**; the header gives you **Edit details**, **Clone**, and **Hold** (with a
reason — this alerts managers). Use **Clone** to start a re-run job with the same setup.

### 2.2 Raise an NCR
**NCR → + Raise NCR** when an inspection finds a nonconformance: job, description, **disposition**
(use-as-is / rework / reject / return / scrap) and severity.

### 2.3 Raise / progress a CAPA
**CAPA → + Raise CAPA** (or **Raise CAPA** from a held job, or **promote an NCR**). Fill root cause
and corrective/preventive actions, set an **owner** and **due date**, and move it through
**Open → In Progress → Closed**. Overdue CAPAs escalate to managers automatically.

### 2.4 Equipment & calibration
**Equipment → + Add equipment** for gauges/anilox/verifiers; record calibrations with **Calibrate**.
Keep everything **OK** — overdue items show on the Executive dashboard and in the digest.

> **Exercise (Supervisor):** place `TRN-101` on **Hold** with a reason, raise an **NCR** for it,
> **promote** that NCR to a **CAPA**, assign yourself as owner with a due date, then record a
> calibration on a gauge in the Equipment register.

**Checklist**
- [ ] I can place a job on hold and edit/clone jobs.
- [ ] I can raise an NCR and promote it to a CAPA.
- [ ] I can own and progress a CAPA to closure.
- [ ] I can add equipment and record calibrations.

---

## 3. Quality Manager — *oversight & improvement*

Everything a Supervisor does, **plus** the management view, analytics, and people.

### 3.1 Executive dashboard
**Executive** shows **Red/Amber/Green** KPIs vs targets (first-pass yield, open CAPAs, overdue
calibrations, hold/reject) and action lists. Start your day here; use **📄 Print / PDF** for reviews.

### 3.2 Reports, trends & SPC
- **Reports** — filter by **date range / shift**; read the defect Pareto, waste, down-time, FPY and
  the **quality trend**. **Export CSV/Excel** or **e-mail the digest** to managers.
- **SPC** — check **Cp/Cpk** and control charts for COF and registration; investigate out-of-limit
  points.
- **Suppliers** — compare suppliers by FPY and defect/waste (ensure officers fill the Stage-1
  **Supplier** field).

### 3.3 People & qualifications
**Team & Access** — add users, set roles, and tick each person's **qualified stages**. Delete jobs
if necessary (recorded in the audit trail).

### 3.4 Verify the audit trail
**Audit Trail → Verify integrity** before audits/reviews to prove the log hasn't been altered.

> **Exercise (Quality Manager):** set KPI targets in Settings, open the **Executive** dashboard and
> note any red items, run an **SPC** chart for COF, email the **digest**, then verify the **audit
> trail** integrity.

**Checklist**
- [ ] I can read the Executive RAG dashboard and act on red items.
- [ ] I can filter Reports and interpret SPC Cp/Cpk.
- [ ] I can manage users and assign stage qualifications.
- [ ] I can verify audit-trail integrity.

---

## 4. Administrator — *system owner*

Everything above, **plus** configuration, integrations, and recovery.

### 4.1 Settings
- **Tolerances** — COF range, registration max, barcode grade (also drive SPC limits).
- **KPI targets** — thresholds for the Executive RAG scoring.
- **Competency control** — turn on to **block stage sign-off unless the signer is qualified**
  (set qualifications per user first; Administrators bypass).
- **Defect types** — maintain the defect picklist.

### 4.2 Integrations
- **API keys** — issue **read-only** keys for BI tools (copy once; revoke anytime).
- **Webhooks** — POST signed events (`job.released`, `job.hold`, `capa.opened`, `capa.closed`,
  `equipment.calibrated`) to other systems.
- **Metrics** — Prometheus at `/metrics` (set `METRICS_TOKEN` to require a token).

### 4.3 Backups & restore
Confirm rotating backups are running (Settings → Backups & storage). To recover, use **Restore from
backup** (takes a safety snapshot first, then replaces all data). Always copy backups **off the box**.

### 4.4 Security hygiene
- Change all **default passwords**; set a strong `SECRET_KEY` and `ADMIN_PASSWORD` (env).
- Keep the app behind **HTTPS**.
- Configure **Microsoft Entra ID SSO** (`deploy/ENTRA-SSO-SETUP.md`) for real Microsoft logins.
- Review the **login-lockout** thresholds (`config.security`).

> **Exercise (Administrator):** create a test user with only Stage 1 & 2 qualified, turn on
> competency enforcement, confirm they're blocked on Stage 3, issue a read-only API key and fetch
> `/api/jobs` with it, then disable enforcement and revoke the key.

**Checklist**
- [ ] I can configure tolerances, targets and the defect list.
- [ ] I can enforce competency and manage qualifications.
- [ ] I can issue/revoke API keys and add webhooks.
- [ ] I can run and restore backups.
- [ ] I understand the security checklist (HTTPS, secrets, SSO, lockout).

---

## 5. Quick reference card (print this)

**Sign in:** username + password, or *Sign in with Microsoft 365*. · **Logout:** top-right.
**Online?** green dot = online; red = offline (work continues, syncs later — watch the **⤿ sync** badge).

| I want to… | Go to |
|---|---|
| Start a job | **New Job** |
| Enter/complete stages | **Data Entry** → job → stage tile → *Save & Mark Complete* |
| Add a defect photo | 📷 **Add photo** in any stage |
| Sign off & release | **Stage 4** → hourly checks → *Line Clearance* → sign (job releases when all 4 stages complete) |
| Find a job's full record | **Job Lookup** → scan/type → *SQF PDF* |
| Log a quality event | **NCR** (→ promote to **CAPA**) |
| Track corrective action | **CAPA** |
| Log/calibrate a gauge | **Equipment** → *Calibrate* |
| Check process capability | **SPC** |
| See KPIs vs targets | **Executive** *(manager)* |
| Filter & export data | **Reports** → CSV / Excel |
| Manage people | **Team & Access** *(manager)* |
| Prove the log is intact | **Audit Trail → Verify integrity** *(manager)* |

**Remember:** complete stages **in order**; fill **required fields**; **photograph** defects;
**hourly checks** in Stage 4 are mandatory; everything you do is **audited**.

---

*Questions or training requests → Quality Manager (Ateet Roshan). System/setup → Administrator.*
