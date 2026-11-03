# ADR-0004 — Money as bigint paise; one pricing engine

**Decision.** All amounts are `bigint` paise in code and `BIGINT` in MySQL, decimal strings on the wire. `packages/contracts/pricing.ts` is the only pricing engine: discounts → shipping → tax → total, largest-remainder allocation of discounts/tax across lines, percentage discounts floored to whole rupees. Tax rates, shipping fees and return rules are **configuration** entered and reviewed in the back office; nothing is assumed (unset tax = `TAX_NOT_CONFIGURED` warning, and live payments stay locked).

**Order snapshots.** Every order stores line prices, discount and tax per line, the pricing snapshot and address snapshots; history is never recalculated from current prices.

**Multi-currency (PayPal).** Orders stay in INR. A provider may charge another currency (PayPal: USD) at a rate entered and reviewed in settings; the payment row stores `provider_currency`, `provider_amount_minor` and the rate. The capture amount check compares against those, and refunds convert proportionally (the final refund takes exactly the remaining cents).
