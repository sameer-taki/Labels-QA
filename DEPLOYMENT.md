# Golden QA — On-Prem Deployment Guide

Operator guide for installing, running, securing, and maintaining the Golden QA
inspection server on a plant/on-premise host. The app is pure Node.js with **zero
external dependencies** — there is nothing to `npm install`.

> Cross-references the project [`README.md`](README.md):
> - README §1 *Quick start* — fastest path to a running server.
> - README §4 *Configuration* — every `config.json` key.
> - README §6 *Data, backup & database* — what to back up and the DB swap path.
> - README §7 *Production hardening checklist* — go-live sign-off list.
>
> Ready-made files referenced below live in [`deploy/`](deploy/):
> `install-windows-service.ps1`, `Caddyfile`, `nginx.conf.sample`, `golden-qa.service`.

---

## 0. At a glance

| Item | Value |
|------|-------|
| Runtime | Node.js **18+** (built-ins only; no packages) |
| Entry point | `server.js` |
| Default listen | `0.0.0.0:3000` (from `config.json`; override with env `PORT`) |
| System of record | `data/db.json` + `data/uploads/` |
| Backups (this guide's convention) | `data/backups/` |
| Health check | `GET /api/health` → `{ ok, org, time }` |

The server reads its port from `process.env.PORT` first, then `config.json`'s
`port`; the bind address always comes from `config.json`'s `host`. Reverse proxies
below assume the app listens on `127.0.0.1:3000` / `localhost:3000`.

---

## 1. Prerequisites

### 1.1 Install Node.js 18+ (Windows Server)
1. Download the **Windows x64 LTS MSI** from <https://nodejs.org> (18 LTS or newer).
2. Run the installer with defaults; keep **"Add to PATH"** checked.
3. Open a **new** PowerShell window and confirm:
   ```powershell
   node -v    # v18.x or newer
   ```
   If `node` is not recognised, the PATH change needs a new shell (or reboot).

> Offline server? Download the MSI on a connected PC and copy it across — the
> installer itself is self-contained.

### 1.2 Install Node.js 18+ (Linux)
Use your distro's package or NodeSource. Example (Debian/Ubuntu, NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
```

---

## 2. Copy the app onto the server

Copy the entire `Golden-QA-App` folder to a stable location:

- **Windows:** `C:\apps\Golden-QA-App`
- **Linux:** `/opt/golden-qa`

Keep the folder layout intact — `server.js`, `config.json`, `public/`,
`integrations/`, and `data/` must stay siblings. The `data/` folder is the system
of record (README §6); preserve it across upgrades.

> The repo `.gitignore` excludes `data/db.json` and `data/uploads/` — they are
> **not** in version control by design. When you copy the app for an upgrade,
> copy code but **leave the existing `data/` in place** (see §9).

---

## 3. First run (foreground smoke test)

From a terminal in the app folder:
```bash
node server.js
```
You should see:
```
Golden QA server on http://0.0.0.0:3000  (Golden Manufacturers Pte Ltd)
```
On first start the server creates `data/uploads/` and seeds `data/db.json` with the
default users (README §1). Test from the same host:

- **Windows PowerShell:** `Invoke-RestMethod http://localhost:3000/api/health`
- **Linux/macOS:** `curl http://localhost:3000/api/health`

Expected: `{ "ok": true, "org": "...", "time": "..." }`.

Then open `http://<server-ip>:3000` from a tablet on the same network (README §1–2).
Press `Ctrl+C` to stop; the next sections make it run as a managed service.

> **Change the default passwords before go-live** (README §7). The seeded logins are
> admin/admin123, ateet/ateet123, rprasad/prasad123, akumar/kumar123, pdevi/devi123.

---

## 4. Network & firewall

The app listens on TCP **3000** on all interfaces by default. Open it so tablets
can reach the server (or, if you use a reverse proxy per §7, open **443** instead
and keep 3000 bound to localhost).

**Windows Server — open TCP 3000 inbound:**
```powershell
New-NetFirewallRule -DisplayName "Golden QA (HTTP 3000)" -Direction Inbound `
  -Protocol TCP -LocalPort 3000 -Action Allow -Profile Domain,Private
```

**Linux (firewalld):**
```bash
sudo firewall-cmd --permanent --add-port=3000/tcp && sudo firewall-cmd --reload
```
**Linux (ufw):**
```bash
sudo ufw allow 3000/tcp
```

To change the port, set the `PORT` env var for the service, or edit `port` in
`config.json` (README §4), then reopen the matching firewall port.

> **Recommended:** put the app behind HTTPS (§7) and expose only 443 to tablets.
> The camera and PWA install only work reliably over HTTPS (README §7).

---

## 5. Run as a Windows service

Two options. **(a) NSSM** is recommended — it gives a true auto-restarting Windows
service. **(b) Scheduled Task** is the native, no-extra-tools fallback.

The helper script [`deploy/install-windows-service.ps1`](deploy/install-windows-service.ps1)
does **both**: it uses NSSM if present, otherwise registers a SYSTEM scheduled task.
Run it from an **elevated** PowerShell 5.1 prompt:
```powershell
powershell -ExecutionPolicy Bypass -File C:\apps\Golden-QA-App\deploy\install-windows-service.ps1 `
  -AppPath "C:\apps\Golden-QA-App" -Port 3000
```
Uninstall: re-run the same script with `-Uninstall`.

### 5a. NSSM (recommended) — exact commands
1. Download NSSM from <https://nssm.cc/download>, unzip, and copy the **win64**
   `nssm.exe` to e.g. `C:\tools\nssm\nssm.exe` (optionally add it to PATH).
2. Install the service (run elevated). `server.js` is the argument to node:
   ```powershell
   $node = (Get-Command node.exe).Source
   C:\tools\nssm\nssm.exe install GoldenQA "$node" "server.js"
   C:\tools\nssm\nssm.exe set GoldenQA AppDirectory "C:\apps\Golden-QA-App"
   C:\tools\nssm\nssm.exe set GoldenQA DisplayName  "Golden QA Inspection Server"
   C:\tools\nssm\nssm.exe set GoldenQA Start         SERVICE_AUTO_START
   C:\tools\nssm\nssm.exe set GoldenQA AppEnvironmentExtra "PORT=3000"
   C:\tools\nssm\nssm.exe set GoldenQA AppExit Default Restart
   C:\tools\nssm\nssm.exe set GoldenQA AppThrottle 5000
   C:\tools\nssm\nssm.exe set GoldenQA AppStdout "C:\apps\Golden-QA-App\logs\service-out.log"
   C:\tools\nssm\nssm.exe set GoldenQA AppStderr "C:\apps\Golden-QA-App\logs\service-err.log"
   C:\tools\nssm\nssm.exe set GoldenQA AppRotateFiles 1
   C:\tools\nssm\nssm.exe start GoldenQA
   ```
3. Manage it:
   ```powershell
   nssm restart GoldenQA      # apply config/code changes
   nssm stop    GoldenQA
   Get-Service  GoldenQA      # check state
   nssm edit    GoldenQA      # GUI editor
   ```
4. Uninstall:
   ```powershell
   nssm stop   GoldenQA
   nssm remove GoldenQA confirm
   ```

### 5b. Native — PowerShell Scheduled Task at startup
No third-party tools. Registers a SYSTEM task that runs `node server.js` at boot.
The helper script does this automatically when NSSM is absent; the equivalent
manual commands (elevated PowerShell 5.1):
```powershell
$app  = "C:\apps\Golden-QA-App"
$node = (Get-Command node.exe).Source
$action  = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\cmd.exe" `
             -Argument "/c set PORT=3000&& `"$node`" server.js" -WorkingDirectory $app
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings  = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 `
             -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName "GoldenQA" -Action $action -Trigger $trigger `
             -Principal $principal -Settings $settings
Start-ScheduledTask -TaskName "GoldenQA"
```
Manage / remove:
```powershell
schtasks /Query  /TN GoldenQA
schtasks /End    /TN GoldenQA
schtasks /Delete /TN GoldenQA /F
```
> A Scheduled Task has no live console for stdout; for rotating log files use NSSM (5a).

---

## 6. Run on Linux

### 6a. systemd (recommended)
Use the unit [`deploy/golden-qa.service`](deploy/golden-qa.service). Assuming the app
is at `/opt/golden-qa`:
```bash
sudo useradd --system --home /opt/golden-qa --shell /usr/sbin/nologin goldenqa
sudo chown -R goldenqa:goldenqa /opt/golden-qa/data
sudo cp /opt/golden-qa/deploy/golden-qa.service /etc/systemd/system/golden-qa.service
sudo systemctl daemon-reload
sudo systemctl enable --now golden-qa
systemctl status golden-qa
curl http://localhost:3000/api/health
```
Logs: `journalctl -u golden-qa -f`. Restart after an upgrade: `sudo systemctl restart golden-qa`.
Edit the unit's `ExecStart` path if `which node` differs from `/usr/bin/node`, and
the `PORT=` line to change the port.

### 6b. pm2 (alternative)
pm2 is itself an npm tool, so this option **does** require installing pm2 globally
(the app stays dependency-free; pm2 is just the supervisor):
```bash
sudo npm install -g pm2
cd /opt/golden-qa
PORT=3000 pm2 start server.js --name golden-qa
pm2 save                       # persist process list
pm2 startup                    # prints a command to enable boot-start; run it
pm2 logs golden-qa             # tail logs
pm2 restart golden-qa          # after an upgrade
```

---

## 7. HTTPS reverse proxy

Terminate TLS in front of the app and proxy to `localhost:3000`. HTTPS is required
for the camera and PWA install to work reliably (README §7). Once a proxy is in
place, bind the app to localhost (`config.json` → `"host": "127.0.0.1"`) and expose
only 443 to tablets.

### 7a. Caddy (simplest — automatic certificates)
Use [`deploy/Caddyfile`](deploy/Caddyfile). With a real public DNS name, Caddy fetches
and renews a Let's Encrypt cert automatically:
```bash
# Linux
sudo cp /opt/golden-qa/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
curl https://qa.golden.com.fj/api/health
```
On Windows, run `caddy run --config .\Caddyfile` (or install Caddy as a service).
The placeholder hostname is `qa.golden.com.fj` — change it to yours. For an
**internal-only** network with no public DNS, the Caddyfile documents two options:
an internal-CA cert (`tls <crt> <key>`) or Caddy's built-in local CA (`tls internal`)
— distribute the CA root to each tablet so browsers trust it.

### 7b. nginx (alternative)
Use [`deploy/nginx.conf.sample`](deploy/nginx.conf.sample). You supply the cert
(certbot for public DNS, or your corporate/AD CA for internal). It sets
`client_max_body_size 25m` for photo uploads and includes WebSocket-safe upgrade
headers. Install and test:
```bash
sudo cp /opt/golden-qa/deploy/nginx.conf.sample /etc/nginx/conf.d/golden-qa.conf
# add the `map $http_upgrade $connection_upgrade { ... }` block to nginx.conf http{} (see file footer)
sudo nginx -t && sudo systemctl reload nginx
```
> Windows alternative: IIS with the ARR + URL Rewrite modules reverse-proxying to
> `http://localhost:3000` works equally well (README §7 mentions IIS/ARR).

---

## 8. Backup strategy

`data/` is the **system of record** (README §6). Back up all three:

| Path | What it is |
|------|------------|
| `data/db.json` | All jobs, stages, users, audit, master data |
| `data/uploads/` | Defect photos and on-screen signatures |
| `data/backups/` | This guide's backup target (snapshots written below) |

A simple, safe snapshot copies `db.json` and `uploads/` into a timestamped folder
under `data/backups/`. Schedule it daily and copy the backups off-box (file share /
object storage). `db.json` is written atomically by the app, so a plain copy is
consistent.

**Windows — `deploy\backup.ps1` (create as needed) + nightly Scheduled Task:**
```powershell
$app = "C:\apps\Golden-QA-App"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $app "data\backups\$stamp"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item (Join-Path $app "data\db.json")  $dest -ErrorAction SilentlyContinue
Copy-Item (Join-Path $app "data\uploads") (Join-Path $dest "uploads") -Recurse -ErrorAction SilentlyContinue
# Prune backups older than 30 days:
Get-ChildItem (Join-Path $app "data\backups") -Directory |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item -Recurse -Force
```
Schedule it (elevated):
```powershell
$a = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\apps\Golden-QA-App\deploy\backup.ps1"
$t = New-ScheduledTaskTrigger -Daily -At 1:30am
Register-ScheduledTask -TaskName "GoldenQA-Backup" -Action $a -Trigger $t -RunLevel Highest -User "SYSTEM"
```

**Linux — cron + tar:**
```bash
# crontab -e  (as root or the goldenqa user)
30 1 * * * d=/opt/golden-qa/data/backups/$(date +\%Y\%m\%d-\%H\%M\%S); mkdir -p "$d" && cp /opt/golden-qa/data/db.json "$d/" && cp -r /opt/golden-qa/data/uploads "$d/uploads"; find /opt/golden-qa/data/backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
```

**Restore:** stop the service, copy the chosen snapshot's `db.json` and `uploads/`
back over `data/`, then start the service.

> The containerised deploy uses PostgreSQL (README §6), which replaces this file backup with
> normal database backups (the bundled nightly `db-backup` service); `uploads/` still needs
> backing up either way.

---

## 9. Upgrade procedure

1. **Back up first** (§8) — snapshot `data/`.
2. Pull or copy the new code, preserving `data/` and `config.json`:
   ```bash
   cd /opt/golden-qa        # or C:\apps\Golden-QA-App
   git pull                 # if deployed from git; otherwise copy new files over, keep data/
   ```
3. There is nothing to build and no dependencies to install (zero-dep design).
4. Restart the service:
   - Windows (NSSM): `nssm restart GoldenQA`
   - Windows (Task): `schtasks /End /TN GoldenQA; schtasks /Run /TN GoldenQA`
   - Linux (systemd): `sudo systemctl restart golden-qa`
   - Linux (pm2): `pm2 restart golden-qa`
5. **Verify** the health check (§10) and review `config.json` for any new keys
   introduced by the release (README §4).

> If you maintain `config.json` changes locally, keep them out of git conflicts by
> using `config.local.json` (already in `.gitignore`) if the release supports it,
> or re-apply your edits after the pull.

---

## 10. Health check & monitoring

`GET /api/health` returns `{ ok, org, time }` and requires no auth — ideal for load
balancers and uptime monitors.

```powershell
# Windows
(Invoke-RestMethod http://localhost:3000/api/health).ok      # -> True
```
```bash
# Linux
curl -fsS http://localhost:3000/api/health && echo OK
```
Through the proxy (§7): `curl -fsS https://qa.golden.com.fj/api/health`.

Wire this URL into your monitoring (Uptime Kuma, PRTG, SCOM, etc.); alert if it does
not return HTTP 200 within a few seconds. Application hold/reject events also push
Teams/email alerts when configured (README §4–5).

---

## 11. Go-live checklist

Confirm before handing to production — see the full list in **README §7**:

- [ ] Default passwords changed (Admin > Users).
- [ ] HTTPS reverse proxy in place (§7); app bound to localhost; only 443 exposed.
- [ ] Service installed with auto-restart (§5/§6) and survives a reboot.
- [ ] Firewall rule applied (§4).
- [ ] Daily `data/` backup scheduled and copied off-box; a restore has been tested (§8).
- [ ] Health check monitored (§10).
- [ ] SSO / notify settings confirmed in `config.json` (README §4–5).

---

*Golden Manufacturers Pte Ltd — see [`README.md`](README.md) for the application overview.*
