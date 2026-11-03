# ADR-0008 — Sessions, email OTP for customers, password + TOTP MFA for staff, RBAC

**Decision.** Opaque random session tokens stored as SHA-256 hashes; httpOnly SameSite=Lax cookies (`sc_session` customers, `sc_staff` back office). Customers sign in with a 6-digit email code (hashed, 10-minute expiry, 5 attempts, generic responses, rate limited). Staff: scrypt password, lockout after 5 failures, mandatory TOTP enrolment before any back-office route. Roles OWNER, SUPPORT, CATALOG_MANAGER, FULFILLMENT, FINANCE, MARKETING; the permission matrix lives in `packages/contracts/access.ts` and every admin route declares its permission. CSRF: double-submit token + Origin allowlist for cookie-backed writes.

**Evidence.** A generated test calls every admin route as every role lacking its permission and expects 403; anonymous callers get 401/403.
