# Golden QA — User Manual

**GOLDEN Labels & Flexible QA — in-process inspection system**
Golden Manufacturers Pte Ltd · Quality Department

This is the day-to-day user manual: how to sign in, and how to use every screen in the
application. Companion documents:

- **[USER-TRAINING.md](USER-TRAINING.md)** — role-based training programme with hands-on exercises.
- **[KNOWLEDGE-BASE.md](KNOWLEDGE-BASE.md)** — quick how-tos, FAQ and troubleshooting.
- **[SYSTEM-GUIDE.md](SYSTEM-GUIDE.md)** — technical reference (architecture, configuration, API).

---

## 1. The basics

### 1.1 What the system does

Every label/packaging job is keyed to a single **Job #** and tracked through **four
production stages**:

| Stage | Name | Paper form it replaces |
|---|---|---|
| 1 | Printing | F-040-A / F-016-E / F-027-A (depends on the press) |
| 2 | Reel Inspection | F-021 |
| 3 | Sheeting / Slitting | PRD002 |
| 4 | Finishing & Release | F-038-A |

Typing or scanning a Job # anywhere in the app returns the complete cross-stage quality
record. Three ground rules apply everywhere:

1. **Stages complete in order** — you cannot mark Stage 3 complete before Stage 2.
2. **Required fields are enforced** — marking a stage complete checks its mandatory fields.
3. **Everything is audited** — every action is written to a tamper-evident audit trail.

### 1.2 Job status

A job's status is computed automatically from its progress:

- **New** — no stages completed yet.
- **In Progress** — one to three stages completed.
- **Released** — all four stages completed.
- **Hold / Rejected** — a Supervisor (or above) has overridden the status with the **Hold**
  button. **Clear hold** removes the override and the job returns to its automatic status.

Placing a job on hold alerts managers automatically (Teams / e-mail, if configured).

### 1.3 Installing on a tablet (PWA)

Open the site in Chrome/Edge/Safari and choose **Add to Home Screen / Install**. The app then
runs full-screen with large touch targets, and keeps working **offline** after the first load.

### 1.4 Working offline

Watch the dot in the top-right corner:

- **Green** — online; everything saves immediately.
- **Red** — offline. Keep working: stage saves are queued locally and a **"⤿ N to sync"**
  badge appears. Queued changes upload automatically when the connection returns (tap the
  badge to retry immediately). Job lists and records you have opened before are served from
  the offline cache.

Photo uploads and barcode scanning need a live connection; if an upload fails, retry once
you are back online. If a queued change is rejected by the server (for example a validation
error), a toast tells you so it isn't silently lost.

### 1.5 Signing in

Two ways to sign in:

- **Username + password** — accounts are created by a Quality Manager or Administrator in
  **Team & Access**. Repeated wrong attempts lock that login for a cool-off period.
- **Sign in with Microsoft 365** — if Microsoft Entra ID SSO is configured, this opens the
  standard Microsoft sign-in popup. If SSO isn't configured yet, the button runs a demo
  e-mail sign-in instead.

Your name and role show in the top-right; **Logout** is next to them.

### 1.6 Roles

Four roles, in increasing privilege: **QA Officer → Supervisor → Quality Manager →
Administrator**. In short:

| You can… | QA Officer | Supervisor | Quality Manager | Administrator |
|---|:--:|:--:|:--:|:--:|
| Enter data, create/clone jobs, look up records, view reports | ✅ | ✅ | ✅ | ✅ |
| Hold jobs, edit job details, manage CAPA/NCR/Equipment, Templates, Settings, Executive, Audit | – | ✅ | ✅ | ✅ |
| Manage users, delete jobs | – | – | ✅ | ✅ |
| API keys, webhooks, restore from backup | – | – | – | ✅ |

Menu items you don't have access to simply don't appear in your sidebar.

> **Competency gating (optional):** when "Enforce operator competency" is on (Settings),
> a stage can only be marked complete by someone whose account is qualified for that stage
> (set per user in Team & Access). Administrators bypass the check.

### 1.7 Finding your way around

The left sidebar is grouped into:

- **Overview** — Dashboard · Executive *(Supervisor+)*
- **Inspection** — New Job · Data Entry · Job Lookup
- **Quality** — CAPA · NCR · Equipment · SPC
- **Reports** — Reports · Suppliers
- **Settings** — Templates *(Supervisor+)* · Team & Access *(Supervisor+)* · Audit Trail
  *(Supervisor+)* · Integrations *(Administrator)* · Settings *(Supervisor+)* · My Account

On a tablet, tap the ☰ button to open the sidebar. If a banner says **"A new version is
available"**, tap **Reload** to update the app.

---

## 2. Overview screens

### 2.1 Dashboard

The home screen. Shows four counters — **Total Jobs · In Progress · Released · Hold/Reject**
— and the **Active & Recent Jobs** table with:

- **Search** (Job #, product or customer), **Status** filter and **Machine** filter.
- A four-segment **progress bar** per job (filled = stage complete).
- **Open** — jumps straight to Data Entry for that job.
- **⤓ Export CSV** — downloads the job list.

### 2.2 Executive *(Supervisor and above)*

A one-page management view. Each KPI is scored **Red / Amber / Green against the targets**
set in Settings:

- **First-pass yield** (target: minimum %)
- **Open CAPAs** (target: maximum)
- **Overdue calibrations** (target: maximum)
- **Jobs on hold / rejected** (target: maximum)

Below the KPIs are the action lists: **Overdue CAPAs**, **Overdue calibrations**,
**Calibrations due soon** (next 2 weeks) and **Jobs on hold / rejected** (tap a Job # to open
its record). **Edit targets** jumps to Settings; **📄 Print / PDF** produces a copy for a
management review.

---

## 3. Inspection — the daily workflow

### 3.1 New Job

1. Select the **Product Type** *(required)* — the list is maintained by managers in Settings.
2. Enter the **Job #** *(required)* — type it or tap **📷** to scan the barcode with the
   tablet camera.
3. Select the **Printing Press** *(required)*:
   - **Flexo 450** (form F-040-A)
   - **NilPeter** (form F-016-E)
   - **Bobst** (form F-027-A)
4. Optionally fill Product/Item Code, Customer (defaults to StarKist), Product/Item and
   Product Description.
5. Tap **Create Job & Begin Stage 1**.

> **Templates auto-fill Stage 1.** If a manager has saved a setup template matching the
> job's press and/or product type, the new job's Stage 1 arrives pre-filled with the default
> machine settings, raw materials and print-station values. The job header shows
> *"Template: <name>"* and every pre-filled value stays editable.

### 3.2 Data Entry

Open **Data Entry** and pick a job (or arrive via **Open** on the Dashboard). The job header
shows the status pill, product, press and customer, plus action buttons:

| Button | Who | What it does |
|---|---|---|
| **Summary** | everyone | Opens the consolidated record in Job Lookup |
| **Edit details** | Supervisor+ | Change customer, product, description (and the press — only until a stage has been recorded) |
| **Clone** | everyone | Creates a new job (new Job #) with the same customer/product/press and empty stages — ideal for re-runs |
| **Raise CAPA** | Supervisor+ | Opens a pre-filled CAPA form linked to this job |
| **Hold** | Supervisor+ | Places the job on hold with a reason; managers are alerted |
| **Clear hold** | Supervisor+ | Removes the hold; the job returns to its automatic status |
| **Delete** | Quality Manager+ | Permanently removes the job and all its stage data |

Below the header, the **stage bar** shows all four stages with their form numbers and a
Complete/Pending pill. Tap a stage to open its form. Every stage form ends with the same
three buttons:

- **Save Draft** — saves whatever is filled in so far; no validation.
- **Save & Mark Complete** — validates the required fields, then locks in the stage as
  complete. The previous stage must already be complete.
- **Back** — returns to the stage bar without saving.

Every stage also has a **📷 Add photo** button — use it to photograph defects, settings
plates, or anything worth evidencing. Photos appear as thumbnails and are stored with the
stage.

### 3.3 Stage 1 — Printing

Sections, top to bottom:

- **Header** — press (pre-filled), Operator, QA Officer, Production Supervisor.
- **Job Details** — Date, Job #, Product Description, **Proceed With Job** (Yes/No/N/A).
- **Material** — repeating table of raw materials: Material Type, Gauge/Thickness (µ),
  Grammage GSM, Dyne Level, **Supplier** (feeds the Supplier scorecards), Batch#.
  **+ Add raw material** for laminates with more than one substrate.
- **Print Stations** — one table per station group; the columns depend on the press:
  - *Gravure stations* (NilPeter, Bobst): Pressure Set Point, Drying Temp (°C), Ink Type,
    Ink Batch#, Blade Angle, Blade Pressure, Ink Viscosity.
  - *UV Flexo stations* (NilPeter): UV Lamp Intensity (%), Anilox Pressure, Plate Pressure,
    Anilox #, Ink Type, Ink Batch#.
  - *Flexo stations* (Flexo 450): UV Setting, Anilox #, Cylinder Teeth, Ink Type, Ink Batch#.
- **Machine Settings** — unwinder/in-feed/out-feed/rewind tensions (N), speed (mpm),
  corona treaters 1–4 (W·min/m²).
- **QC — Job Set-Up Tests** — Text Verification, Colour vs Reference, Print Registration,
  Ink Adhesion (3M tape), GS1 Barcode Verification, **COF (Film to Metal)** — this field
  shows a live **green ✓ / red ✗ flag against the configured tolerance** as you type —
  COF (Film to Film), Ink Scuffing @250 strokes/4lbs.
- **QC — Status of Approval** — Proceed/Fail sign-off by QA Officer, Operator and Supervisor.
- **QC — Job Running Quality Control Tests** — a repeating per-roll table of the same QC
  tests taken during the run (**+ Add roll** each time you sample).
- **Photos**, then Save.

**Required to mark complete:** Date, QA Officer, Proceed With Job, and at least one material
with a Material Type.

### 3.4 Stage 2 — Reel Inspection (F-021)

- **Header** — Date, Machine Name, Shift, QA Officer, Operator, AVT Report Ref.
- **⤓ Import AVT report (CSV)** — paste the AVT export and the roll rows fill themselves.
  Expected headers (any order): `Roll, TotalMeters, WasteIn, WasteOut, Defect, WeightKg`.
- **Defect & Waste Log** — one row per roll: Roll, Total m, Waste In, Waste Out, **Defect**
  (picks from the standard defect list, feeding the Pareto report), Kg, Sign.
  **+ Add row** per roll; **×** removes a row.
- **Remarks**, **Photos**, Save.

**Required to mark complete:** Date, QA Officer, and at least one roll row with data.

### 3.5 Stage 3 — Sheeting / Slitting (PRD002)

- **Job Run** — Date, Customer/Item, Start Time, Finish Time (hh:mm).
- **Infeed Roll** — Roll #, Material, Reel Size, Grammage, Cutting Repeat.
- **Quality in Process Checks** — repeating table: Time Checked, Sheet Cutting Size L×W (mm),
  Repeat Variation from Eyemark, Print Quality, Varnish Position, Barcode Verification,
  Sheet Appearance, Sheet Stack Quality, Comments.
- **Production Summary** — one row per roll: Roll #, Printing Source (BOBST / NILPETER /
  FLEXO450), Input Meters, Output Meters, # Sheets Produced, Pallet #, Comments.
  **Total Meters** and **Total Sheets** are computed automatically.
- **Production Waste Summary (kg)** — Set-up, Print Defects, Core Winding, Web Break,
  Job-change, Mechanical; **Total Setup Waste** and **Total Running Waste** compute
  automatically (these feed the waste reports).
- **Downtime Analysis** — Material, Winding, Reel Damage, Mechanical, Electrical.
- **Sign-off** — Operator, QA Officer, Production Supervisor — then Comments, Photos, Save.

**Required to mark complete:** Date, Operator, Start Time, Finish Time.

### 3.6 Stage 4 — Finishing & Release (F-038-A)

- The banner at the top tracks the **mandatory hourly checks**: it shows when the next check
  is due and turns into a red **overdue** warning past the hour.
- **Inspection & Packing Header** — Date, Product/Item, Shift, Shift Start & Finish, Label
  Width/Length (mm), Label Thickness.
- **Hourly QC Checks** — tap **+ Add hourly check (now)** each hour (the time stamps itself);
  each row records: Barcode (Correct/Incorrect), Product Code, Label Width & Height,
  Print Quality, Cutting Quality, Physical Appearance (Flat/Curl), Label Orientation in
  Bundle, Bundle Quantity, Shrink Wrap Quality (Tight/Loose), Outer Labels Verified,
  Comments.
- **Line Clearance** — Quantity On-Hold, Reason for Rejection, Disposition (Re-work / Dump),
  Unwanted Materials Removed, Next Shift QA Handover.
- **Signature** — sign in the box with a finger or stylus, then tap **Save signature**
  (✓ appears when it's on file). **Clear** restarts the signature.
- Photos, then **Save & Mark Complete**.

**Required to mark complete:** Date, at least one hourly check, and a saved signature.

When Stage 4 completes, the job's status becomes **Released** automatically — unless a hold
is in place, in which case it stays on Hold until a Supervisor clears it.

### 3.7 Job Lookup

Type or **📷 scan** a Job # and tap **Search** (or press Enter). You get the full
consolidated record: status, press, product, and all four stages with their key values,
materials, station settings, roll logs, hourly checks, photos and the signature.

- **Edit** — jumps into Data Entry for that job.
- **📄 SQF PDF** — prints the record (use "Save as PDF" in the print dialog) for SQF audits
  and customer documentation.

---

## 4. Quality screens

### 4.1 CAPA — Corrective & Preventive Actions

Everyone can view; Supervisor+ can create and edit. Filter by status or search by job,
title or owner.

**+ Raise CAPA** (or **Raise CAPA** from a job header, or promote from an NCR) opens the
form: linked Job # (optional), Severity (Low/Medium/High/Critical), Title *(required)*,
Source, Root cause, Corrective action, Preventive action, Owner and Due date.

The CAPA lifecycle is **Open → In Progress → Closed** (status is set when editing).
An overdue due date is flagged in the list and **escalates to managers automatically**.
After closing, record the **Effectiveness** check (Pending / Verified / Not effective) —
the form shows who closed and who verified, with dates.

### 4.2 NCR — Non-Conformance Reports

Everyone can view; Supervisor+ can create and edit. **+ Raise NCR** records: Job #, Date,
Description *(required)*, **Disposition** (Use as is / Rework / Reject / Return to supplier /
Scrap) and Severity. Status is Open or Closed.

**Raise CAPA** on an NCR row (or in the edit form) promotes it to a **linked CAPA** in one
tap — the NCR then shows its CAPA id, and the CAPA carries the NCR reference. An NCR can
only be promoted once.

### 4.3 Equipment & Calibration

The register of machines, anilox rolls, gauges, verifiers and scales. Each item's
calibration status is computed automatically from its last calibration date and interval:

- **OK** · **Due soon** (within 2 weeks) · **Overdue** · **Retired** · **Unscheduled**

Supervisor+ can **+ Add equipment** (name, type, asset/serial, machine, location, last
calibrated, interval in days, owner, notes) and record calibrations with **Calibrate**
(date, result: Pass / Pass (adjusted) / Fail, next interval, notes). Calibration history is
kept per item. Overdue items surface on the Executive dashboard and in the manager digest.

### 4.4 SPC — Statistical Process Control

Pick the parameter — **COF (film to metal)** or **Print registration (mm)** — to get:

- **Samples, Mean, Cp and Cpk** (Cpk is coloured green ≥ 1.33, amber ≥ 1.0, red below).
- A control chart with the mean, **±3σ control limits (UCL/LCL)** and the **spec limits**
  from the configured tolerances.
- A callout listing any **out-of-limit points** (by Job #) to investigate.

Data comes from the Stage-1 set-up tests, so the chart grows as jobs are recorded.

---

## 5. Reports

### 5.1 Reports

Live analytics computed from the inspection data. Filter by **date range** and **shift**;
**Clear filters** resets. The page shows:

- KPI tiles — Jobs, Released, Hold/Reject, **First-Pass Yield**, Open CAPAs (tap to open CAPA).
- **Quality trend** — jobs / released / hold-reject by job date.
- **Defects by type (kg)** — the Pareto of defects logged in Stage 2.
- **Waste by machine (kg)** — from the Stage-3 waste summaries.
- **Down-time analysis (hrs)** and **First-pass yield** gauges.

Buttons: **⤓ Export CSV**, **⤓ Export Excel** (multi-sheet workbook), and — for managers —
**✉ Email digest to managers** (needs SMTP or a Teams webhook configured).

> Charts need internet the first time (Chart.js loads from a CDN and is then cached).

### 5.2 Suppliers

Supplier scorecards built from the **Supplier** field on Stage-1 materials: jobs, released,
hold/reject, **FPY** (coloured ≥95% green / ≥85% amber / red) and defect & waste kg per
supplier. If the table is empty, make sure officers fill in the Supplier on Stage 1.

---

## 6. Settings screens

### 6.1 Templates *(Supervisor and above)*

Setup templates pre-fill **Stage 1** on new jobs so operators don't retype standard values.

- A template is keyed by **Printing Press** and/or **Product Type** — leave either as
  "Any" to make it a fallback. When a job is created, the **most specific matching template
  wins** (press + product beats press-only beats any/any).
- A template can hold default **Machine Settings** (tensions, speed, coronas), **Raw
  Materials** rows, and **per-station print settings** (station defaults apply only when the
  template names that exact press, since station columns differ per press).
- Values applied from a template remain fully editable on the job; the job header notes
  which template was applied.

**+ New template** to create; **Edit** / **×** to maintain. Changing the press on a template
reseeds its station rows for that press's stations.

### 6.2 Team & Access *(view Supervisor+; manage Quality Manager+)*

The user register: username, name, role and **qualified stages**.

- **+ Add user** — set User ID, Name, Role, tick the stages they are qualified to sign off,
  and set a password (min 6 characters).
- **Edit** — change name/role/qualifications; enter a password only to reset it.
- **Remove** — deletes the account (the action is audited).

Stage qualifications only block sign-offs when **competency enforcement** is turned on in
Settings; Administrators always bypass.

### 6.3 Audit Trail *(Supervisor and above)*

The last 300 actions: time, user, action, job and detail. Every entry is HMAC-chained to the
previous one, so the log is **tamper-evident**. Tap **Verify integrity** before an audit or
management review — a green banner confirms the chain is intact; a red banner names the
exact entry where tampering was detected.

### 6.4 Integrations *(Administrator)*

- **API keys** — issue **read-only** keys for BI tools (Power BI, Excel, Grafana…).
  The key is shown **once** at creation — copy it immediately. Clients send it as the
  `x-api-key` header on GET endpoints. **Revoke** kills a key instantly.
- **Webhooks** — POST signed JSON (HMAC-SHA256 signature in `X-GQA-Signature`) to your URL
  on events: `job.released`, `job.hold`, `capa.opened`, `capa.closed`,
  `equipment.calibrated`. Tick specific events or leave all unticked for everything.
- **Metrics** — Prometheus endpoint at `/metrics` for monitoring.

### 6.5 Settings *(Supervisor and above)*

- **Tolerances** — COF min/max, print-registration max (mm), barcode min grade. These drive
  the live pass/fail flags in Stage 1 and the SPC spec limits.
- **KPI targets** — the thresholds behind the Executive dashboard's Red/Amber/Green scoring.
- **Competency control** — the enforcement toggle for stage-qualification gating.
- **Product types** — the list (one per line) shown in New Job's Product Type dropdown.
- **Defect types** — the comma-separated defect picklist used in Stage 2.
- **Backups & storage** — shows the storage driver, the latest backup's name/age/size and
  the backup directory. Automatic rotating snapshots run on a timer.
- **Restore from backup** *(Administrator, JSON storage only)* — replaces the live database
  with a chosen snapshot. A safety backup of the current data is taken automatically first.

### 6.6 My Account

Your profile (name, username, role) and **Change password** (current + new, min 6
characters). If you sign in with Microsoft 365, manage your password in your Microsoft
account instead. **Sign out** is at the bottom.

---

## 7. Tips & troubleshooting

| Symptom | What to do |
|---|---|
| "Complete Stage N before marking…" | Stages must be completed in order — finish the earlier stage first. |
| "Can't complete — missing: …" | The toast lists exactly which required fields are empty. |
| "Not qualified to sign off stage N" | Competency enforcement is on and your account lacks that stage — ask a manager to update your qualifications in Team & Access. |
| Red dot / "⤿ N to sync" badge | You're offline. Keep working; changes sync automatically when the network returns. |
| Charts don't draw | The first chart load needs internet (Chart.js from CDN); afterwards it's cached offline. |
| Camera scan does nothing | Barcode scanning needs a browser with BarcodeDetector support and HTTPS (or localhost); type the Job # manually if unavailable. |
| "Session expired" | Sign in again — your queued offline changes are preserved. |
| Login locked | Too many wrong passwords; wait for the cool-off window, then try again. |
| A new version banner appears | Tap **Reload** to update the app. |

---

*Golden Manufacturers Pte Ltd — built with Ateet Roshan (Quality Manager) & Sameer Mohammed Taki (AI Engineer).*
