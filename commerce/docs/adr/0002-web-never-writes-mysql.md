# ADR-0002 — Express owns all authority; the web never touches MySQL

**Status:** accepted

**Decision.** Pricing, stock, orders, payments, refunds, private data, RBAC and audit live in the API. The web app reads public data server-side with short revalidation and proxies browser calls to `/api/v1/*` on its own origin (`next.config.ts` rewrites), so session cookies stay first-party and CSRF/Origin checks apply. The web has no database credentials.

**Consequences.** One place to secure and test. Totals shown in the UI are always the API's numbers (the UI only formats decimal paise strings).
