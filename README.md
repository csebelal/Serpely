Ready for review
Select text to add comments on the plan
Hostinger VPS Deployment — serpely.com
Context
Full-stack app: React/Vite frontend (app/) + Express API (server/) + MongoDB Atlas. Goal: Deploy to Hostinger VPS with custom domain serpely.com, SSL, Nginx reverse proxy, PM2 process manager.

Architecture
Browser → Nginx (80/443) → /          → serve app/dist/ (static)
                         → /api/*     → proxy localhost:4000 (Express)
                         → /uploads/* → proxy localhost:4000 (Express)
Express runs on localhost:4000 only — not exposed to internet. MongoDB Atlas (cloud) — no local DB needed.

Step 1 — VPS Initial Setup
SSH into VPS:

ssh root@<VPS_IP>
Install Node.js 20 LTS:

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v   # v20.x
Install PM2 + Nginx + Certbot:

npm install -g pm2
apt install -y nginx certbot python3-certbot-nginx
Step 2 — Upload Project
Option A (Git):

cd /var/www
git clone <your-repo-url> serpely
Option B (SCP from Windows):

scp -r "F:\Project\Seperly" root@<VPS_IP>:/var/www/serpely
Step 3 — Build
Before building, update app/.env.local:

VITE_API_URL=https://serpely.com
Then build:

cd /var/www/serpely

cd app && npm install && npm run build    # → app/dist/
cd ../server && npm install && npm run build   # → server/dist/
Step 4 — Production .env
Update /var/www/serpely/server/.env:

PORT=4000
MONGO_URI=mongodb+srv://csebelal9_db_user:Serpely2024!@cluster0.e0hirj2.mongodb.net/Serpely?appName=Cluster0
JWT_SECRET=<strong-random-secret-32-chars>
CLIENT_ORIGIN=https://serpely.com
ADMIN_EMAIL=admin@serpely.com
ADMIN_PASSWORD=<strong-password>
CLOUDINARY_CLOUD_NAME=<value>
CLOUDINARY_API_KEY=<value>
CLOUDINARY_API_SECRET=<value>
Step 5 — PM2 Config
Create /var/www/serpely/ecosystem.config.js:

module.exports = {
  apps: [{
    name: 'serpely-api',
    script: './server/dist/index.js',
    cwd: '/var/www/serpely',
    env: { NODE_ENV: 'production' },
    restart_delay: 3000,
    max_restarts: 10,
  }]
};
Start:

cd /var/www/serpely
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # run the printed command to enable on boot
Step 6 — Nginx Config
Create /etc/nginx/sites-available/serpely:

server {
    listen 80;
    server_name serpely.com www.serpely.com;

    root /var/www/serpely/app/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 20M;
    }

    location /uploads/ {
        proxy_pass http://localhost:4000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 20M;
}
Enable:

ln -s /etc/nginx/sites-available/serpely /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
Step 7 — SSL
DNS A record → VPS IP first, then:

certbot --nginx -d serpely.com -d www.serpely.com
Certbot auto-adds HTTPS + redirect.

Step 8 — Firewall
ufw allow 22 && ufw allow 80 && ufw allow 443
ufw deny 4000    # block direct API access
ufw enable
Step 9 — Verify
https://serpely.com → React app
https://serpely.com/api/health → {"status":"ok"}
https://serpely.com/admin → admin panel
pm2 status → serpely-api online
Redeploy (future updates)
cd /var/www/serpely && git pull
cd app && npm run build
cd ../server && npm run build
pm2 restart serpely-api
Critical Files
File	Action
app/.env.local	Set VITE_API_URL=https://serpely.com before build
server/.env	Update CLIENT_ORIGIN, JWT_SECRET, ADMIN_PASSWORD
/etc/nginx/sites-available/serpely	NEW — create on VPS
/var/www/serpely/ecosystem.config.js	NEW — create on VPS
Admin Panel — Advanced Features (SaaS-Grade)
Context
Current admin has page editors, blog CRUD, media library, users, and basic settings. Research across Ahrefs, Semrush, HubSpot, Intercom, and Webflow shows gaps in: lead capture/inbox, subscriber management, role-based access, analytics, A/B testing, popup/banner management, changelog, API key management, white-label, SEO per-page, bulk operations, backup, and audit trails. Plan covers 12 features prioritized by impact.

Existing Patterns (reuse)
Model: interface extends Document + Schema → server/src/models/
Route: verifyJWT for protected, registered in server/src/index.ts
API: typed axios in app/src/lib/api.ts, auto Bearer token
Admin UI: padding:'36px 44px', #f1f5f9 input bg, #00C27A CTA, white card borderRadius:16
Feature 1 — Contact Form Inbox ★ HIGH PRIORITY
Like Webflow's form submission collection + Intercom's unified inbox

Backend

Model ContactSubmission: name, email, company, website, topic, message, read:bool, starred:bool, status:'new'|'replied'|'archived', createdAt
Route POST /api/contact (public) — save; GET (auth) — list; PATCH /:id (auth) — update status/read/starred; DELETE /:id (auth)
Frontend

Contact.tsx handleSubmit → POST /api/contact
Admin page ContactInbox.tsx /admin/contact
Header: Inbox / Starred / Archived tabs + unread badge count
Table: avatar initials, name+email, topic pill, message preview, date, status badge
Row expand → full message + action buttons (Mark Replied, Star, Archive, Delete)
Empty state illustration for no messages
Feature 2 — Newsletter Subscribers ★ HIGH PRIORITY
Like Webflow form export + HubSpot contact management

Backend

Model Subscriber: email (unique), active:bool, source:string, tags:string[], createdAt
Routes: POST /api/subscribers (public, upsert); GET (auth) list; PATCH /:id toggle active; DELETE /:id; GET /export → CSV response
Frontend

NewsletterSection.tsx subscribe → POST /api/subscribers
Admin page SubscribersManager.tsx /admin/subscribers
Stats strip: Total, Active, This week, Unsubscribed
Table: email, status badge, source, date joined
Toggle active/inactive per row, bulk delete
"Export CSV" button
Feature 3 — Popup & Banner Manager ★ HIGH PRIORITY
Like HubSpot CTAs + Intercom in-app messaging — highest conversion impact

Backend

Model Popup: type:'banner'|'modal'|'corner', title, body, ctaText, ctaHref, bgColor, trigger:'immediate'|'exit-intent'|'scroll-50', delay:number, active:bool, startAt?, endAt?, createdAt
Routes: GET /api/popups (public, active only); GET /api/popups/all (auth); POST, PUT /:id, DELETE /:id (auth)
Frontend

Admin page PopupManager.tsx /admin/popups
Card list of popups with preview + toggle active
Edit form: type selector, title/body, CTA, color picker, trigger rules, date range
Live preview panel showing popup as it will appear
Public PopupRenderer.tsx component mounted in PublicShell — fetches active popups, renders based on trigger rules
Banner: fixed top/bottom strip with close button
Modal: centered overlay with backdrop
Corner: bottom-right floating card
Feature 4 — Changelog & Announcements
Like Linear/Intercom product changelog — builds trust & reduces support

Backend

Model Changelog: title, slug (unique), body:string, type:'feature'|'improvement'|'fix', published:bool, publishedAt, createdAt
Routes: GET /api/changelog (public, published); GET /api/changelog/all (auth); POST, PUT /:id, DELETE /:id (auth)
Frontend

Public page /changelog — timeline list of all published entries, color-coded by type badges
Admin page ChangelogManager.tsx /admin/changelog
List with publish toggle, WYSIWYG editor (reuse Tiptap from BlogPostEditor)
"What's New" badge count on navbar (optional: show dot if changelog updated since last visit using localStorage)
Feature 5 — Role-Based Access Control
Like Ahrefs 4-tier model (Owner > Admin > Editor > Viewer)

Backend

Add role: 'owner'|'admin'|'editor'|'viewer' field to AdminUser model
Add permissions middleware factory: requireRole('admin') → checks req.adminRole >= threshold
Protect destructive routes (DELETE user, backup restore) with requireRole('owner')
Editor role: can edit sections/blog, cannot manage users/settings
Frontend

Update Users.tsx: show role badge per user, allow Owner to change roles via dropdown
ProtectedRoute.tsx: read role from JWT, redirect if insufficient for current route
Admin sidebar: hide nav items based on role (editors don't see Users, Settings, Audit)
JWT payload: add role field alongside id and email
Feature 6 — Bulk Blog Actions
Standard SaaS table management

Backend — add to server/src/routes/blog.ts:

PATCH /api/blog/bulk (auth) — body { ids, published } → updateMany
DELETE /api/blog/bulk (auth) — body { ids } → deleteMany
Frontend — update BlogManager.tsx:

Checkbox column + select-all header checkbox
Sticky bulk action bar when selected.size > 0: "X selected · Publish · Unpublish · Delete"
Clear selection after action
Feature 7 — Backup & Export
Like Semrush data export + general SaaS best practice

Backend

GET /api/backup (auth) — aggregate: { sections, blogPosts, pricing, testimonials, faq, nav, footer, settings, exportedAt }
POST /api/backup/restore (auth, owner-only) — restore each collection from JSON
Frontend — add section to Settings.tsx:

"Download Backup" → Blob download as serpely-backup-YYYY-MM-DD.json
File input restore → confirm dialog → POST restore
Show last backup timestamp
Feature 8 — Audit Log
Like Ahrefs credit audit log + enterprise compliance

Backend

Add email + role to JWT: jwt.sign({ id, email, role }, ...)
Update AuthRequest middleware to decode adminEmail, adminRole
Model AuditLog: adminEmail, action:'create'|'update'|'delete', resource, detail, ip, createdAt
Helper server/src/lib/audit.ts: logAction(req, action, resource, detail)
Add logAction after mutations in: sections, blog, pricing, testimonials, faq, nav, footer routes
GET /api/audit (auth) — latest 300 entries
Frontend — AuditLogPage.tsx /admin/audit:

Table: colored action badge, resource, admin email, IP, date
Filter by action type + date range
Feature 9 — SEO Manager
Like HubSpot per-page SEO + Google SERP preview

Backend

Model SEOPage: pageKey (unique), metaTitle, metaDescription, ogImage, canonicalUrl, noIndex:bool, updatedAt
Routes: GET /api/seo (auth, all); GET /api/seo/:key (public); PUT /api/seo/:key (auth, upsert)
Frontend

SEOManager.tsx /admin/seo
Page grid: home, about, features, pricing, contact, blog, faq, integrations, how-it-works, compare, product-tour
Each card: page name, title/desc preview, "Edit" button
Inline editor: title (60 char counter), description (160 char counter), OG image upload, noIndex toggle
Live Google SERP preview card (title in blue, URL in green, desc in gray)
Public pages: useEffect on mount → GET /api/seo/:key → document.title = ... + update meta tags
Feature 10 — API Key Manager
Like Ahrefs/Semrush developer API access — enables integrations

Backend

Model APIKey: name, key (hashed), prefix (first 8 chars, stored plain for display), adminId, active:bool, lastUsedAt, createdAt
Routes: GET /api/keys (auth) — list with prefix only (never full key); POST /api/keys (auth) — generate new key, return full key ONCE; DELETE /api/keys/:id (auth)
Middleware verifyAPIKey: checks X-API-Key header as alternative auth
Frontend

Admin page APIKeysManager.tsx /admin/api-keys
Table: key name, prefix (e.g. sk_live_abc1...), created date, last used
"Generate New Key" → show full key in modal ONCE with copy button
Revoke (delete) per key
Feature 11 — Analytics Dashboard (Self-hosted)
Like HubSpot integrated analytics — no GA setup required

Backend

Model PageView: path, referrer, ua, createdAt — TTL index 90 days
POST /api/analytics/track (public) — save view, debounced by IP+path
GET /api/analytics/summary (auth) — { today, last7d, last30d, topPages[{path,count}], dailyViews[{date,count}] }
Frontend

PublicShell in App.tsx: useEffect on location change → POST track (skip admin/login routes)
Enhance Dashboard.tsx:
Stats cards: Today, Last 7 days, Last 30 days views
Top 5 pages bar list (percentage bars, pure CSS)
30-day sparkline chart (pure CSS bars)
Quick links: unread contacts count, subscriber count, recent audit entries
Feature 12 — White-Label / Brand Settings
Like Semrush white-label — enables agency reselling

Backend — extend existing Settings model:

Add fields: accentColor:string, secondaryColor:string, customDomain:string, whitelabelEnabled:bool, emailFromName:string, emailFromAddress:string
Frontend — add section to Settings.tsx:

Color pickers for accent + secondary brand color
Preview: shows navbar/buttons in selected colors
Custom domain field (display only, server config handled externally)
Email from name/address for notifications
Critical Files Summary
Category	Files
New Models (server)	ContactSubmission, Subscriber, Popup, Changelog, AuditLog, SEOPage, APIKey, PageView
New Routes (server)	contact, subscribers, popups, changelog, audit, backup, seo, api-keys, analytics
Modified Routes	blog.ts (bulk), auth.ts (JWT payload), settings.ts (brand fields)
New Middleware	audit.ts helper, apikey.ts verifier
server/src/index.ts	Register 9 new routers
app/src/lib/api.ts	Add typed functions for all 12 features
New Admin Pages	ContactInbox, SubscribersManager, PopupManager, ChangelogManager, AuditLogPage, SEOManager, APIKeysManager
Modified Admin Pages	BlogManager (bulk), Settings (backup + brand), Dashboard (analytics)
AdminLayout.tsx	Add 7 new nav items
App.tsx	Add 7 admin routes + analytics tracking in PublicShell
Public Components	PopupRenderer.tsx (mounted in PublicShell)
Public Pages	/changelog page
Implementation Order (by impact + dependency)
#	Feature	Why first
1	Contact Form Inbox	Enables real lead capture immediately
2	Newsletter Subscribers	Activates newsletter section
3	Popup & Banner Manager	Highest conversion impact, no dependencies
4	Bulk Blog Actions	Fast win, frontend-mostly
5	Backup & Export	Safety before bigger changes
6	Audit Log	Requires JWT change first
7	SEO Manager	Independent, high value
8	Analytics Dashboard	Depends on tracker being live a few days
9	Changelog	Independent, builds brand trust
10	RBAC	Requires JWT change (done with Audit Log)
11	API Key Manager	Developer-facing, lower urgency
12	White-Label Settings	Last, lowest dependency
Verification
Popup: Create banner → / → banner appears; toggle inactive → disappears
Contact: Submit via /contact → /admin/contact shows unread entry
Subscribers: Newsletter signup → /admin/subscribers list updates
Bulk Blog: Select 3 drafts → "Publish" → all turn green
Backup: Download JSON → contains all sections/blog/pricing → restore → content unchanged
Audit: Edit any section → /admin/audit shows update with admin email + resource name
SEO: Set custom title for /pricing → visit /pricing → browser tab shows new title
Analytics: Visit 5 pages → /admin dashboard shows correct view counts + top pages
Changelog: Publish entry → /changelog shows it publicly
RBAC: Editor account → Settings nav item hidden; owner account → all visible
API Key: Generate key → use in X-API-Key header → API request succeeds
"# serpely" 
