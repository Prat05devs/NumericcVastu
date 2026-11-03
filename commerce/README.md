# NumericcVaastu Commerce

Crystal shop (Rudraksha · Gemstones · Crystals · Yantras · made-to-order numerology wristwatch), customer accounts and order tracking, partner (influencer) programme, and one shared back office — built to the Sacred Commerce architecture for Hostinger managed Node.js.

```
apps/web      Next.js 16: storefront, account, tracking, partner portal, back office (talks only to the API)
apps/api      Express 5 + Prisma 7: pricing, stock, orders, payments, refunds, shipping, RBAC, audit, cron jobs
packages/contracts   Zod DTOs, money (bigint paise), pricing engine, state machines, RBAC matrix
prisma/       schema + SQL migrations (MySQL 8 / MariaDB 10.6+)
docs/         ADRs, OpenAPI (docs/api/openapi.json), runbooks, STATUS.md (test evidence, gates, pending inputs)
```

## Run locally
```bash
pnpm install
cp .env.example .env            # then set DATABASE_URL=mysql://root:root@127.0.0.1:3316/commerce and dev secrets; DEV_TOOLS=true, NODE_ENV=development
pnpm db:up                      # Docker MySQL 8.4 on 127.0.0.1:3316 (dev only)
pnpm db:generate && pnpm db:migrate:deploy
pnpm db:seed -- --demo          # taxonomy + clearly labelled DEMO products (remove with -- --remove-demo)
STAFF_PASSWORD='dev passphrase 123' pnpm --filter api exec tsx --env-file=../../.env src/scripts/create-staff.ts you@example.com "You" OWNER
pnpm --filter @sc/contracts build
pnpm --filter api dev           # http://localhost:4000/api/v1/health/ready
pnpm --filter web dev           # http://localhost:3000  ·  /admin  ·  /partner
```
Payments start in **mock** mode: the order page shows a simulator. Sign-in codes appear at `GET /api/v1/dev/mailbox`.

## Tests
```bash
pnpm test              # contracts + API: unit, integration, concurrency, recovery, RBAC, 17 back-office scenarios (throwaway DB, dropped afterwards)
TEST_DATABASE_URL=mysql://root:root@127.0.0.1:3317/commerce_test pnpm --filter api test   # same on MariaDB (docker compose --profile mariadb up -d)
pnpm test:e2e          # Playwright desktop + mobile against a throwaway DB (build the web app first)
pnpm load:test         # load test → load-results/ (local numbers are not hosting capacity)
pnpm lint && pnpm -r typecheck && pnpm openapi
```

## Deploy
`docs/runbooks/hostinger-deployment.md`, then `docs/runbooks/go-live.md`. Payments: `docs/runbooks/payments.md`. Delivery partners: `docs/runbooks/delivery-partners.md`. Status and readiness: `docs/STATUS.md`.
