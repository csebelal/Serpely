#!/bin/bash
set -euo pipefail

REPO_DIR="/root/Serpely"
WEB_DIR="/var/www/serpely"

echo "===== Serpely Deploy Script ====="
echo ""

# ─── Step 1: Fix permissions ────────────────────────────────────────────────
echo "[1/6] Fixing tsc/bin permissions..."
find "$REPO_DIR/server/node_modules/.bin" -type f -exec chmod +x {} + 2>/dev/null || true
find "$REPO_DIR/app/node_modules/.bin" -type f -exec chmod +x {} + 2>/dev/null || true

# ─── Step 2: Build Server ───────────────────────────────────────────────────
echo "[2/6] Building server..."
cd "$REPO_DIR/server"
npm install 2>&1 | tail -1
npx tsc

# ─── Step 3: Deploy Server ──────────────────────────────────────────────────
echo "[3/6] Deploying server to web root..."
cp -r "$REPO_DIR/server/dist" "$WEB_DIR/server/"
cp "$REPO_DIR/server/package.json" "$WEB_DIR/server/"
cd "$WEB_DIR/server"
npm install 2>&1 | tail -1
pm2 restart serpely-api
echo "  PM2 restarted"

# ─── Step 4: Build Frontend ─────────────────────────────────────────────────
echo "[4/6] Building frontend..."
cd "$REPO_DIR/app"
npm install 2>&1 | tail -1
npm run build 2>&1 | tail -3

# ─── Step 5: Deploy Frontend ────────────────────────────────────────────────
echo "[5/6] Deploying frontend to web root..."
rm -rf "$WEB_DIR/app/dist"
cp -r "$REPO_DIR/app/dist" "$WEB_DIR/app/"

# ─── Step 6: Verify ─────────────────────────────────────────────────────────
echo "[6/6] Verifying..."
curl -s -o /dev/null -w "  HTTP %{http_code}\n" https://serpely.com || echo "  (curl skipped — no SSL check)"
pm2 list 2>&1 | grep serpely-api | awk '{print "  serpely-api: " $18}'

echo ""
echo "===== Deploy Complete ====="
echo "Server: $WEB_DIR/server/dist/"
echo "Frontend: $WEB_DIR/app/dist/"
