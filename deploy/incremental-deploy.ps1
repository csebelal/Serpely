param(
    [string]$VpsIp = "72.61.89.224",
    [string]$Username = "root",
    [string]$Password = "",
    [string]$RepoRoot = "F:\Project\Seperly"
)
$ErrorActionPreference = "Stop"
Import-Module Posh-SSH

function Run-SSH($Command) {
    $r = Invoke-SSHCommand -SessionId $script:ssh.SessionId -Command $Command
    $out = ($r.Output -join "`n")
    return @{ Exit = $r.ExitStatus; Out = $out }
}
function Check($label, $res, $mustMatch) {
    Write-Host "--- $label (exit $($res.Exit)) ---" -ForegroundColor Cyan
    Write-Host $res.Out -ForegroundColor Gray
    if ($res.Exit -ne 0) { throw "FAILED: $label" }
    if ($mustMatch -and $res.Out -notmatch $mustMatch) { throw "VERIFY FAILED ($label): expected /$mustMatch/" }
}

$secp = ConvertTo-SecureString $Password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($Username, $secp)
$script:ssh = New-SSHSession -ComputerName $VpsIp -Credential $cred -AcceptKey:$true
Write-Host "Connected (SessionId: $($script:ssh.SessionId))" -ForegroundColor Green

# ─── Inspect ───
Check "inspect" (Run-SSH 'echo REPO:; git -C /root/Serpely log --oneline -2 2>&1; echo APPDIR:; ls -d /root/Serpely /var/www/serpely 2>&1; echo PM2:; pm2 describe serpely-api 2>&1 | grep -i "script path\|status" | head -4; echo NGINX:; grep -n "location" /etc/nginx/sites-available/serpely 2>/dev/null | head -12; echo NODE:; node -v') ""

# ─── Upload via SFTP ───
$sftp = New-SFTPSession -ComputerName $VpsIp -Credential $cred -AcceptKey:$true
Write-Host "SFTP connected ($($sftp.SessionId))" -ForegroundColor Green
Run-SSH 'mkdir -p /root/Serpely/server/src/mcp /root/Serpely/app/public/integrations' | Out-Null

$files = New-Object System.Collections.ArrayList
[void]$files.Add(@("$RepoRoot\server\src\mcp\tools.ts", "/root/Serpely/server/src/mcp/"))
[void]$files.Add(@("$RepoRoot\server\src\routes\mcp.ts", "/root/Serpely/server/src/routes/"))
[void]$files.Add(@("$RepoRoot\server\src\middleware\apiKeyAuth.ts", "/root/Serpely/server/src/middleware/"))
[void]$files.Add(@("$RepoRoot\server\src\models\AuditReport.ts", "/root/Serpely/server/src/models/"))
[void]$files.Add(@("$RepoRoot\app\src\pages\Integrations.tsx", "/root/Serpely/app/src/pages/"))
[void]$files.Add(@("$RepoRoot\app\src\pages\admin\IntegrationsEditor.tsx", "/root/Serpely/app/src/pages/admin/"))
Get-ChildItem "$RepoRoot\app\public\integrations\*.svg" | ForEach-Object {
    [void]$files.Add(@($_.FullName, "/root/Serpely/app/public/integrations/"))
}
foreach ($f in $files) {
    Set-SFTPItem -SessionId $sftp.SessionId -Path $f[0] -Destination $f[1] -Force | Out-Null
    Write-Host "uploaded: $(Split-Path $f[0] -Leaf)" -ForegroundColor DarkGray
}
Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null

# ─── Patch server index.ts (surgical, no overwrite) ───
Check "patch-index" (Run-SSH @'
cd /root/Serpely/server
python3 << "PYEOF"
p = "src/index.ts"
s = open(p).read()
# remove any previous mangled/partial mcp lines (idempotent repair)
lines = [l for l in s.split("\n") if "mcpRouter" not in l and "routes/mcp" not in l]
s = "\n".join(lines)
anchor_imp = "import publicAuditRouter from './routes/publicAudit';"
assert anchor_imp in s, "import anchor missing"
s = s.replace(anchor_imp, anchor_imp + "\nimport mcpRouter from './routes/mcp';", 1)
anchor_use = "app.use('/api/public-audit', publicAuditRouter);"
assert anchor_use in s, "use anchor missing"
s = s.replace(anchor_use, anchor_use + "\napp.use('/mcp', mcpRouter);", 1)
open(p, "w").write(s)
print("PATCH_OK")
PYEOF
grep -n "mcp" src/index.ts
'@) "PATCH_OK"

# ─── Backend build + restart ───
Check "server-build" (Run-SSH 'cd /root/Serpely/server && npm install > /tmp/npm.log 2>&1; echo NPM_EXIT=$?; tail -2 /tmp/npm.log; npx tsc > /tmp/tsc.log 2>&1; echo TSC_EXIT=$?; head -10 /tmp/tsc.log') "TSC_EXIT=0"
Check "server-deploy" (Run-SSH @'
WEB=/var/www/serpely
cp -r /root/Serpely/server/dist $WEB/server/
cp /root/Serpely/server/package.json $WEB/server/
cd $WEB/server && npm install 2>&1 | tail -1
pm2 restart serpely-api 2>&1 | tail -3
sleep 3
curl -s http://127.0.0.1:4000/mcp/health
'@) '"ok":true'

# ─── Frontend build + deploy ───
Check "frontend-build" (Run-SSH 'cd /root/Serpely/app && npm install 2>&1 | tail -1 && npm run build 2>&1 | tail -4; ls dist/integrations/ | head -15') "adobe.svg"
Check "frontend-deploy" (Run-SSH @'
WEB=/var/www/serpely
rm -rf $WEB/app/dist && cp -r /root/Serpely/app/dist $WEB/app/
ls $WEB/app/dist/integrations/ | wc -l
'@) ""

# ─── Nginx /mcp + reload ───
Check "nginx" (Run-SSH @'
CONF=/etc/nginx/sites-available/serpely
grep -q "location ~ \^/mcp" $CONF || python3 - "$CONF" << "PYEOF"
import sys, re
p = sys.argv[1]
s = open(p).read()
# 1) keep /mcp/* out of the trailing-slash redirect (MCP clients POST exact URLs)
s2 = s.replace("(?!api/|assets/|uploads/)", "(?!api/|assets/|uploads/|mcp/)", 1)
if s2 != s:
    s = s2
    print("LOOKAHEAD_UPDATED")
block = """    # MCP (Streamable HTTP) — same backend, no extra VPS
    location ~ ^/mcp(/.*)?$ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

"""
anchor = "    # API proxy"
assert anchor in s, "anchor not found"
s = s.replace(anchor, block + anchor, 1)
open(p, "w").write(s)
print("MCP_BLOCK_ADDED")
PYEOF
grep -n "mcp" $CONF | head -5
nginx -t 2>&1 && systemctl reload nginx && echo NGINX_RELOADED
'@) "NGINX_RELOADED"

# ─── Live verify ───
Check "live-verify" (Run-SSH 'sleep 2; echo "LOCAL:"; curl -s http://127.0.0.1:4000/mcp/health; echo ""; echo "PUBLIC:"; curl -sk https://serpely.com/mcp/health; echo ""; echo "SITE:"; curl -s -o /dev/null -w "%{http_code}" https://serpely.com/integrations; echo ""; pm2 list 2>&1 | grep -i serpely') '"ok":true'

Remove-SSHSession -SessionId $script:ssh.SessionId | Out-Null
Write-Host "`n===== INCREMENTAL DEPLOY COMPLETE =====" -ForegroundColor Green
