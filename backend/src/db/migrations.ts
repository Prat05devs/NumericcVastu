/**
 * Database migrations for MySQL 8.0+ and MariaDB 10.6+ (Hostinger cloud hosting provides MySQL/MariaDB).
 * Applied in order and recorded in `schema_migrations`, automatically on the first request (src/lib/db.ts) or with
 * `npm run db:migrate`. Each migration is a list of single statements. MySQL commits table changes immediately, so
 * statements are written to be safe to run again (IF NOT EXISTS, INSERT IGNORE). Never edit a migration that has run
 * on a real database; add a new one.
 *
 * Conventions: ids are UUID strings made by the app; money is integer minor units (paise, cents); lists and rules are
 * JSON; times are DATETIME(3) in UTC (every connection sets time_zone '+00:00'); booleans are TINYINT(1).
 */
export type Migration = {version: string; statements: string[]};

const TABLE = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export const migrations: Migration[] = [
  {
    version: '0001_back_office',
    statements: [
      `CREATE TABLE IF NOT EXISTS admin_users (
        id CHAR(36) NOT NULL PRIMARY KEY,
        email VARCHAR(190) NOT NULL UNIQUE,
        name VARCHAR(190) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'marketing')),
        active TINYINT(1) NOT NULL DEFAULT 1,
        failed_logins INT NOT NULL DEFAULT 0,
        locked_until DATETIME(3) NULL,
        last_login_at DATETIME(3) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ${TABLE}`,

      `CREATE TABLE IF NOT EXISTS sessions (
        id CHAR(36) NOT NULL PRIMARY KEY,
        token_hash CHAR(64) NOT NULL UNIQUE,
        admin_id CHAR(36) NOT NULL,
        expires_at DATETIME(3) NOT NULL,
        ip VARCHAR(64) NULL,
        user_agent VARCHAR(300) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_sessions_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
      ) ${TABLE}`,

      // Non-secret configuration: payment mode, public key ids, AI models, affiliate rules.
      `CREATE TABLE IF NOT EXISTS settings (
        setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
        value JSON NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_by CHAR(36) NULL,
        CONSTRAINT fk_settings_admin FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ${TABLE}`,

      // API keys and secrets, AES-256-GCM encrypted with SETTINGS_ENCRYPTION_KEY. Only the last four characters are readable.
      `CREATE TABLE IF NOT EXISTS secrets (
        name VARCHAR(100) NOT NULL PRIMARY KEY,
        ciphertext TEXT NOT NULL,
        last4 VARCHAR(8) NOT NULL,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_by CHAR(36) NULL,
        CONSTRAINT fk_secrets_admin FOREIGN KEY (updated_by) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ${TABLE}`,

      // The websites that call this API: numericcvaastu.com (consultations, courses) and numericcvaastucrystal.in (products).
      `CREATE TABLE IF NOT EXISTS storefronts (
        id VARCHAR(40) NOT NULL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        base_url VARCHAR(255) NOT NULL,
        allowed_origins JSON NOT NULL,
        api_key_hash CHAR(64) NULL UNIQUE,
        api_key_last4 VARCHAR(8) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      ) ${TABLE}`,

      // Everything that can be sold: consultations, courses and products. Prices are the server's source of truth.
      `CREATE TABLE IF NOT EXISTS catalogue_items (
        id VARCHAR(80) NOT NULL PRIMARY KEY,
        storefront_id VARCHAR(40) NOT NULL,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('course', 'consultation', 'product')),
        name VARCHAR(255) NOT NULL,
        url VARCHAR(255) NULL,
        price_inr INT NOT NULL CHECK (price_inr >= 0),
        price_usd INT NOT NULL CHECK (price_usd >= 0),
        active TINYINT(1) NOT NULL DEFAULT 1,
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_items_storefront FOREIGN KEY (storefront_id) REFERENCES storefronts(id)
      ) ${TABLE}`,

      // discount: {type, percentOff, amountOff{INR,USD}, maxDiscount{INR,USD}, minOrder{INR,USD}, appliesTo{kinds[], items[]}}
      `CREATE TABLE IF NOT EXISTS coupons (
        id CHAR(36) NOT NULL PRIMARY KEY,
        code VARCHAR(40) NOT NULL UNIQUE,
        description VARCHAR(255) NOT NULL DEFAULT '',
        discount JSON NOT NULL,
        storefronts JSON NOT NULL,
        starts_at DATETIME(3) NULL,
        ends_at DATETIME(3) NULL,
        max_redemptions INT NULL CHECK (max_redemptions > 0),
        max_per_customer INT NULL CHECK (max_per_customer > 0),
        combinable TINYINT(1) NOT NULL DEFAULT 0,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_by CHAR(36) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_coupons_admin FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ${TABLE}`,

      // Festive and seasonal sales: an automatic discount for a period, plus the banner and decoration the websites show.
      `CREATE TABLE IF NOT EXISTS campaigns (
        id CHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        slug VARCHAR(80) NOT NULL UNIQUE,
        storefronts JSON NOT NULL,
        starts_at DATETIME(3) NOT NULL,
        ends_at DATETIME(3) NOT NULL,
        priority INT NOT NULL DEFAULT 0,
        discount JSON NOT NULL,
        theme JSON NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_by CHAR(36) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CHECK (ends_at > starts_at),
        INDEX idx_campaigns_window (active, starts_at, ends_at),
        CONSTRAINT fk_campaigns_admin FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ${TABLE}`,

      // Influencers and partners. commission: {type: none|percent|fixed, percent, amount{INR,USD}}
      `CREATE TABLE IF NOT EXISTS affiliates (
        id CHAR(36) NOT NULL PRIMARY KEY,
        name VARCHAR(190) NOT NULL,
        email VARCHAR(190) NULL,
        phone VARCHAR(40) NULL,
        platform VARCHAR(80) NULL,
        handle VARCHAR(120) NULL,
        commission JSON NOT NULL,
        notes TEXT NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_by CHAR(36) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_affiliates_admin FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ${TABLE}`,

      // A shareable link: /r/<code>. The random code is compared exactly (binary collation), so Ab3 and ab3 differ.
      `CREATE TABLE IF NOT EXISTS affiliate_links (
        id CHAR(36) NOT NULL PRIMARY KEY,
        code VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
        affiliate_id CHAR(36) NOT NULL,
        coupon_id CHAR(36) NULL,
        storefront_id VARCHAR(40) NOT NULL,
        target_path VARCHAR(255) NOT NULL DEFAULT '/',
        label VARCHAR(120) NOT NULL DEFAULT '',
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_by CHAR(36) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        CONSTRAINT fk_links_affiliate FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
        CONSTRAINT fk_links_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL,
        CONSTRAINT fk_links_storefront FOREIGN KEY (storefront_id) REFERENCES storefronts(id),
        CONSTRAINT fk_links_admin FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ${TABLE}`,

      `CREATE TABLE IF NOT EXISTS affiliate_clicks (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        link_id CHAR(36) NOT NULL,
        referrer VARCHAR(500) NULL,
        user_agent VARCHAR(300) NULL,
        visitor_hash CHAR(64) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_clicks_link_created (link_id, created_at),
        CONSTRAINT fk_clicks_link FOREIGN KEY (link_id) REFERENCES affiliate_links(id) ON DELETE CASCADE
      ) ${TABLE}`,

      // One row per paid order that used a coupon, a sale or an affiliate link. order_ref is the storefront's order id.
      `CREATE TABLE IF NOT EXISTS redemptions (
        id CHAR(36) NOT NULL PRIMARY KEY,
        storefront_id VARCHAR(40) NOT NULL,
        order_ref VARCHAR(120) NOT NULL,
        coupon_id CHAR(36) NULL,
        campaign_id CHAR(36) NULL,
        affiliate_link_id CHAR(36) NULL,
        customer_hash CHAR(64) NULL,
        currency CHAR(3) NOT NULL CHECK (currency IN ('INR', 'USD')),
        subtotal INT NOT NULL,
        discount INT NOT NULL,
        total INT NOT NULL,
        commission INT NOT NULL DEFAULT 0,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE KEY uq_redemptions_order (storefront_id, order_ref),
        INDEX idx_redemptions_customer (coupon_id, customer_hash),
        CONSTRAINT fk_redemptions_storefront FOREIGN KEY (storefront_id) REFERENCES storefronts(id),
        CONSTRAINT fk_redemptions_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL,
        CONSTRAINT fk_redemptions_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL,
        CONSTRAINT fk_redemptions_link FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id) ON DELETE SET NULL
      ) ${TABLE}`,

      `CREATE TABLE IF NOT EXISTS audit_log (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        admin_id CHAR(36) NULL,
        action VARCHAR(80) NOT NULL,
        entity VARCHAR(60) NOT NULL,
        entity_id VARCHAR(120) NULL,
        details JSON NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_audit_created (created_at),
        CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
      ) ${TABLE}`,

      `INSERT IGNORE INTO storefronts (id, name, base_url, allowed_origins) VALUES
        ('numericcvaastu', 'NumericcVaastu', 'https://www.numericcvaastu.com',
         '["https://www.numericcvaastu.com","https://numericcvaastu.com","https://www.numericcvaastu.in","https://numericcvaastu.in","https://www.numericcvaastu.org","https://numericcvaastu.org","http://localhost:3000","http://localhost:3001"]'),
        ('crystal', 'NumericcVaastu Crystal', 'https://numericcvaastucrystal.in',
         '["https://numericcvaastucrystal.in","https://www.numericcvaastucrystal.in"]')`,

      `INSERT IGNORE INTO settings (setting_key, value) VALUES
        ('payments.razorpay', '{"mode":"test","test":{"keyId":""},"live":{"keyId":""},"international":false}'),
        ('payments.paypal', '{"mode":"sandbox","sandbox":{"clientId":""},"live":{"clientId":""}}'),
        ('ai.providers', '{}'),
        ('affiliates', '{"attributionDays":30}')`,
    ],
  },
  {
    version: '0002_website_catalogue',
    // Consultations and courses from the website's catalogue (src/data/offers.ts, 2 November 2026).
    // Re-sync later with `npm run db:sync-website`.
    statements: [
      `INSERT IGNORE INTO catalogue_items (id, storefront_id, kind, name, url, price_inr, price_usd) VALUES
        ('course-launchpad', 'numericcvaastu', 'course', 'Numerology Career Launchpad', '/courses/numerology-career-launchpad', 2999900, 69000),
        ('course-accelerator', 'numericcvaastu', 'course', 'Numerology Income Accelerator', '/courses/numerology-income-accelerator', 7499900, 171000),
        ('course-mastery', 'numericcvaastu', 'course', 'Numerology Legacy Mastery', '/courses/numerology-legacy-mastery', 25000000, 569000),
        ('consult-blueprint', 'numericcvaastu', 'consultation', 'Personal Numerology Blueprint Session', '/consultations/personal-numerology-blueprint', 1129900, 26000),
        ('consult-career', 'numericcvaastu', 'consultation', 'Career Growth Precision Session', '/consultations/career-growth-precision', 510000, 12000),
        ('consult-relationship', 'numericcvaastu', 'consultation', 'Relationship Compatibility Reading', '/consultations/relationship-compatibility', 750000, 18000),
        ('consult-business', 'numericcvaastu', 'consultation', 'Business Destiny Mapping Consultation', '/consultations/business-destiny-mapping', 2099900, 48000),
        ('consult-baby-name', 'numericcvaastu', 'consultation', 'Baby Name Numerology Consultation', '/consultations/baby-name-numerology', 749900, 18000),
        ('consult-name', 'numericcvaastu', 'consultation', 'Name Correction Consultation', '/consultations/name-correction', 749900, 18000),
        ('consult-mobile', 'numericcvaastu', 'consultation', 'Mobile Number Energy Reading', '/consultations/mobile-number-energy', 510000, 12000),
        ('consult-watch', 'numericcvaastu', 'consultation', 'Wristwatch Analysis', '/consultations/wristwatch-analysis', 749900, 18000),
        ('consult-signature', 'numericcvaastu', 'consultation', 'Signature Analysis Consultation', '/consultations/signature-analysis', 749900, 18000),
        ('consult-home-vastu', 'numericcvaastu', 'consultation', 'Residential Vastu Consultation', '/consultations/residential-vastu', 2099900, 48000),
        ('consult-office-vastu', 'numericcvaastu', 'consultation', 'Office & Business Vastu Consultation', '/consultations/office-business-vastu', 3199900, 73000)`,
    ],
  },
];
