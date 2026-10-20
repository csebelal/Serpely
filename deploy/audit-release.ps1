<#
    Release the audit redesign to the VPS.

    What it does:
      1. packs the *already built* app/dist and server/dist (no VPS-side build)
      2. backs up the current dist folders to /root/deploy-backups/
      3. replaces them under /var/www/serpely
      4. adds CRUX_API_KEY to the runtime .env only if it is missing
      5. restarts pm2 and prints verification lines

    What it never does:
      - run deploy-vps.ps1 (no secret regeneration, no .env overwrite)
      - touch MongoDB, uploads or any blog post

    Usage:
      powershell -ExecutionPolicy Bypass -File deploy/audit-release.ps1
      (it prompts for the root password; it is never written to disk)

    Rollback (the script prints the backup path):
      cp -a /root/deploy-backups/audit-release-<stamp>/app-dist    /var/www/serpely/app/dist
      cp -a /root/deploy-backups/audit-release-<stamp>/server-dist /var/www/serpely/server/dist
      pm2 restart serpely-api
#>
param(
    [string]$VpsIp = "72.61.89.224",
    [string]$Username = "root",
    [string]$Password = "",
    [string]$WebRoot = "/var/www/serpely"
)

$ErrorActionPreference = "Stop"
Import-Module Posh-SSH

$repo = Split-Path -Parent $PSScriptRoot
$appDist = Join-Path $repo "app\dist"
$serverDist = Join-Path $repo "server\dist"

if (-not (Test-Path (Join-Path $appDist "index.html"))) {
    throw "app/dist is missing. Run: cd app; npm run build"
}
if (-not (Test-Path (Join-Path $serverDist "index.js"))) {
    throw "server/dist is missing. Run: cd server; npm run build"
}

# ── CrUX key: read it locally, never print it ────────────────────────────────
$cruxKey = ""
$localEnv = Join-Path $repo "server\.env"
if (Test-Path $localEnv) {
    $line = Get-Content $localEnv | Where-Object { $_ -match '^CRUX_API_KEY=' } | Select-Object -First 1
    if ($line) { $cruxKey = ($line -replace '^CRUX_API_KEY=', '').Trim() }
}

# ── connect ──────────────────────────────────────────────────────────────────
if ([string]::IsNullOrWhiteSpace($Password)) {
    $secure = Read-Host -Prompt "VPS password for $Username@$VpsIp" -AsSecureString
} else {
    $secure = ConvertTo-SecureString $Password -AsPlainText -Force
}
$cred = New-Object System.Management.Automation.PSCredential($Username, $secure)
$script:ssh = New-SSHSession -ComputerName $VpsIp -Credential $cred -AcceptKey:$true
Write-Host "connected to $VpsIp" -ForegroundColor Green

function Run-SSH([string]$Command) {
    $r = Invoke-SSHCommand -SessionId $script:ssh.SessionId -Command $Command
    $out = ($r.Output -join "`n")
    if ($r.ExitStatus -ne 0) {
        throw "remote command failed ($($r.ExitStatus)):`n$out`n$($r.Error -join "`n")"
    }
    return $out
}

# ── pre-flight ───────────────────────────────────────────────────────────────
$pre = Run-SSH @"
set -e
echo WEBROOT: `$(ls -d $WebRoot/app/dist $WebRoot/server/dist 2>&1 | tr '\n' ' ')
echo PM2: `$(pm2 jlist 2>/dev/null | head -c 120 >/dev/null; pm2 describe serpely-api 2>&1 | grep -i 'script path' | head -1)
echo DISK: `$(df -h / | tail -1 | awk '{print `$4}')
"@
Write-Host $pre -ForegroundColor Gray

# ── pack + upload ────────────────────────────────────────────────────────────
$tmp = Join-Path $repo "_release"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory -Path $tmp | Out-Null

$appTgz = Join-Path $tmp "app-dist.tgz"
$serverTgz = Join-Path $tmp "server-dist.tgz"
& tar -czf $appTgz -C $appDist .
if ($LASTEXITCODE -ne 0) { throw "tar failed for app/dist" }
& tar -czf $serverTgz -C $serverDist .
if ($LASTEXITCODE -ne 0) { throw "tar failed for server/dist" }

$sftp = New-SFTPSession -ComputerName $VpsIp -Credential $cred -AcceptKey:$true
Set-SFTPItem -SessionId $sftp.SessionId -Path $appTgz -Destination "/tmp" -Force | Out-Null
Set-SFTPItem -SessionId $sftp.SessionId -Path $serverTgz -Destination "/tmp" -Force | Out-Null
Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null
Write-Host "uploaded app + server bundles" -ForegroundColor Gray

# ── swap + restart ───────────────────────────────────────────────────────────
$remote = @'
set -euo pipefail
WEB="__WEB__"
BK="/root/deploy-backups/audit-release-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BK"
if [ -d "$WEB/app/dist" ]; then cp -a "$WEB/app/dist" "$BK/app-dist"; fi
if [ -d "$WEB/server/dist" ]; then cp -a "$WEB/server/dist" "$BK/server-dist"; fi

rm -rf /tmp/app-dist /tmp/server-dist
mkdir -p /tmp/app-dist /tmp/server-dist
tar -xzf /tmp/app-dist.tgz -C /tmp/app-dist
tar -xzf /tmp/server-dist.tgz -C /tmp/server-dist

rm -rf "$WEB/app/dist" "$WEB/server/dist"
mv /tmp/app-dist "$WEB/app/dist"
mv /tmp/server-dist "$WEB/server/dist"
rm -f /tmp/app-dist.tgz /tmp/server-dist.tgz

if [ -n "__CRUX__" ] && ! grep -q '^CRUX_API_KEY=' "$WEB/server/.env"; then
  printf 'CRUX_API_KEY=%s\n' "__CRUX__" >> "$WEB/server/.env"
  echo "crux-key: added"
else
  echo "crux-key: already present or not supplied"
fi

pm2 restart serpely-api >/dev/null
sleep 3

echo "health: $(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/api/health)"
echo "bundle: $(curl -s -H 'Host: serpely.com' http://127.0.0.1/audit | grep -o 'assets/index-[A-Za-z0-9_-]*\.js' | head -1)"
echo "psi-route: $(curl -s 'http://127.0.0.1:4000/api/public-audit/00000000000000000000000000000000/psi?url=https%3A%2F%2Fexample.com' | head -c 80)"
echo "pm2: $(pm2 describe serpely-api 2>&1 | grep -i 'status' | head -1 | tr -s ' ')"
echo "backup: $BK"
echo DEPLOY_OK
'@

$remote = $remote.Replace('__WEB__', $WebRoot).Replace('__CRUX__', $cruxKey)
$result = Run-SSH $remote

if ($result -notmatch 'DEPLOY_OK') { throw "deploy did not complete:`n$result" }
Write-Host $result -ForegroundColor Gray

# ── hard checks: these are the two ways this release silently no-ops ────────
$health = ($result | Select-String -Pattern 'health: (\d{3})').Matches[0].Groups[1].Value
if ($health -ne '200') {
    Write-Host "FAIL: /api/health returned $health. Roll back with the backup path above." -ForegroundColor Red
}
if ($result -match 'psi-route: .*Cannot GET') {
    Write-Host "FAIL: pm2 is still serving the old server build (no /psi route)." -ForegroundColor Red
    Write-Host "The pm2 script path printed above is the real runtime dir; copy server/dist there and restart." -ForegroundColor Red
}
if ($result -notmatch 'crux-key: added' -and $result -notmatch 'crux-key: already present') {
    Write-Host "WARN: CRUX_API_KEY was not set on the server." -ForegroundColor Yellow
}

# ── local comparison: did the served bundle change? ─────────────────────────
$localBundle = $null
$served = $null
$m = Select-String -Path (Join-Path $appDist "index.html") -Pattern 'assets/(index-[A-Za-z0-9_-]+\.js)' -AllMatches
if ($m -and $m.Matches.Count -gt 0) { $localBundle = $m.Matches[0].Groups[1].Value }
$m2 = $result | Select-String -Pattern 'bundle: (assets/index-[A-Za-z0-9_-]+\.js)'
if ($m2 -and $m2.Matches.Count -gt 0) { $served = $m2.Matches[0].Groups[1].Value }

if (-not $served) {
    Write-Host "WARNING: could not read the served bundle name; open https://serpely.com/audit and check manually." -ForegroundColor Yellow
} elseif ($localBundle -and $served -like "*$localBundle") {
    Write-Host "OK: served bundle matches the local build ($localBundle)" -ForegroundColor Green
} else {
    Write-Host "WARNING: served bundle $served != local $localBundle" -ForegroundColor Yellow
    Write-Host "Check /etc/nginx root and the pm2 script path." -ForegroundColor Yellow
}

Remove-SSHSession -SessionId $script:ssh.SessionId | Out-Null
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "`n===== RELEASE DONE =====" -ForegroundColor Green
