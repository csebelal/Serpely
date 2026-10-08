param([string]$Password = "")
$ErrorActionPreference = "Stop"
Import-Module Posh-SSH
$secp = ConvertTo-SecureString $Password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential("root", $secp)
$ssh = New-SSHSession -ComputerName "72.61.89.224" -Credential $cred -AcceptKey:$true

function Run-SSH($Command, $Timeout = 60) {
    $r = Invoke-SSHCommand -SessionId $ssh.SessionId -Command $Command -TimeOut $Timeout
    return ($r.Output -join "`n")
}

# 1) Is a build already running? Is dist fresh?
Write-Host "=== state ===" -ForegroundColor Cyan
Write-Host (Run-SSH 'ps aux | grep -E "npm|vite|tsc" | grep -v grep | head -5; echo "---DIST---"; ls /root/Serpely/app/dist/integrations/ 2>/dev/null | head -5; ls -la --time-style=full-iso /root/Serpely/app/dist/index.html 2>/dev/null | awk "{print \$6, \$7}"')

# 2) (Re)start build in background if dist is stale/missing
Write-Host "=== ensure build running ===" -ForegroundColor Cyan
Write-Host (Run-SSH 'if [ ! -f /tmp/appbuild.done ]; then rm -f /tmp/appbuild.done; nohup bash -c "cd /root/Serpely/app && npm install > /tmp/appbuild.log 2>&1 && npm run build >> /tmp/appbuild.log 2>&1; echo DONE_$? > /tmp/appbuild.done" > /dev/null 2>&1 & echo "BUILD_STARTED pid $!"; else echo "BUILD_STATUS $(cat /tmp/appbuild.done)"; fi')

# 3) Poll for completion (up to ~12 min)
Write-Host "=== polling build ===" -ForegroundColor Cyan
$done = $false
for ($i = 0; $i -lt 36; $i++) {
    Start-Sleep -Seconds 20
    $st = Run-SSH 'cat /tmp/appbuild.done 2>/dev/null || echo RUNNING; tail -2 /tmp/appbuild.log 2>/dev/null'
    Write-Host "[$i] $st" -ForegroundColor DarkGray
    if ($st -match "DONE_0") { $done = $true; break }
    if ($st -match "DONE_") { throw "Frontend build FAILED. Log tail above." }
}
if (-not $done) { throw "Build timed out after 12 min" }

# 4) Deploy dist
Write-Host "=== deploy dist ===" -ForegroundColor Cyan
Write-Host (Run-SSH 'ls /root/Serpely/app/dist/integrations/ | head -15; rm -rf /var/www/serpely/app/dist && cp -r /root/Serpely/app/dist /var/www/serpely/app/ && echo DIST_DEPLOYED; ls /var/www/serpely/app/dist/integrations/ | wc -l')

# 5) Nginx /mcp + reload
Write-Host "=== nginx ===" -ForegroundColor Cyan
Write-Host (Run-SSH @'
CONF=/etc/nginx/sites-available/serpely
grep -q "location ~ \^/mcp" $CONF || python3 - "$CONF" << "PYEOF"
import sys
p = sys.argv[1]
s = open(p).read()
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
grep -c "mcp" $CONF
nginx -t 2>&1 && systemctl reload nginx && echo NGINX_RELOADED
'@)

# 6) Live verify
Write-Host "=== live verify ===" -ForegroundColor Cyan
Write-Host (Run-SSH 'echo "MCP_PUBLIC:"; curl -sk https://serpely.com/mcp/health; echo ""; echo "PAGE:"; curl -s -o /dev/null -w "%{http_code}\n" https://serpely.com/integrations; echo "SVG:"; curl -s -o /dev/null -w "%{http_code}\n" https://serpely.com/integrations/slack.svg; pm2 list 2>&1 | grep -i serpely')

Remove-SSHSession -SessionId $ssh.SessionId | Out-Null
Write-Host "`n===== FRONTEND + NGINX DEPLOY COMPLETE =====" -ForegroundColor Green
