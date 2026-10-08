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
$RepoRoot = "F:\Project\Seperly"

# upload renamed assets + fixed tsx
$sftp = New-SFTPSession -ComputerName "72.61.89.224" -Credential $cred -AcceptKey:$true
Write-Host (Run-SSH 'mkdir -p /root/Serpely/app/public/integration-logos && rm -rf /root/Serpely/app/public/integrations && echo DIRS_READY')
Set-SFTPItem -SessionId $sftp.SessionId -Path "$RepoRoot\app\src\pages\Integrations.tsx" -Destination "/root/Serpely/app/src/pages/" -Force | Out-Null
Set-SFTPItem -SessionId $sftp.SessionId -Path "$RepoRoot\app\src\pages\admin\IntegrationsEditor.tsx" -Destination "/root/Serpely/app/src/pages/admin/" -Force | Out-Null
Get-ChildItem "$RepoRoot\app\public\integration-logos\*.svg" | ForEach-Object {
    Set-SFTPItem -SessionId $sftp.SessionId -Path $_.FullName -Destination "/root/Serpely/app/public/integration-logos/" -Force | Out-Null
}
Write-Host "uploaded tsx + 12 svgs" -ForegroundColor Green
Remove-SFTPSession -SessionId $sftp.SessionId | Out-Null

# rebuild in background + poll
Write-Host (Run-SSH 'rm -f /tmp/appbuild2.done /tmp/appbuild2.log; nohup bash -c "cd /root/Serpely/app && npm run build > /tmp/appbuild2.log 2>&1; echo DONE_$? > /tmp/appbuild2.done" > /dev/null 2>&1 & echo BUILD_STARTED')
$done = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 20
    $st = Run-SSH 'cat /tmp/appbuild2.done 2>/dev/null || echo RUNNING; tail -1 /tmp/appbuild2.log 2>/dev/null'
    Write-Host "[$i] $st" -ForegroundColor DarkGray
    if ($st -match "DONE_0") { $done = $true; break }
    if ($st -match "DONE_") { throw "build failed" }
}
if (-not $done) { throw "timeout" }

Write-Host "=== deploy + verify ===" -ForegroundColor Cyan
Write-Host (Run-SSH 'ls /root/Serpely/app/dist/integration-logos/ | wc -l; rm -rf /var/www/serpely/app/dist && cp -r /root/Serpely/app/dist /var/www/serpely/app/ && echo DIST_DEPLOYED; echo "PAGE:"; curl -s -o /dev/null -w "%{http_code}\n" https://serpely.com/integrations; echo "SVG:"; curl -s -o /dev/null -w "%{http_code}\n" https://serpely.com/integration-logos/slack.svg; echo "MCP:"; curl -sk https://serpely.com/mcp/health; echo ""')
Remove-SSHSession -SessionId $ssh.SessionId | Out-Null
Write-Host "===== FIX DEPLOYED =====" -ForegroundColor Green
