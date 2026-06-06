#!/bin/bash
set -euo pipefail

echo "===== Serpely VPS Deployment Script ====="
echo "Target: Ubuntu 24.04"
echo ""

# ─── Phase 1: System Update ────────────────────────────────────────────────
echo "[1/9] Updating system packages..."
apt update && apt upgrade -y

# ─── Phase 2: Essentials ────────────────────────────────────────────────────
echo "[2/9] Installing essential tools..."
apt install -y git curl wget build-essential ufw nginx

# ─── Phase 3: Firewall ──────────────────────────────────────────────────────
echo "[3/9] Configuring firewall..."
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# ─── Phase 4: Node.js ───────────────────────────────────────────────────────
echo "[4/9] Installing Node.js 22 LTS..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# ─── Phase 5: MongoDB 7.0 ───────────────────────────────────────────────────
echo "[5/9] Installing MongoDB 7.0..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
apt update && apt install -y mongodb-org

systemctl start mongod
systemctl enable mongod
echo "MongoDB started (localhost:27017, no auth)"

# ─── Phase 6: PM2 & Certbot ────────────────────────────────────────────────
echo "[6/9] Installing PM2 and Certbot..."
npm install -g pm2
apt install -y certbot python3-certbot-nginx

# ─── Phase 7: Application Code ──────────────────────────────────────────────
echo "[7/9] Cloning application..."
mkdir -p /var/www
cd /var/www
if [ -d serpely ]; then
  echo "Directory exists — pulling latest..."
  cd serpely && git pull
else
  git clone https://github.com/csebelal/Serpely.git serpely
  cd serpely
fi

# ─── Phase 8: Backend Setup ─────────────────────────────────────────────────
echo "[8/9] Setting up backend..."

# Generate random secrets
JWT_SECRET=$(openssl rand -hex 64)
ADMIN_PASS=$(openssl rand -base64 16)

cat > /var/www/serpely/server/.env << EOF
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/serpely
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=admin@serpely.com
ADMIN_PASSWORD=${ADMIN_PASS}
CLIENT_ORIGIN=https://serpely.com
UPLOAD_BASE_URL=https://serpely.com
EOF

cd /var/www/serpely/server
npm install
npm run build

pm2 start ecosystem.config.js
pm2 save
# pm2 startup command — user must run the printed command

# ─── Phase 9: Frontend Build ────────────────────────────────────────────────
echo "[9/9] Building frontend..."
cd /var/www/serpely/app
cat > .env.production << EOF
VITE_API_URL=https://serpely.com
EOF

npm install
npm run build

# ─── Phase 10: Nginx Config ────────────────────────────────────────────────
echo "[10/9] Configuring Nginx..."
cat > /etc/nginx/sites-available/serpely << 'NGINX'
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/serpely/server/uploads/;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/serpely /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "===== Deployment Complete! ====="
echo ""
echo "Admin email:    admin@serpely.com"
echo "Admin password: ${ADMIN_PASS}"
echo "JWT Secret:     ${JWT_SECRET}"
echo ""
echo "Next step — run SSL setup:"
echo "  certbot --nginx -d serpely.com -d www.serpely.com"
echo ""
echo "Also run (as root):"
pm2 startup | tail -1
