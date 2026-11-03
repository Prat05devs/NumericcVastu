# ADR-0013 — Pluggable delivery providers, customer tracking and delivery feedback

**Decision.** `apps/api/src/providers/shipping/` defines `ShippingProviderModule` (optional `book`, `trackingUrl`, `verifyWebhook`, `parseWebhook`, optional `fetchTracking`). Registered today: `manual` (staff enter courier + tracking; tracking links from configured courier URL templates) and `generic` (any courier/aggregator/automation posts a documented JSON event signed with `SHIPPING_WEBHOOK_SECRET`). `_template.ts` shows how to add a partner (e.g. an aggregator) later: booking, label, webhook and polling plug into the same service.

All updates — webhook, polling job (`sync-shipments`), or staff — go through `applyTrackingEvent`: provider-event dedupe, forward-only shipment state ("delivered never reverts"), order → DELIVERED once, commission hold starts, out-for-delivery and feedback emails via the outbox.

Customers track at `/orders/:id` (owner) or `/track` (order number + email; no address/contact data returned), see progress steps, courier scans and the courier link, and can rate the delivery once (rating, on time, packaging, comment). The back office shows per-courier averages.
