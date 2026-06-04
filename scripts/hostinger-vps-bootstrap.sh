#!/bin/bash
set -euo pipefail

DOMAIN="${DOMAIN:-serpely.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.serpely.com}"
APP_DIR="${APP_DIR:-/var/www/Serpely}"
APP_USER="${APP_USER:-root}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@serpely.com}"
PORT="${PORT:-4000}"

if [[ -z "${MONGO_URI:-}" ]]; then
  echo "Error: MONGO_URI is required."
  echo "Example: export MONGO_URI='mongodb+srv://user:pass@cluster.mongodb.net/Serpely?appName=Cluster0'"
  exit 1
fi

if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  echo "Error: ADMIN_PASSWORD is required."
  echo "Example: export ADMIN_PASSWORD='StrongPassword123!'"
  exit 1
fi

if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "Error: app directory not found at $APP_DIR"
  echo "Clone the repo first:"
  echo "  mkdir -p /var/www && cd /var/www && git clone https://github.com/csebelal/Serpely.git"
  exit 1
fi

JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 48)}"

echo "-> Installing system packages..."
apt update && apt upgrade -y
apt install -y git curl nginx certbot python3-certbot-nginx ufw openssl
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2

echo "-> Configuring firewall..."
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable

echo "-> Writing frontend env..."
cat > "$APP_DIR/app/.env.production" <<EOF
VITE_API_URL=https://${DOMAIN}
EOF

echo "-> Writing backend env..."
cat > "$APP_DIR/server/.env" <<EOF
PORT=${PORT}
CLIENT_ORIGIN=https://${DOMAIN},https://${WWW_DOMAIN}
UPLOAD_BASE_URL=https://${DOMAIN}
MONGO_URI=${MONGO_URI}
JWT_SECRET=${JWT_SECRET}
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EOF

echo "-> Fixing file ownership..."
chown -R "${APP_USER}:${APP_USER}" "$APP_DIR"

echo "-> Building frontend..."
cd "$APP_DIR/app"
rm -rf node_modules
npm install
chmod +x node_modules/.bin/tsc || true
chmod +x node_modules/typescript/bin/tsc || true
npm run build

echo "-> Building backend..."
cd "$APP_DIR/server"
rm -rf node_modules
npm install
npm run build

echo "-> Starting PM2..."
cd "$APP_DIR"
pm2 start ecosystem.config.js
pm2 save
pm2 startup || true

echo "-> Writing Nginx config..."
cat > /etc/nginx/sites-available/serpely <<EOF
server {
    listen 80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    root ${APP_DIR}/app/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://localhost:${PORT};
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    client_max_body_size 20M;
}
EOF

ln -sf /etc/nginx/sites-available/serpely /etc/nginx/sites-enabled/serpely
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "-> Health check..."
curl "http://localhost:${PORT}/api/health"

cat <<EOF

Bootstrap complete.

Next steps:
1. In Namecheap, point these A records to your VPS IP:
   - @ -> 72.61.89.224
   - www -> 72.61.89.224
2. In MongoDB Atlas, whitelist your VPS IP:
   - 72.61.89.224
3. After DNS propagation, run:
   certbot --nginx -d ${DOMAIN} -d ${WWW_DOMAIN}
4. Check:
   pm2 status
   systemctl status nginx
   curl https://${DOMAIN}/api/health

If pm2 startup printed a command, run that command once manually to enable startup on boot.
EOF
