# Go-live checklist (human approval required)

Live payments stay locked until **every** item is ticked and the owner sets `ALLOW_LIVE_PAYMENTS=true` on the API and switches Payments setup → Live.

- [ ] Real products imported (`catalogue-import.md`), original photos, stock counted; all DEMO fixtures removed (`pnpm db:seed -- --remove-demo`).
- [ ] Certificates registered only with real issuer reports, verified against the issuer.
- [ ] Tax groups and mode entered and **reviewed by your tax adviser** (Settings → Tax); GSTIN/invoice details entered.
- [ ] Delivery options, couriers and hold time set; one real parcel shipped and tracked.
- [ ] Shipping, returns, privacy, terms and partner-terms pages written, **legally reviewed**, and published by the owner with the reviewer's name.
- [ ] Razorpay KYC approved; live keys + live webhook saved; a ₹1–₹10 real payment and refund done.
- [ ] (If used) PayPal business account approved for international receipts; live app + webhook saved; exchange rate reviewed.
- [ ] SMTP working (sign-in code received, order email received).
- [ ] Hostinger cron running every minute (Back office → Jobs shows recent runs, no failed jobs).
- [ ] Backups enabled and one restore rehearsed (`backup-restore.md`).
- [ ] Staging and production use different secrets and databases.
- [ ] Load test repeated on the Hostinger plan (`scaling.md`) and results acceptable.
- [ ] All staff have MFA; owner account email is secure.
