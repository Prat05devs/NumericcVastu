# ADR-0003 — MySQL 8 / MariaDB 10.6+ via Prisma 7 with the MariaDB driver adapter

**Status:** accepted

**Decision.** Prisma 7.10 (`prisma-client` generator, `prisma.config.ts`) with `@prisma/adapter-mariadb` and a bounded pool (`DATABASE_POOL_SIZE`, default 5). CHECK constraints, binary collations and data fixes that Prisma cannot express are hand-written SQL in the migrations. Critical concurrency paths use raw guarded `UPDATE … WHERE` statements, not read-modify-write.

**Conventions.** ULID `CHAR(26)` ids; money `BIGINT` paise; `DATETIME(3)` UTC; snake_case columns mapped to camelCase.

**Not done:** Prisma 8 (release candidate at the time) — not used in production.
