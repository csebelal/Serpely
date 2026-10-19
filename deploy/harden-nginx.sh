#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Idempotently hardens the live nginx config (serpely.com) and reloads nginx.
# Safe to run repeatedly. Rolls back if `nginx -t` fails.
#
#   sudo bash deploy/harden-nginx.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

CONF=/etc/nginx/sites-available/serpely
BACKUP="${CONF}.bak-$(date +%Y%m%d-%H%M%S)"

[ -f "$CONF" ] || { echo "No $CONF — nothing to do."; exit 1; }
cp "$CONF" "$BACKUP"
echo "Backup: $BACKUP"

python3 - "$CONF" <<'PYEOF'
import sys, re
p = sys.argv[1]
s = open(p).read()
orig = s
changed = []

# 1) server_tokens off + body size limit (insert after the 443 server_name line)
if 'server_tokens off;' not in s:
    s = s.replace('server_name serpely.com www.serpely.com;',
                  'server_name serpely.com www.serpely.com;\n\n    server_tokens off;', 1)
    changed.append('server_tokens')
if 'client_max_body_size' not in s:
    s = s.replace('server_tokens off;', 'server_tokens off;\n    client_max_body_size 12m;', 1)
    changed.append('client_max_body_size')

# 2) API proxy timeouts (audits can run 60-120s)
if 'proxy_read_timeout' not in s:
    s = re.sub(r'(location /api/ \{[\s\S]*?proxy_set_header X-Forwarded-Proto \$scheme;)',
               r'\1\n        proxy_connect_timeout 10s;\n        proxy_send_timeout 180s;\n        proxy_read_timeout 180s;',
               s, count=1)
    if 'proxy_read_timeout' in s:
        changed.append('proxy timeouts')

# 3) nosniff for uploads + assets
if 'location /uploads/' in s:
    block = re.search(r'location /uploads/ \{[\s\S]*?\n    \}', s)
    if block and 'X-Content-Type-Options' not in block.group(0):
        new_block = block.group(0).replace(
            'add_header Cache-Control "public, immutable";',
            'add_header Cache-Control "public, immutable";\n        add_header X-Content-Type-Options nosniff always;', 1)
        s = s.replace(block.group(0), new_block, 1)
        changed.append('uploads nosniff')

# 4) HSTS + nosniff at server level (only if absent)
if 'Strict-Transport-Security' not in s:
    s = s.replace('client_max_body_size 12m;',
                  'client_max_body_size 12m;\n    add_header X-Content-Type-Options nosniff always;\n'
                  '    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n'
                  '    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;', 1)
    changed.append('security headers')

if s != orig:
    open(p, 'w').write(s)

print('Applied: ' + (', '.join(changed) if changed else 'nothing (already hardened)'))
PYEOF

if nginx -t; then
  systemctl reload nginx
  echo "nginx reloaded."
else
  echo "nginx -t FAILED — restoring backup."
  cp "$BACKUP" "$CONF"
  exit 1
fi
