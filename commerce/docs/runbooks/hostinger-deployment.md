# Deploying on Hostinger (managed Node.js, shared plan)

Two Node.js apps, one MySQL database, one cron entry. No Docker, Redis, workers or WebSockets are needed.

## 1. Database
1. hPanel → **Databases → MySQL**: create a database and user. Note host, name, user and password.
2. On your computer (or CI), with `DATABASE_URL` pointing at it: `pnpm install && pnpm db:generate && pnpm db:migrate:deploy`.
   If remote access is blocked, open hPanel → Remote MySQL for your IP while migrating, then remove it.
3. `pnpm db:seed` (taxonomy only — never `--demo` on production).
4. Create the owner (no default logins exist):
   `STAFF_PASSWORD='a long passphrase' pnpm --filter api exec tsx src/scripts/create-staff.ts you@domain "Your Name" OWNER`

## 2. API app (`api.<domain>`)
1. Build: `pnpm --filter @sc/contracts build && pnpm --filter api build` (or let Hostinger build from Git).
2. hPanel → **Websites → Node.js → Create app**: app root `commerce/apps/api`, entry `dist/server.js`, Node 22/24.
3. Environment variables: everything in the API section of `.env.example` (production values, new secrets). Keep `ALLOW_LIVE_PAYMENTS=false` and `DEV_TOOLS=false`.
4. Attach the subdomain `api.numericcvaastucrystal.in` and enable SSL. Check `https://api…/api/v1/health/ready` → `{"status":"ready"}`.

## 3. Web app (`www.<domain>`)
1. Build with the API URL known at build time: `API_INTERNAL_URL=https://api… NEXT_PUBLIC_SITE_URL=https://www… pnpm --filter web build`.
2. Create a second Node.js app: root `commerce/apps/web`, start command `npm start` (runs `next start`), env `API_INTERNAL_URL`, `NEXT_PUBLIC_SITE_URL`, `WEB_REVALIDATE_SECRET`.
3. Attach `www.numericcvaastucrystal.in` (+ apex redirect) with SSL.

## 4. Cron (every minute)
hPanel → **Advanced → Cron Jobs**: `* * * * * cd ~/…/commerce/apps/api && node --env-file=.env dist/scripts/run-jobs.js >> ~/logs/commerce-jobs.log 2>&1`
(or, if the plan's cron can only call URLs: `curl -fsS -X POST -H "Authorization: Bearer $CRON_JOB_SECRET" -H "Content-Type: application/json" -d '{}' https://api…/api/v1/internal/jobs/run`).
Jobs are finite and leased; overlapping runs are safe.

## 5. Media
Use S3-compatible storage (Cloudflare R2 / Backblaze B2) with a CDN domain: set `STORAGE_DRIVER=s3` and the `OBJECT_STORAGE_*` + `PUBLIC_MEDIA_BASE_URL` variables, and allow `PUT` from the web origin in the bucket's CORS. Local disk storage is for development only (Hostinger redeploys can wipe it).

## 6. Email
Create `orders@<domain>` in Hostinger Email and set `MAIL_DRIVER=smtp`, `SMTP_URL=smtps://orders%40domain:PASSWORD@smtp.hostinger.com:465`. Sign-in codes and order emails depend on this.

## 7. After deploy
Back office → set up MFA → Settings (delivery, tax after review, returns, invoice) → Payments setup in **test** mode → place a test order end to end → follow `go-live.md`.

## Updating
`git pull` → `pnpm install` → `pnpm db:migrate:deploy` (migrations are additive; take a backup first) → rebuild → restart both apps in hPanel.
