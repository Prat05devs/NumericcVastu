# ADR-0010 — Route registry and service modules (deviation from per-module controllers)

**Decision.** Instead of a controller/repository class per entity, routes are declared with `route(router, spec, ...handlers)`: the spec records method, path, access rule, Zod body/query and idempotency. The registry generates OpenAPI (`pnpm openapi` → docs/api/openapi.json), and a test asserts the 64 architecture contracts exist and that every staff route enforces its permission. Business rules that span routes live in `services/` (checkout, payments, refunds, orders, shipping, affiliates, jobs, catalogue, pricing). Prisma is the repository layer; there is no extra abstraction over it.

**Why.** Less indirection to audit, one source for docs and access rules.
