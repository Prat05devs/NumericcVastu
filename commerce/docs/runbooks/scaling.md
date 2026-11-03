# Capacity and scaling

**Measured (2026-11-03, developer Apple M1, 8 cores, local MySQL 8.4, one API process, rate limits off — not Hostinger):**
browse mix 50 connections × 30 s → 444 req/s, p50 98 ms, p99 253 ms, 0 errors; checkout 10 virtual users × 30 s → 52 orders/s, checkout p95 123 ms, 0 failures, reserved stock = orders exactly. Raw: `load-results/`.

**These are not Hostinger numbers.** Shared plans have lower and variable CPU. Before any promotion: run `node scripts/load-test.mjs` against staging on the Hostinger plan (Gate 1: 50 browse + 5 checkout for 10 min), watch CPU, RAM, process restarts and MySQL connections in hPanel, and stop at the thresholds in architecture Section 10.

**Cheap wins first:** CDN in front of the web app and media; product pages are already cached 60 s and revalidated on publish.
**Migration triggers:** sustained CPU ≥ 75 %, RAM ≥ 80 %/restarts, 5xx > 1 %, checkout p95 > 1 s, DB connections > 60 % of quota, DB > 70 % of quota → Stage B: move the API + MySQL to a VPS/managed DB; then move rate limits (ADR-0009) and the job lease to a shared store if running more than one API process.
