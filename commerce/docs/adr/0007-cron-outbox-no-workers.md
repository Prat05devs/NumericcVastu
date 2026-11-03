# ADR-0007 — Finite cron jobs + MySQL outbox (no queue workers)

**Decision.** Side effects (emails, cache revalidation, finance alerts, refund retries) are written to `job_outbox` in the same transaction as the state change, with a dedupe key. Hostinger Cron runs `node dist/scripts/run-jobs.js` every minute (or `POST /api/v1/internal/jobs/run` with a bearer secret). Each job takes a per-job lease through a conditional `UPDATE site_settings` (works on MySQL and MariaDB; no session locks), processes a bounded batch and exits. Jobs: expire-holds, cancel-unpaid (asks the provider first), reconcile, outbox (claim with lease, exponential backoff, DEAD after max attempts), approve-commissions, sync-shipments, cleanup.

**Evidence.** Concurrent double cron run → second run reports `SKIPPED_LOCKED`; no duplicate effects.
