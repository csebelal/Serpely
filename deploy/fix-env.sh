#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Writes the server .env file. NO SECRETS LIVE IN THIS FILE OR IN GIT.
# All secrets are generated on the machine that runs this script.
#
#   ./fix-env.sh           -> create .env only if missing (safe)
#   ./fix-env.sh --force   -> rotate every secret (invalidates all admin sessions
#                             and Google connections; the admin password is
#                             refreshed separately by server/scripts/rotate-secrets.mjs)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE=/var/www/serpely/server/.env
FORCE="${1:-}"

if [ -f "$ENV_FILE" ] && [ "$FORCE" != "--force" ]; then
  echo "Refusing to overwrite $ENV_FILE (use --force to rotate)."
  exit 1
fi

gen() { openssl rand -hex 64; }

JWT_SECRET="$(gen)"
GOOGLE_TOKEN_KEY="$(gen)"
ADMIN_PW="${ADMIN_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)}"

umask 077
cat > "$ENV_FILE" << ENVEOF
PORT=4000
CLIENT_ORIGIN=https://serpely.com,http://localhost:5173
UPLOAD_BASE_URL=https://serpely.com
MONGO_URI=mongodb://127.0.0.1:27017/Serpely
JWT_SECRET=${JWT_SECRET}
GOOGLE_TOKEN_KEY=${GOOGLE_TOKEN_KEY}
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@serpely.com}
ADMIN_PASSWORD=${ADMIN_PW}
ENVEOF
chmod 600 "$ENV_FILE"

echo "--- .env written (secrets generated, mode 600) ---"
# Never echo secret values.
grep -Ev 'SECRET|PASSWORD|_KEY|MONGO' "$ENV_FILE" || true
echo "Admin password (shown once): ${ADMIN_PW}"
echo "NOTE: this only seeds a NEW admin. To change an existing one run:"
echo "      node /var/www/serpely/server/scripts/rotate-secrets.mjs"
