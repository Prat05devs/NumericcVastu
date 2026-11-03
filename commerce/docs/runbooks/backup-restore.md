# Backups and restore

**What to back up:** the MySQL database, the object-storage bucket (photos, report PDFs), and — separately and securely — `ENCRYPTION_KEY` (without it payment/AI keys, MFA secrets and private customer details cannot be decrypted).

**Hostinger:** enable automatic backups for the database in hPanel; additionally take a nightly logical dump to off-site storage:
```
mysqldump -h HOST -u USER -p --single-transaction --routines --triggers --hex-blob DBNAME | gzip > commerce-$(date -u +%F).sql.gz
```
Keep 14 daily + 8 weekly. Backups contain personal data: store encrypted, restrict access, delete per the retention policy.

**Restore (rehearsed 2026-11-03 on MySQL 8.4 — identical row counts, all 16 CHECK constraints, `prisma migrate status` up to date):**
1. Create an empty database (`utf8mb4_unicode_ci`).
2. `gunzip -c backup.sql.gz | mysql -h HOST -u USER -p NEWDB`
3. `DATABASE_URL=… npx prisma migrate status` → "up to date".
4. Point the API at it (same `ENCRYPTION_KEY`), restart, check `/health/ready`, sign in to the back office, open an order.
5. Run `pnpm jobs:run` once; check Jobs page for failures. Reconciliation will confirm any payment captured while you were down.
