# Common incidents

| Symptom | Where | What to do |
|---|---|---|
| Order "Paid — needs review" | Order page | Payment arrived after the stock hold lapsed or the amount differed. If stock exists → Approve; otherwise refund in full and tell the customer. |
| Customer paid but order still "awaiting payment" | Order page → Check payment with provider | Reconciliation runs every minute too; check Jobs for failures and the provider dashboard for the webhook delivery log. |
| Refund stuck "processing" | Order page / Jobs | Provider was unavailable; the outbox retries with the same receipt id (never double). If it fails permanently, a finance alert is logged — retry from Jobs. |
| Failed jobs | Jobs & webhooks | Read the error, fix the cause (SMTP credentials, revalidate secret), click Retry. |
| Webhook 401s | Provider dashboard | Webhook secret / Webhook ID in the back office does not match the provider. |
| Partner disputes a commission | Partners → ledger | Flags explain automatic rejections (self-referral, suspended). Decisions are audited. |
| Suspected account misuse | Staff → disable / reset 2FA | Sessions end immediately. Review the audit log. |
