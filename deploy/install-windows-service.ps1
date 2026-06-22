<#
  install-windows-service.ps1
  Golden QA App - install as an auto-start Windows service.

  WHAT IT DOES
    1. If NSSM (the Non-Sucking Service Manager) is on PATH or supplied via -NssmPath,
       installs a real Windows service named "GoldenQA" that runs `node server.js`
       in the app directory, auto-starts at boot, and auto-restarts on crash.
    2. If NSSM is NOT available, falls back to a SYSTEM-account Scheduled Task
       ("GoldenQA") that runs `node server.js` at system startup.

  Both paths are IDEMPOTENT: re-running re-applies the same config and will
  recreate an existing service/task rather than erroring out.

  REQUIREMENTS
    - Run from an ELEVATED (Administrator) Windows PowerShell 5.1 prompt.
    - Node.js 18+ installed and on the system PATH (or pass -NodeExe).

  USAGE
    # Use defaults (app dir = parent of this script, port 3000):
    powershell -ExecutionPolicy Bypass -File .\install-windows-service.ps1

    # Explicit:
    .\install-windows-service.ps1 -AppPath "C:\apps\Golden-QA-App" -Port 3000 `
        -NssmPath "C:\tools\nssm\nssm.exe"

  UNINSTALL
    # If installed as an NSSM service:
    nssm stop GoldenQA
    nssm remove GoldenQA confirm
    # If installed as a Scheduled Task:
    schtasks /End /TN "GoldenQA"
    schtasks /Delete /TN "GoldenQA" /F
    # (or run this script with -Uninstall to remove whichever exists)
#>

[CmdletBinding()]
param(
  # App directory containing server.js. Defaults to the parent of this script's folder
  # (this script lives in <app>\deploy\).
  [string]$AppPath = (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)),

  # TCP port the server listens on. Passed to node via the PORT env var.
  [int]$Port = 3000,

  # Service / scheduled-task name.
  [string]$ServiceName = "GoldenQA",

  # Path to node.exe. Auto-detected from PATH if omitted.
  [string]$NodeExe = "",

  # Path to nssm.exe. Auto-detected from PATH if omitted; empty => Scheduled Task fallback.
  [string]$NssmPath = "",

  # Remove the service/task instead of installing.
  [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

function Write-Step($msg)  { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Warn2($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }

# --- Elevation check -------------------------------------------------------
$me = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $me.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "This script must be run from an ELEVATED (Administrator) PowerShell prompt."
}

# --- Resolve app path ------------------------------------------------------
$AppPath = (Resolve-Path -LiteralPath $AppPath).Path
$ServerJs = Join-Path $AppPath "server.js"
if (-not (Test-Path -LiteralPath $ServerJs)) {
  throw "server.js not found at '$ServerJs'. Pass -AppPath pointing at the Golden-QA-App folder."
}
Write-Step "App directory: $AppPath"
Write-Step "Listen port:   $Port"
Write-Step "Service name:  $ServiceName"

# --- Locate node.exe -------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($NodeExe)) {
  $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($cmd) { $NodeExe = $cmd.Source }
}
if ([string]::IsNullOrWhiteSpace($NodeExe) -or -not (Test-Path -LiteralPath $NodeExe)) {
  throw "node.exe not found. Install Node.js 18+ and ensure it is on PATH, or pass -NodeExe."
}
Write-Ok "node: $NodeExe"

# --- Locate nssm.exe -------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($NssmPath)) {
  $cmd = Get-Command nssm.exe -ErrorAction SilentlyContinue
  if ($cmd) { $NssmPath = $cmd.Source }
}
$haveNssm = (-not [string]::IsNullOrWhiteSpace($NssmPath)) -and (Test-Path -LiteralPath $NssmPath)

# ===========================================================================
# UNINSTALL
# ===========================================================================
if ($Uninstall) {
  Write-Step "Uninstalling '$ServiceName' ..."
  $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if ($svc) {
    if ($haveNssm) {
      & $NssmPath stop   $ServiceName | Out-Null
      & $NssmPath remove $ServiceName confirm | Out-Null
      Write-Ok "NSSM service '$ServiceName' removed."
    } else {
      # Service exists but no NSSM to remove it; try sc.exe.
      & sc.exe stop   $ServiceName | Out-Null
      & sc.exe delete $ServiceName | Out-Null
      Write-Ok "Service '$ServiceName' deleted via sc.exe."
    }
  } else {
    Write-Warn2 "No service named '$ServiceName' found."
  }
  $task = Get-ScheduledTask -TaskName $ServiceName -ErrorAction SilentlyContinue
  if ($task) {
    Unregister-ScheduledTask -TaskName $ServiceName -Confirm:$false
    Write-Ok "Scheduled task '$ServiceName' removed."
  } else {
    Write-Warn2 "No scheduled task named '$ServiceName' found."
  }
  Write-Host "Uninstall complete." -ForegroundColor Green
  return
}

# ===========================================================================
# INSTALL via NSSM (preferred)
# ===========================================================================
if ($haveNssm) {
  Write-Step "NSSM found at $NssmPath - installing real Windows service."

  # Idempotent: if the service already exists, remove it first so we re-apply cleanly.
  $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Warn2 "Service '$ServiceName' already exists - reinstalling."
    & $NssmPath stop   $ServiceName | Out-Null
    & $NssmPath remove $ServiceName confirm | Out-Null
  }

  # Install: nssm install <name> <node.exe> server.js
  & $NssmPath install $ServiceName $NodeExe "server.js"

  # Configure the service.
  & $NssmPath set $ServiceName AppDirectory   $AppPath
  & $NssmPath set $ServiceName DisplayName     "Golden QA Inspection Server"
  & $NssmPath set $ServiceName Description      "Golden Manufacturers Starkist label QA app (Node.js, on-prem)."
  & $NssmPath set $ServiceName Start            SERVICE_AUTO_START
  # Pass the listen port to node via environment (server.js reads process.env.PORT).
  & $NssmPath set $ServiceName AppEnvironmentExtra "PORT=$Port"
  # Restart automatically on exit, with a 5s throttle to avoid crash loops.
  & $NssmPath set $ServiceName AppExit Default Restart
  & $NssmPath set $ServiceName AppThrottle 5000
  # Rotate stdout/stderr logs into <app>\logs.
  $logDir = Join-Path $AppPath "logs"
  if (-not (Test-Path -LiteralPath $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
  & $NssmPath set $ServiceName AppStdout (Join-Path $logDir "service-out.log")
  & $NssmPath set $ServiceName AppStderr (Join-Path $logDir "service-err.log")
  & $NssmPath set $ServiceName AppRotateFiles 1
  & $NssmPath set $ServiceName AppRotateOnline 1
  & $NssmPath set $ServiceName AppRotateBytes 10485760

  Write-Step "Starting service ..."
  & $NssmPath start $ServiceName

  Write-Ok "Service '$ServiceName' installed and started."
  Write-Host ""
  Write-Host "Verify:  Invoke-RestMethod http://localhost:$Port/api/health" -ForegroundColor Gray
  Write-Host "Logs:    $logDir" -ForegroundColor Gray
  Write-Host "Manage:  nssm restart $ServiceName  |  nssm stop $ServiceName  |  Get-Service $ServiceName" -ForegroundColor Gray
  return
}

# ===========================================================================
# FALLBACK: SYSTEM Scheduled Task at startup
# ===========================================================================
Write-Step "NSSM not found - registering a SYSTEM Scheduled Task at startup instead."
Write-Warn2 "Tip: install NSSM (https://nssm.cc) for a true auto-restarting service, then re-run."

# Idempotent: remove any existing task with the same name.
$existingTask = Get-ScheduledTask -TaskName $ServiceName -ErrorAction SilentlyContinue
if ($existingTask) {
  Write-Warn2 "Scheduled task '$ServiceName' already exists - replacing."
  Unregister-ScheduledTask -TaskName $ServiceName -Confirm:$false
}

# Action: run node server.js in the app dir. We set PORT via cmd.exe so the env
# var is present for the node process (Scheduled Tasks have no env-var field).
$cmdArgs = "/c set PORT=$Port&& `"$NodeExe`" server.js"
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\cmd.exe" `
                                  -Argument $cmdArgs `
                                  -WorkingDirectory $AppPath

# Trigger: at system startup.
$trigger = New-ScheduledTaskTrigger -AtStartup

# Run as SYSTEM, highest privileges, whether or not a user is logged on.
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Settings: keep running indefinitely, restart on failure, don't stop on idle/battery.
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
                                         -DontStopIfGoingOnBatteries `
                                         -StartWhenAvailable `
                                         -RestartCount 3 `
                                         -RestartInterval (New-TimeSpan -Minutes 1) `
                                         -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $ServiceName `
                       -Action $action -Trigger $trigger `
                       -Principal $principal -Settings $settings `
                       -Description "Golden QA Inspection Server (node server.js at startup)." | Out-Null

Write-Ok "Scheduled task '$ServiceName' registered (runs at startup as SYSTEM)."
Write-Step "Starting it now ..."
Start-ScheduledTask -TaskName $ServiceName

Write-Host ""
Write-Host "Verify:  Invoke-RestMethod http://localhost:$Port/api/health" -ForegroundColor Gray
Write-Host "Manage:  schtasks /Query /TN $ServiceName  |  schtasks /End /TN $ServiceName" -ForegroundColor Gray
Write-Host "Note:    A Scheduled Task has no live stdout console; for log files install NSSM." -ForegroundColor Gray
