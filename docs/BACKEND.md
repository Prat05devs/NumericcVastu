# Back office and commerce backend: design

Status, 2 November 2026: the first version is built in [`backend/`](../backend/README.md) and tested locally. Neither website calls it yet; connecting them is the next step, together with the full e-commerce architecture for products.

## What it is for

One backend serves two websites and three kinds of things sold:

| Website | Sells | Today |
|---|---|---|
| numericcvaastu.com (also .in, .org) | Consultations, courses | Next.js; prices in `src/data/offers.ts`; Razorpay and PayPal keys in environment variables |
| numericcvaastucrystal.in | Products: rudraksha, crystals, gemstones, yantras, wristwatches on demand | WooCommerce; to be rebuilt on this backend |

Marketing and payment settings change without code or redeploys: coupons, affiliate links, festive sales and their decorations, payment keys, the switch between test and live payments, and AI model keys.

## Architecture

```
 numericcvaastu.com ─┐                         ┌─ MySQL / MariaDB (cloud hosting)
                     ├── HTTPS ── backend ─────┤
 numericcvaastucrystal.in ┘   (Next.js app:    └─ Razorpay, PayPal, AI providers
                               API + back office)
```

- **One Next.js app** in `backend/`, deployed as a Node.js web app on the cloud hosting (Hostinger), for example at `go.numericcvaastu.com`. It uses the same stack as the website, and one deployment holds both the API and the dashboard. It can also run on Vercel against the same database.
- **MySQL 8.0+ / MariaDB 10.6+**, the database the cloud hosting provides, with plain SQL migrations (`src/db/migrations.ts`) through the `mysql2` driver. Locally it runs in Docker (`npm run db:up`). The tests run against both MySQL 8.4 and MariaDB 10.11. No ORM is used yet, so the coming e-commerce design is free to choose its own data layer.
- **MySQL details handled once in `src/lib/db.ts`:** every connection works in UTC; booleans are `TINYINT(1)` read back as true/false; JSON columns are parsed (MariaDB stores JSON as text); ids are UUIDs made by the app; affiliate codes use a binary collation so matching is case-exact; migrations take a `GET_LOCK` so two servers never migrate at once.
- **Money** is stored as integer paise and cents, with an INR and a USD price per item, matching the website's catalogue. Discounts round down to whole rupees or dollars.
- **Times** are stored in UTC and typed and shown in IST in the dashboard.

## Data model

| Table | Holds |
|---|---|
| `storefronts` | Each website: address, allowed browser origins, API key hash |
| `catalogue_items` | Everything sellable, with `kind` = course, consultation or product, and server-side INR/USD prices. Consultations and courses are seeded from the website |
| `coupons` | Code, discount rule, websites, validity window, total and per-customer limits, whether it combines with a sale |
| `campaigns` | Sales: schedule, priority, discount rule (or none), and the **theme**: badge, banner text and link, four colours, decoration style, hero image, countdown |
| `affiliates` | Influencers and partners, contact details, commission (none, percentage or fixed per order) |
| `affiliate_links` | Random 10-character code, landing page, website, optional coupon, on/off |
| `affiliate_clicks` | One row per visit through a link; the visitor is a salted, daily-rotating hash, never an IP address |
| `redemptions` | One row per paid order that used a coupon, sale or affiliate link: amounts, discount, commission; unique per website order |
| `settings`, `secrets` | Configuration; API keys encrypted with AES-256-GCM, only the last four characters readable |
| `admin_users`, `sessions`, `audit_log` | Accounts and roles, sessions, and a record of every change |

A **discount rule** has the same shape everywhere: percentage (with an optional cap) or a fixed amount per currency; optional minimum order; and a target of all items, some kinds, or specific items.

## Pricing rules

`src/lib/pricing.ts` is pure and covered by `backend/tests/pricing.test.ts`.

1. Prices always come from `catalogue_items`. Anything price-like sent by a browser is ignored.
2. Of the sales running now for that website, the one that saves this cart the most applies.
3. A coupon combines with the sale only if it is marked combinable; otherwise the customer gets the better of the two, and the quote says why.
4. A discount touches only the items it targets, and the minimum order counts only those.
5. Discounts round down to whole rupees or dollars, are capped, and never exceed the order.

## Affiliate links

An affiliate gets a link such as `https://go.numericcvaastu.com/r/N5eoUSxvZk`. The code is random and stored, not computed. It reveals nothing about the person or the discount, cannot be guessed, and can be switched off at any moment. "Encrypted URL" in the brief is met this way rather than with real encryption, because a stored random code can also be revoked and tracked.

1. `/r/<code>` records the click and redirects to the chosen page with `?ref=<code>`.
2. The website keeps `ref` for the attribution window (default 30 days, set in the dashboard) and sends it with every quote.
3. The link's coupon applies automatically, unless the customer types another code.
4. After payment, the website's server records the order, and the affiliate earns commission on the amount paid.

## API for the websites

| Endpoint | Caller | Purpose |
|---|---|---|
| `GET /api/v1/storefront/config?storefront=` | Browser (CORS: allowed origins only) | Current sale and theme, public payment key ids and mode, attribution days |
| `POST /api/v1/pricing/quote` | Browser or server | `{storefront, currency, items:[{id,quantity}], couponCode?, ref?, customerEmail?}` → lines, sale, coupon, totals, notices, and why a code was refused |
| `POST /api/v1/redemptions` | Website **server**, `Authorization: Bearer <storefront API key>` | After a verified payment: recomputes the quote, counts the coupon use, credits the affiliate; repeating a call is harmless |
| `GET /r/<code>` | Visitors | Affiliate link redirect |
| `GET /api/health` | Monitoring | API and database up |

## Payments and AI keys from the dashboard

- Razorpay test and live keys (key id, key secret, webhook secret), PayPal sandbox and live (client id, secret), and a per-provider switch between test and live. Going live needs live keys and an explicit confirmation. **Test keys** checks them against Razorpay or PayPal, and every change is audited.
- AI providers: OpenAI, Anthropic (Claude), Google (Gemini), DeepSeek and Moonshot (Kimi). Each has a key, a default model, an on/off switch and a test that lists available models. Code uses `aiProvider('anthropic')`; adding a provider is one entry in `AI_PROVIDERS`.
- Only `SETTINGS_ENCRYPTION_KEY`, `DATABASE_URL` and the setup token stay in the hosting environment.

**Not yet switched over:** the website's checkout (`src/lib/razorpay.js`, `src/lib/paypal.js`) still reads keys from its own environment. In the next step, payment order creation, verification and webhooks move into this backend and read `paymentCredentials()`, so the dashboard switch takes effect everywhere. Secrets are never sent to a website.

## Security

- Back office: scrypt-hashed passwords, 12-hour httpOnly session cookies, lockout after 5 failed sign-ins for 15 minutes, and roles (owner: everything; admin: marketing, catalogue and audit; marketing: coupons, affiliates and sales). Every page and server action checks the role. Pages send `noindex` and anti-framing headers.
- The first owner can only be created with `ADMIN_SETUP_TOKEN`; remove it after setup.
- Secrets: AES-256-GCM with a key held only in the environment; write-only fields; never logged or audited.
- API: CORS restricted to each website's origins; order recording requires the website's API key, stored as a SHA-256 hash and shown once.

## Next steps (for the e-commerce architecture)

1. Products: full product records (variants, images, stock, on-demand items such as wristwatches) and product management screens.
2. Orders and customers: carts, orders, order status, invoices (GST), refunds, emails.
3. Payments in the backend: Razorpay and PayPal order creation, verification and webhooks using the dashboard keys and mode.
4. Connect numericcvaastu.com: read storefront config to show the sale banner and decorations, keep `ref` from affiliate links, quote at checkout, record redemptions after payment.
5. Rebuild numericcvaastucrystal.in on the same API and migrate its WooCommerce products.
6. Affiliate payouts: statements per period and marking commission as paid.
7. Operations: rate limiting on public endpoints, backups, error monitoring, two-factor sign-in for owners.
