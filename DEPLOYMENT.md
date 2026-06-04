# Serpely Deployment Guide

Serpely is deployed as a full-stack app:

- `app/` -> React + Vite frontend
- `server/` -> Express API
- `MongoDB Atlas` -> database
- `PM2` -> backend process manager
- `Nginx` -> static frontend + reverse proxy
- `Local upload mode` -> files stored on VPS under `server/uploads/`

## Environment Files

Frontend production env:

Path:

```bash
/var/www/Serpely/app/.env.production
```

Content:

```env
VITE_API_URL=https://serpely.com
```

Backend production env:

Path:

```bash
/var/www/Serpely/server/.env
```

Content:

```env
PORT=4000
CLIENT_ORIGIN=https://serpely.com,https://www.serpely.com
UPLOAD_BASE_URL=https://serpely.com
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=replace_with_a_very_long_random_secret_at_least_32_characters
ADMIN_EMAIL=admin@serpely.com
ADMIN_PASSWORD=replace_with_a_strong_admin_password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

For local upload mode, keep the Cloudinary placeholders exactly as shown above. The backend will automatically use local disk storage when `CLOUDINARY_CLOUD_NAME=your_cloud_name`.

## Fastest Git Clone Flow

After cloning on the VPS, you can use the bootstrap script in this repo instead of doing every step manually.

Clone:

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/csebelal/Serpely.git
cd /var/www/Serpely
```

Prepare env values:

```bash
cp scripts/hostinger-vps-bootstrap.env.example /root/serpely-bootstrap.env
nano /root/serpely-bootstrap.env
```

Only these values must be changed:

- `MONGO_URI`
- `ADMIN_PASSWORD`

Run:

```bash
set -a
source /root/serpely-bootstrap.env
set +a

bash scripts/hostinger-vps-bootstrap.sh
```

This script will:

- install packages
- create frontend `.env.production`
- create backend `.env`
- auto-generate `JWT_SECRET` if not supplied
- build frontend and backend
- start PM2
- create and enable Nginx config
- run a local health check

## Manual VPS Setup

SSH:

```bash
ssh root@72.61.89.224
```

Install packages:

```bash
apt update && apt upgrade -y
apt install -y git curl nginx certbot python3-certbot-nginx ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

Open firewall:

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

Clone repo:

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/csebelal/Serpely.git
cd /var/www/Serpely
```

Create frontend env:

```bash
cat > /var/www/Serpely/app/.env.production << 'EOF'
VITE_API_URL=https://serpely.com
EOF
```

Create backend env:

```bash
cat > /var/www/Serpely/server/.env << 'EOF'
PORT=4000
CLIENT_ORIGIN=https://serpely.com,https://www.serpely.com
UPLOAD_BASE_URL=https://serpely.com
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=replace_with_a_very_long_random_secret_at_least_32_characters
ADMIN_EMAIL=admin@serpely.com
ADMIN_PASSWORD=replace_with_a_strong_admin_password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EOF
```

## Build And Run

If `tsc: Permission denied` appears in `app/`:

```bash
cd /var/www/Serpely/app
rm -rf node_modules
npm install
chmod +x node_modules/.bin/tsc
chmod +x node_modules/typescript/bin/tsc
```

Build frontend:

```bash
cd /var/www/Serpely/app
npm install
npm run build
```

Build backend:

```bash
cd /var/www/Serpely/server
npm install
npm run build
```

Start backend:

```bash
cd /var/www/Serpely
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Run the extra command printed by `pm2 startup`.

Health check:

```bash
curl http://localhost:4000/api/health
```

Expected response:

```json
{"status":"ok"}
```

## Nginx

Create config:

```bash
cat > /etc/nginx/sites-available/serpely << 'EOF'
server {
    listen 80;
    server_name serpely.com www.serpely.com;

    root /var/www/Serpely/app/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://localhost:4000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 20M;
}
EOF
```

Enable config:

```bash
ln -s /etc/nginx/sites-available/serpely /etc/nginx/sites-enabled/serpely
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

## DNS And SSL

In Namecheap, add:

- `A` record `@` -> `72.61.89.224`
- `A` record `www` -> `72.61.89.224`

In MongoDB Atlas Network Access, whitelist:

```text
72.61.89.224
```

After DNS propagation:

```bash
certbot --nginx -d serpely.com -d www.serpely.com
```

## Final Checks

```bash
pm2 status
systemctl status nginx
curl http://localhost:4000/api/health
curl https://serpely.com/api/health
```

Open in browser:

- `https://serpely.com`
- `https://www.serpely.com`
- `https://serpely.com/admin`
