# Deploying on Hostinger (managed Node.js, Business/"Unlimited" plan)

Two Node.js apps built from this Git repository, one MySQL database and one cron entry. No SSH, Docker, Redis or
workers are needed: the API build applies migrations, seeds the base taxonomy and creates the first owner.
Hostinger installs the pnpm workspace (detected from `commerce/pnpm-lock.yaml`), runs the build script, then runs the
entry file. Apps sleep when idle and wake on the next request, so scheduled work runs from cron (step 4).

## 1. Database
hPanel → **Databases → Management**: create a database and user. Note the database name, user, password and the
MySQL host shown on that page.

## 2. API app
hPanel → **Websites → Add website → Node.js app → Import Git repository** → `NumericcVastu`, then **Set up manually**:

| Setting | Value |
|---|---|
| Framework preset | Express (or Other) |
| Branch | `main` |
| Node.js version | 22.x |
| Root directory | `commerce` |
| Build command | `build:api` (runs `node scripts/hostinger-build.mjs api`) |
| Entry file | `apps/api/dist/server.js` |
| Domain | temporary domain first; later `api.<domain>` |

Environment variables: **Import .env** with the API file (a filled copy of the API section of `.env.example`):
`NODE_ENV=production`, `DATABASE_URL`, new random `SESSION_SECRET`, `ENCRYPTION_KEY` (back it up separately),
`CRON_JOB_SECRET`, `WEB_REVALIDATE_SECRET`, `APP_BASE_URL` / `CORS_ORIGINS` (the admin app's address),
`API_BASE_URL` (this app's address), `ALLOW_LIVE_PAYMENTS=false`, `DEV_TOOLS=false`, and for the first deploy
`BOOTSTRAP_OWNER_EMAIL`, `BOOTSTRAP_OWNER_NAME`, `STAFF_PASSWORD` (12+ characters).

The build then runs `prisma generate`, compiles contracts and API, `prisma migrate deploy`, the idempotent base seed,
and creates the owner if that email has no account. After the first successful deploy, **delete `STAFF_PASSWORD`**
from the app's variables (the owner keeps the password; the owner enrols an authenticator at first sign-in).
Set `SKIP_MIGRATIONS=true` to build without touching the database.

Check `https://<api address>/api/v1/health/ready` → `{"status":"ready"}`.

## 3. Admin / web app
A second Node.js app from the same repository:

| Setting | Value |
|---|---|
| Framework preset | Other (the app runs Next's standalone server through the entry file) |
| Root directory | `commerce` |
| Build command | `build:web` |
| Entry file | `apps/web/.next/standalone/apps/web/server.js` |

Environment variables: `API_INTERNAL_URL` (the API address; fixed into the `/api/v1` proxy **at build time**, so
redeploy after changing it), `NEXT_PUBLIC_SITE_URL` (this app's address), `WEB_REVALIDATE_SECRET` (same as the API).

When the admin address changes, update the API's `APP_BASE_URL` and `CORS_ORIGINS` and redeploy the API too.
The back office is at `/admin`.

## 4. Cron (every minute)
hPanel → **Advanced → Cron Jobs**, custom command:
`curl -fsS -X POST -H "Authorization: Bearer <CRON_JOB_SECRET>" -H "Content-Type: application/json" -d '{}' https://<api address>/api/v1/internal/jobs/run`
Jobs are finite and leased; overlapping runs are safe. Without cron, unpaid orders and stock holds are not released.

## 5. Media
`STORAGE_DRIVER=local` keeps uploads inside the build folder, which **each redeploy replaces**. Fine for a demo; before
real products are uploaded use S3-compatible storage (Cloudflare R2 / Backblaze B2) with a CDN domain:
`STORAGE_DRIVER=s3`, the `OBJECT_STORAGE_*` variables and `PUBLIC_MEDIA_BASE_URL`, and allow `PUT` from the web origin
in the bucket's CORS.

## 6. Email
Staff sign-in uses password + authenticator, so the back office works without email. Customer sign-in codes and order
emails need SMTP: create `orders@<domain>` in Hostinger Email and set `MAIL_DRIVER=smtp`,
`SMTP_URL=smtps://orders%40domain:PASSWORD@smtp.hostinger.com:465`.

## 7. After deploy
Back office → set up MFA → Settings (delivery, tax after review, returns, invoice) → Payments setup in **test** mode →
place a test order end to end → follow `go-live.md`.

## Updating
Push to `main`; both apps rebuild. Migrations are additive, but take a database backup (hPanel → Databases →
phpMyAdmin → Export, or the daily backups) before deploying a change that adds one.
