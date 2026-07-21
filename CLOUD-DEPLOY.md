# Cloud deployment — Vercel + Supabase + Clerk

This is the **cloud** deployment of Golden QA: the same application code that runs on-prem
(`server.js`), adapted to run as a **Vercel serverless function** with **Supabase Postgres +
Storage** and **Clerk** sign-in. The on-prem/container path (Docker, LDAP, local disk) still works
unchanged — see [DEPLOYMENT.md](DEPLOYMENT.md) / [CONTAINER-DEPLOY.md](CONTAINER-DEPLOY.md).

> **⚠️ Clerk is currently disabled.** The app signs in with **local accounts** (username +
> password) — plus Active Directory if you configure it. Clerk stays off even when the
> `CLERK_*` keys are present; to turn it back on later set **`CLERK_ENABLED=true`**. The rest of
> this document describes the full Clerk setup for when you re-enable it.

```
 Tablet / browser ──HTTPS──▶ Vercel (static PWA + /api/* serverless function)
                                   │
              Clerk (sign-in) ◀────┤  identity only; roles live in-app, matched by e-mail
                                   │
       Supabase Postgres ◀─────────┤  system of record (single JSON document in app_state)
       Supabase Storage  ◀─────────┘  photos & signatures (qa-uploads bucket)
       Vercel Cron ───────────────▶ GET /api/cron  (CAPA SLA, reminders, scheduled digest)
```

## What changed from the on-prem build

| Concern | On-prem | Cloud |
|---|---|---|
| Process | long-running `node server.js` | `server.js` handler exported through `api/index.js`; `vercel.json` rewrites all routes to it |
| Auth | local scrypt + AD/LDAP + Entra | **Local accounts** (username + password, scrypt) — same as on-prem; AD/LDAP still optional. *Clerk is available but off by default:* set `CLERK_ENABLED=true` to have the browser sign in with Clerk, post its session token to `POST /api/login {mode:"clerk"}`, and match the e-mail to a user record. **Roles always stay in-app** (Admin → Users). |
| Database | Postgres or JSON file | **Supabase Postgres**, same single-`jsonb`-document model (`app_state`) |
| Write safety | one process = one writer | serverless has many workers, so each mutating request holds a **Postgres advisory lock** and reloads the document fresh — no lost updates |
| Uploads | local disk `data/uploads` | **Supabase Storage** (`qa-uploads`, public-read); the endpoint returns the public URL |
| Hourly jobs | 3 `setInterval` timers | **Vercel Cron** → `GET /api/cron` (hourly) |
| Backups | file rotation timer | **Supabase** automatic backups / PITR (the in-app file backup/restore is disabled on Postgres) |

## Prerequisites

- A **Vercel** account/team.
- A **Supabase** project (this deploy reuses the existing `fibre-mold-plant` project; the app's
  data lives in its own `app_state` table + `qa-uploads` bucket, isolated from that app's tables).
- A **Clerk** application (create it at <https://dashboard.clerk.com>).

## 1. Supabase (already provisioned)

Created for you in the shared project:
- `public.app_state` — the single-document store (RLS enabled; only the direct `postgres`
  connection can touch it).
- `qa-uploads` — a public-read Storage bucket for photos/signatures.

You provide two values from the Supabase dashboard:
- **`DATABASE_URL`** — Project → Settings → Database → *Connection string* → **Session pooler**
  (port **5432**). Replace `[YOUR-PASSWORD]` with the database password. Session mode is required:
  the write-serialising advisory lock needs a client pinned to one backend.
- **`SUPABASE_SERVICE_ROLE_KEY`** — Project → Settings → API → **service_role** secret (used
  server-side to upload to Storage; never shipped to the browser).

`SUPABASE_URL` is `https://gtcdopsaxvywakdbtrvv.supabase.co`.

## 2. Clerk

1. Create an application in the Clerk dashboard; enable the sign-in methods you want (e-mail
   code, Google, Microsoft, etc.).
2. Copy the **Publishable key** (`pk_…`) and **Secret key** (`sk_…`) from **API Keys**.
3. Add your Vercel domain(s) under Clerk → **Domains** (production) so Clerk.js loads there.
4. Create a user for each staff member (or let them self-serve if you enable sign-up), then in
   the app go to **Admin → Users** and add each person's e-mail with the right role and stage
   competencies. Sign-in matches Clerk → app user **by e-mail**.

## 3. Environment variables (Vercel → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **session pooler** URI (port 5432), password filled in |
| `SUPABASE_URL` | `https://gtcdopsaxvywakdbtrvv.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role secret |
| `SUPABASE_STORAGE_BUCKET` | `qa-uploads` |
| `CLERK_ENABLED` | *omit / `false`* — Clerk is **off**; set `true` only to re-enable Clerk sign-in |
| `CLERK_PUBLISHABLE_KEY` | `pk_…` *(only needed when `CLERK_ENABLED=true`)* |
| `CLERK_SECRET_KEY` | `sk_…` *(only needed when `CLERK_ENABLED=true`)* |
| `CLERK_ALLOWED_DOMAIN` | `golden.com.fj` *(optional e-mail allow-list, Clerk only)* |
| `SECRET_KEY` | 48-byte random (signs session tokens + the audit chain) |
| `ADMIN_USERNAME` | `admin` (the local sign-in username) |
| `ADMIN_PASSWORD` | strong password (**the** local admin login) |
| `ADMIN_EMAIL` | optional; the e-mail matched to the seed admin if Clerk is re-enabled |
| `CRON_SECRET` | 48-byte random (authenticates Vercel Cron → `/api/cron`) |

Generate secrets with: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

## 4. Deploy

Import the repo in Vercel (framework preset: **Other** — no build step). `vercel.json` wires the
function, the SPA/route rewrites, and the hourly cron. Push to the deployment branch and Vercel
builds automatically.

> **Vercel Cron & plan:** the hourly `0 * * * *` schedule in `vercel.json` needs a **Pro** plan.
> On **Hobby**, cron runs at most **once per day** — change the schedule to e.g. `0 20 * * *`
> (08:00 Fiji), or hit `GET /api/cron` with `Authorization: Bearer $CRON_SECRET` from an external
> scheduler (cron-job.org) for hourly reminders.

## 5. First sign-in

With Clerk off (the default), the sign-in screen shows the **local username + password** form:

1. Open the Vercel URL → sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
2. Add the rest of your team under **Admin → Users** (username + password + role + stage
   competencies). Existing accounts already in the database stay exactly as they were.

*If you re-enable Clerk (`CLERK_ENABLED=true`):* the Clerk sign-in card appears instead; sign in
with the account whose e-mail equals `ADMIN_EMAIL`, and the local username/password form stays
available as a break-glass admin behind the **Administrator sign-in** link.

## Known limits of the lift-and-adapt

- **Write throughput** — the whole database is one JSON document and writes are globally
  serialised by the advisory lock. Correct and safe for a plant's tablet fleet (writes are
  short); it is not built for hundreds of concurrent writers. Growing past that calls for the
  relational rewrite (decompose `app_state` into real tables + RLS).
- **Document size** — each request loads the whole document; keep an eye on it as `audit`
  history grows (capped at `AUDIT_MAX`, default 20000). Export/prune audit history periodically.
- **Request body ≤ ~4.5 MB** — Vercel's limit; large photos should be captured at a reasonable
  resolution (the app sends them as base64 through `/api/upload`).
- **Migrating existing on-prem data** — copy the on-prem document into `app_state`
  (`INSERT INTO app_state (id, doc) VALUES (1, '<db.json contents>'::jsonb)`). Old photo
  references (`/uploads/…`) won't resolve in the cloud unless those files are also uploaded to
  the `qa-uploads` bucket.
