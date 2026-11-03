# Status, evidence and readiness — 2026-11-03

## Verified test results (this machine; reproduce with the commands in README)
| Suite | Result |
|---|---|
| Contracts unit (money, pricing, state machines, RBAC, patch schemas) | 13 / 13 pass |
| API on MySQL 8.4 — unit, integration, concurrency, recovery, RBAC, 17 back-office scenarios | 62 / 62 pass |
| API on MariaDB 10.11 — same suite | 62 / 62 pass |
| Playwright e2e — desktop + mobile (Pixel 7) | 7 / 7 pass |
| Typecheck (3 packages), ESLint, production web build | pass |
| Migrations vs schema drift | none |
| Backup → restore rehearsal | identical counts, all CHECK constraints, schema up to date |

Key race/recovery evidence: 100 buyers / 1 gemstone → 1 hold; 100 duplicate webhooks → 1 capture, 1 stock consumption; 100 double-clicked payments → 1 provider order; refund replayed 100× → 1 refund, refunds never exceed capture; coupon limited to 5 under a 30-way race → 5; late payment after sell-out → PAID_REVIEW, stock 0, no oversell; lost webhook → recovered by reconciliation; concurrent cron runs → leased, no duplicates; provider outage during refund → retried once, no double refund; every admin route × every role lacking permission → 403.

Back-office scenarios (all exercised through the API, then **every demo row deleted** and each table's checksum verified equal to the starting state; test databases are dropped after each run): settings groups; payment keys encrypted + mode switching + live lock; Razorpay test mode end to end (incl. authorised → server capture); PayPal sandbox flow end to end (USD conversion, server capture, verified webhook, USD refunds); AI keys; storefronts; staff + MFA + role changes; catalogue draft → publish gate → photos → stock → publish; certificates; festive campaign + coupons; CMS policy legal gate; order desk → courier webhooks → tracking portal → delivery feedback → return → refund → invoice → reports → audit; partner programme invite → terms → signed links → attribution → hold → approval → payout with TDS → clawback flag → suspension; wristwatch quote versions → accept → pay → complete; consultation enquiries; review moderation; data export/erasure; operations.

## Load test (not hosting capacity)
Apple M1 / 8 cores / local MySQL, one API process, rate limits off: browse 444 req/s (p99 253 ms, 0 errors) at 50 connections; checkout 52 orders/s (p95 123 ms, 0 failures) with 10 virtual users; stock invariants exact. Raw JSON in `load-results/`.

## Release gates
| Gate | State |
|---|---|
| Functional correctness, races, recovery, RBAC, privacy | **Pass** (automated) |
| Payments in test/sandbox with real provider accounts | **Pending** — needs your Razorpay test keys / PayPal sandbox app (adapters verified against API-compatible fakes only) |
| Live payments | **Locked** — requires go-live checklist + `ALLOW_LIVE_PAYMENTS=true` |
| Legal policies published | **Pending** — no policy text was written; needs your reviewed text |
| Tax configuration | **Pending** — your adviser's rates per product group |
| Real catalogue, photos, certificates | **Pending** — only DEMO fixtures exist |
| Performance on Hostinger | **Not measured** — run `load-test.mjs` on staging |
| Deployment on Hostinger | **Not done** — awaiting your approval and credentials |

## Pending inputs from you
1. Production domains (web + `api.` subdomain) and Hostinger access/plan details.
2. Razorpay: test keys now; live keys after KYC. PayPal: sandbox app now; live app + business approval; the ₹/USD rate you want to use.
3. Tax rates per product group, GSTIN and registered address for invoices (reviewed by your adviser).
4. Delivery options and fees, couriers you use, return window — and the reviewed text of shipping, returns, privacy, terms and partner terms.
5. Real product list, original photos, lab reports.
6. SMTP mailbox (e.g. orders@…), object storage (Cloudflare R2/B2) credentials.
7. Partner programme: commission rates, hold period, minimum payout, and whether TDS applies (Section 194H, 2 % above ₹20,000/year as of FY 2025-26 — confirm with your accountant).
8. Whether to delete the superseded `backend/` prototype at the repo root.

## Unsupported on Hostinger shared hosting (by design, documented)
No Redis/queues/WebSockets: jobs run from cron every minute (emails can lag up to ~1 minute; sign-in codes are sent immediately). Rate limits are per process (fine for one API process). Local disk is not durable for media → object storage required.

## Readiness verdict
**Feature-complete and verified for a staging launch; not production-ready yet.** The commerce core (stock holds, payments, refunds, webhooks, cron, RBAC, privacy) passes every automated gate on MySQL and MariaDB. Going live still needs your real credentials, reviewed tax and legal content, real catalogue data, a Hostinger staging deploy, and a load test on that plan. **It is not certified for high traffic**: capacity on the shared plan is unmeasured, and the migration path in `docs/runbooks/scaling.md` applies once traffic grows.
