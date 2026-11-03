# NumericcVaastu back office and commerce API

One backend for both websites: **numericcvaastu.com** (consultations and courses) and **numericcvaastucrystal.in** (products). It holds the back office dashboard and the API the websites call for prices, coupons, affiliate links, sales and payment settings. The design is in [../docs/BACKEND.md](../docs/BACKEND.md).

## Run it locally

```sh
cd backend
npm install
npm run db:up      # local MySQL 8.4 in Docker (or use any MySQL/MariaDB you have)
cp .env.example .env.local
# Generate an encryption key and put it in SETTINGS_ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Choose any ADMIN_SETUP_TOKEN, then:
npm run dev        # http://localhost:4000/admin
```

The backend uses **MySQL 8.0+ or MariaDB 10.6+**, the database your cloud hosting provides. Tables are created on the first request (or with `npm run db:migrate`).

The first visit to `/admin` asks for the setup token and creates the owner account. Or run `npm run admin:create -- you@example.com "Your Name"`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Back office and API at http://localhost:4000 |
| `npm test` | Pricing rules and encryption; add `TEST_DATABASE_URL=mysql://root:root@127.0.0.1:3306/numericcvaastu_test` to also run the database tests (the `_test` database is emptied first) |
| `npm run db:up` / `db:down` | Start / stop the local MySQL in Docker |
| `npm run typecheck` / `npm run build` | Type check / production build |
| `npm run db:migrate` | Applies pending database migrations (the app also does this on first use) |
| `npm run db:sync-website` | Copies consultation and course prices from `../src/data/offers.ts` into the catalogue |
| `npm run admin:create -- email "Name" [owner\|admin\|marketing]` | Creates an account, or resets its password |

## Deploy on the cloud hosting (Hostinger)

1. **Database:** in hPanel → Databases → MySQL Databases, create a database and a user with a strong password.
2. **App:** hPanel → Websites → add a **Node.js web app** (Next.js), connected to this GitHub repository with **root directory `backend`**, build command `npm run build`, start command `npm start`, Node 22 or newer. Give it a subdomain such as `go.numericcvaastu.com`.
3. **Environment variables** for the app:
   - `DATABASE_URL=mysql://USER:PASSWORD@localhost:3306/DATABASE` (`localhost` because the app and database are on the same hosting)
   - `SETTINGS_ENCRYPTION_KEY`, `ADMIN_SETUP_TOKEN`, `PUBLIC_BASE_URL=https://go.numericcvaastu.com`
4. Open `/admin`, create the owner account, then remove `ADMIN_SETUP_TOKEN`.
5. Under **Storefronts & API keys**, create an API key for each website and add it to that website's environment as `BACKOFFICE_API_KEY`.

Hostinger stops Node.js apps that receive no traffic for a while and starts them on the next request, so the first request after a quiet period is slower. If that matters, add an uptime monitor that calls `/api/health` every few minutes.

**Alternative:** run the backend on Vercel (a second project with root directory `backend`) and keep the database on Hostinger. Enable **Remote MySQL** in hPanel for the database (Vercel has no fixed IP address, so allow any host and rely on a strong password), use the remote host name in `DATABASE_URL`, and set `DATABASE_SSL=true` if the server supports TLS.

Keep `SETTINGS_ENCRYPTION_KEY` safe and never change it casually: payment and AI keys saved in the dashboard are encrypted with it, and must be entered again if it changes.

## Layout

```
src/db/migrations.ts     database schema, applied in order
src/lib/pricing.ts       the pricing engine (pure, tested)
src/lib/commerce.ts      catalogue, coupons, sales, affiliate links, quotes, recorded orders
src/lib/settings.ts      settings and encrypted secrets: payments, AI models
src/lib/auth.ts          sign-in, sessions, roles
src/app/admin/           the back office
src/app/api/v1/          the API used by the websites
src/app/r/[code]         affiliate link redirect
```
