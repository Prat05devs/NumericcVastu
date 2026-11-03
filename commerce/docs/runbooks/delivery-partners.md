# Delivery, tracking and delivery partners

## Today (no partner integration needed)
1. Settings → Delivery: delivery options (fee, free-above, time text), **couriers** with their public tracking URL (`…/{tracking}`), stock hold minutes.
2. Order desk → Ship: courier + tracking number (+ expected date). The customer gets an email and a tracking link.
3. Update status from the order page (Packed → In transit → Out for delivery → Delivered). Status only moves forward.
4. Customers track at `/orders/<id>` or `/track` (order number + email), and rate the delivery after it arrives. See averages per courier in Back office → Delivery feedback.

## Automatic updates from a courier or aggregator
Any partner (or an integration tool) can POST status events to `https://api.<domain>/api/v1/webhooks/shipping/generic`, signed with `SHIPPING_WEBHOOK_SECRET` (`X-Signature` = hex HMAC-SHA256 of the raw body):
```json
{"eventId":"unique-scan-id","trackingNo":"AWB123","courier":"delhivery","status":"IN_TRANSIT","occurredAt":"2026-11-03T10:00:00Z","location":"Delhi hub","description":"Arrived at hub"}
```
Statuses: `PACKED, SHIPPED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, FAILED, RETURNED`. Duplicates and out-of-order scans are ignored safely.

## Adding a delivery partner with its own API (booking, labels, tracking)
Copy `apps/api/src/providers/shipping/_template.ts` to `<partner>.ts`, implement `book`, `verifyWebhook`, `parseWebhook`, optional `fetchTracking`, register it in `index.ts`, and add its API key to the encrypted vault. Booking, labels, webhooks, the polling job (`sync-shipments`), customer tracking, notifications and feedback then work without other changes. Map unknown partner status codes to nothing (skip) rather than guessing.
