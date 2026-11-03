# ADR-0012 — Partner (affiliate / influencer) programme

**Context.** The business wants influencers to share links and coupons, see their results, and be paid — securely.

**Decision (modelled on established programmes):**
- Links carry an unguessable random code (≈59 bits, binary collation). Visiting `/r/<code>` records a click (salted visitor hash, no raw IP; bot user agents flagged) and returns a **signed** attribution token (click id + expiry + HMAC), stored as a first-party httpOnly cookie for the partner's window (default 30 days). Checkout trusts only a valid token, so attribution cannot be forged by typing codes or stuffing cookies.
- Last click wins; a partner coupon typed by the customer outranks a different partner's click. Coupons can be **locked to their link** to stop coupon-site leakage.
- Commission = agreed % or fixed amount on merchandise actually paid (after discounts, excluding shipping and tax). It is `PENDING` until delivery + the configured hold (return window), then auto-`APPROVED` by cron; refunds reverse it proportionally; a refund after payout flags `CLAWBACK_NEEDED`. Self-referrals (partner's own account or email) are recorded at zero and rejected. Suspension stops attribution immediately.
- Partners sign in to `/partner` with their invited email (OTP), accept the current published terms (versioned), create links (if allowed), and see clicks, conversion, sales, pending/available/paid balances, a ledger with masked order codes and **no customer details**, and payout statements. Payout details (UPI/bank, PAN) are encrypted; only a hint is shown.
- Payouts are created by FINANCE from the approved balance (minimum configurable), with TDS deducted **only if** a rate/threshold is configured after tax advice (Section 194H commission was 2% with a ₹20,000 yearly threshold as of FY 2025-26 — to be confirmed by the business's accountant), then marked paid with the transfer reference.
