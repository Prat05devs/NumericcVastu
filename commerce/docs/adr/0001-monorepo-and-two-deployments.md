# ADR-0001 — pnpm monorepo, exactly two Node deployments

**Status:** accepted · 2026-11-03

**Context.** Hostinger managed Node.js (shared 3 GB / 2 cores) allows a small number of Node apps, no Docker, Redis, workers or daemons (brief, hard constraints).

**Decision.** One pnpm workspace: `apps/web` (Next.js: storefront, account, tracking, partner portal, back-office UI), `apps/api` (Express: all commerce authority), `packages/contracts` (Zod DTOs, money, pricing, state machines, RBAC shared by both), `prisma/` (schema + SQL migrations). Production runs exactly two Node apps: web and API. Scheduled work runs from Hostinger Cron (ADR-0007).

**Consequences.** Shared types stop drift between UI and API. Contracts are pure and unit-tested. The API is the only process that imports Prisma.
