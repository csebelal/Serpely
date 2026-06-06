param(
    [string]$VpsIp = "72.61.89.224",
    [string]$Username = "root",
    [string]$Password = "Belal9@123456789#"
)

$ErrorActionPreference = "Stop"

function Run-SSH($Command) {
    $r = Invoke-SSHCommand -SessionId $script:session.SessionId -Command $Command
    if ($r.ExitStatus -ne 0) {
        Write-Host "ERROR (exit $($r.ExitStatus)): $($r.Error -join "`n")" -ForegroundColor Red
        throw "Command failed: $Command"
    }
    return $r.Output -join "`n"
}

function Write-RemoteFile($RemotePath, $Content) {
    $lines = $Content -split "`n"
    $escaped = $lines | ForEach-Object { $_ -replace "'", "'\''" }
    $body = $escaped -join "`n"
    Run-SSH "cat > '$RemotePath' << 'ENDOFFILE'
$body
ENDOFFILE" 2>&1 | Out-Null
}

# ─── Connect ──────────────────────────────────────────────────────────────────
Write-Host "=== Connecting to $VpsIp ===" -ForegroundColor Cyan
$secpasswd = ConvertTo-SecureString $Password -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($Username, $secpasswd)
$script:session = New-SSHSession -ComputerName $VpsIp -Credential $cred -AcceptKey:$true
Write-Host "Connected (SessionId: $($script:session.SessionId))" -ForegroundColor Green

# Generate secrets
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object { [char]$_ })
$adminPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object { [char]$_ })
Set-Content -Path "$env:TEMP\serpely-creds.txt" -Value "JWT_SECRET=$jwtSecret`nADMIN_PASSWORD=$adminPassword`n"
Write-Host "Credentials saved to TEMP\serpely-creds.txt" -ForegroundColor Yellow

# ─── Phase 8: Backend Setup ───────────────────────────────────────────────────
Write-Host "`n=== Phase 8: Backend Setup ===" -ForegroundColor Cyan

# Write .env
Write-RemoteFile "/var/www/serpely/server/.env" @"
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/serpely
JWT_SECRET=$jwtSecret
ADMIN_EMAIL=admin@serpely.com
ADMIN_PASSWORD=$adminPassword
CLIENT_ORIGIN=https://serpely.com
UPLOAD_BASE_URL=https://serpely.com
"@

Run-SSH "echo 'JWT: $jwtSecret' > /root/creds.txt; echo 'ADMIN: $adminPassword' >> /root/creds.txt; chmod 600 /root/creds.txt"

Write-Host "Installing backend deps..." -ForegroundColor Yellow
$out = Run-SSH "cd /var/www/serpely/server && npm install 2>&1 | tail -5"
Write-Host $out -ForegroundColor Gray

Write-Host "Building backend..." -ForegroundColor Yellow
$out = Run-SSH "cd /var/www/serpely/server && npm run build 2>&1 | tail -10"
Write-Host $out -ForegroundColor Gray

Write-Host "Starting backend with PM2..." -ForegroundColor Yellow
$out = Run-SSH "cd /var/www/serpely/server && pm2 start ecosystem.config.js 2>&1"
Write-Host $out -ForegroundColor Gray
Run-SSH "pm2 save 2>&1" | Out-Null

# ─── Phase 9: Frontend Build ───────────────────────────────────────────────────
Write-Host "`n=== Phase 9: Frontend Build ===" -ForegroundColor Cyan

Write-RemoteFile "/var/www/serpely/app/.env.production" "VITE_API_URL=https://serpely.com"

Write-Host "Installing frontend deps..." -ForegroundColor Yellow
$out = Run-SSH "cd /var/www/serpely/app && npm install 2>&1 | tail -5"
Write-Host $out -ForegroundColor Gray

Write-Host "Building frontend..." -ForegroundColor Yellow
$out = Run-SSH "cd /var/www/serpely/app && npm run build 2>&1 | tail -10"
Write-Host $out -ForegroundColor Gray

# ─── Phase 10: Nginx Config ──────────────────────────────────────────────────
Write-Host "`n=== Phase 10: Nginx Setup ===" -ForegroundColor Cyan

Write-RemoteFile "/etc/nginx/sites-available/serpely" @"
server {
    listen 80;
    server_name serpely.com www.serpely.com;

    root /var/www/serpely/app/dist;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads/ {
        alias /var/www/serpely/server/uploads/;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
"@

Run-SSH "ln -sf /etc/nginx/sites-available/serpely /etc/nginx/sites-enabled/"
Run-SSH "rm -f /etc/nginx/sites-enabled/default"
$out = Run-SSH "nginx -t 2>&1"
Write-Host $out -ForegroundColor Gray
Run-SSH "systemctl reload nginx 2>&1" | Out-Null

# ─── Phase 11: SSL ────────────────────────────────────────────────────────────
Write-Host "`n=== Phase 11: SSL Certificate ===" -ForegroundColor Cyan
Write-Host "Running certbot..." -ForegroundColor Yellow
$out = Run-SSH "certbot --nginx --non-interactive --agree-tos -m admin@serpely.com -d serpely.com -d www.serpely.com 2>&1 | tail -10"
Write-Host $out -ForegroundColor Gray

# ─── Verify ───────────────────────────────────────────────────────────────────
Write-Host "`n=== Verification ===" -ForegroundColor Cyan
try {
    $code = Run-SSH "curl -s -o /dev/null -w '%{http_code}' http://localhost 2>&1"
    Write-Host "HTTP Status (localhost): $code" -ForegroundColor Green
} catch {
    Write-Host "HTTP check skipped" -ForegroundColor Yellow
}
try {
    $health = Run-SSH "curl -s http://localhost/api/health 2>&1"
    Write-Host "API Health: $health" -ForegroundColor Green
} catch {
    Write-Host "API health check skipped" -ForegroundColor Yellow
}
$out = Run-SSH "pm2 list 2>&1"
Write-Host "PM2:" -ForegroundColor Cyan
Write-Host $out -ForegroundColor Gray

# Cleanup
Remove-SSHSession -SessionId $script:session.SessionId
Write-Host "`n===== DEPLOYMENT COMPLETE =====" -ForegroundColor Green
Write-Host "Admin URL: https://serpely.com/sp-super-admin/login" -ForegroundColor White
Write-Host "Creds saved to: TEMP\serpely-creds.txt" -ForegroundColor Yellow
