# ADR-0011 — One back office and API shared by the crystal shop and the main site

**Status:** accepted · supersedes the standalone `backend/` prototype at the repo root.

**Decision.** The commerce API serves both storefronts (`crystal`, `numericcvaastu`, selected with `X-Storefront`). Extensions beyond the 46 architecture entities: `storefronts`, `campaigns` (festive sales + site themes), `affiliates`, `affiliate_links`, `affiliate_clicks`, `affiliate_commissions`, `affiliate_payouts`, `secrets` (encrypted payment/AI keys), `otp_challenges`, `delivery_feedback`. Coupons map onto `discounts`.

**Consequences.** The old `backend/` folder is no longer needed once its data (if any) is migrated; deleting it is left to the owner.
