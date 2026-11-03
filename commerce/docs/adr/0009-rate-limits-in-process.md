# ADR-0009 — In-process rate limits (single API process)

**Decision.** Fixed-window limits per bucket (auth, checkout, browse, search, forms, webhooks, partner clicks) kept in API memory. Correct for one API process on Hostinger; counters reset on restart. **Migration trigger:** if the API is ever scaled to more than one process/instance, move limits to a shared store (Redis or a MySQL table) — see docs/runbooks/scaling.md.
