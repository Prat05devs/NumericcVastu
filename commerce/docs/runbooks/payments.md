# Payments: Razorpay and PayPal

Everything below is also shown, with your exact webhook URLs, in **Back office → Payments setup**.

## Modes
`mock` (simulator, development only) → `test` (Razorpay test keys / PayPal sandbox; no real money) → `live` (real money; locked until go-live approval: owner + confirmation + live credentials + reviewed tax + `ALLOW_LIVE_PAYMENTS=true`). Switching never needs a code change. Keys are stored encrypted; only the last characters are ever shown.

## Razorpay (India — UPI, cards, netbanking, wallets)
1. dashboard.razorpay.com → Test mode → Account & Settings → API Keys → generate. Save Key Id + Key Secret in the back office (environment Test).
2. Webhooks → add `https://api.<domain>/api/v1/webhooks/payments/razorpay`, a long random secret (save the same secret in the back office), events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`.
3. Payment capture: automatic recommended (the API also captures authorised payments itself).
4. After KYC, repeat in Live mode with live keys and a separate live webhook secret.

How it works: checkout reserves stock and creates our order → the API creates a Razorpay order → Razorpay Checkout opens → the webhook (HMAC-verified over raw bytes) confirms payment → stock is consumed once. If the customer closes the browser, the reconcile job asks Razorpay directly. Refunds go through the Razorpay refund API with our refund id as the receipt (no double refunds).

## PayPal (overseas customers — USD)
PayPal does not process domestic Indian payments, so it is offered to overseas buyers in USD. Set **Settings → International** (₹ per USD, reviewed by you); PayPal stays hidden until then. Your PayPal business account must be able to receive international payments.
1. developer.paypal.com → Apps & Credentials → **Sandbox** → create a REST app → save Client ID + Secret (environment Test / Sandbox).
2. App → Webhooks → add `https://api.<domain>/api/v1/webhooks/payments/paypal`, events `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.REFUNDED` → save the **Webhook ID** (signatures are verified with PayPal using it).
3. Test with a sandbox buyer; then create the Live app + webhook and save them as Live.

How it works: we create a PayPal order (USD, at the stored rate) → the buyer approves in PayPal's popup → our server captures it server-to-server (also triggered by the APPROVED webhook or reconciliation if the browser closes) → `PAYMENT.CAPTURE.COMPLETED` confirms. Refunds are converted at the same rate; the last refund returns exactly the remaining cents.

## Adding another provider
Implement `ProviderModule` in `apps/api/src/providers/payments/<name>.ts`, register it in `index.ts`, add its credential fields to the back office. Checkout, webhooks, reconciliation and refunds are shared.
