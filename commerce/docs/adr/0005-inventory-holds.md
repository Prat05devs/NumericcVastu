# ADR-0005 — Inventory holds by guarded UPDATE; late payment never oversells

**Decision.** Checkout reserves stock in one short transaction, in stable variant-id order:
`UPDATE inventory_items SET reserved_qty = reserved_qty + ? WHERE variant_id = ? AND on_hand_qty - reserved_qty >= ?` (must affect 1 row), plus an `inventory_reservations` row (HELD, expiry). A CHECK keeps `0 ≤ reserved ≤ on_hand`. Capture consumes HELD rows exactly once (guarded status update). If the hold had expired (RELEASED), the capture re-takes stock only if still free; otherwise the order goes to `PAID_REVIEW` for refund or reallocation. Staff stock edits are version-checked and cannot go below held stock. Unique specimens are capped at 1.

**Evidence.** Tests: 100 buyers / 1 gemstone → exactly 1 hold; late payment after sell-out → PAID_REVIEW with stock 0; admin edit racing 20 checkouts keeps invariants.
