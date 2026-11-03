-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(26) NOT NULL,
    `email` VARCHAR(254) NULL,
    `phone` VARCHAR(20) NULL,
    `name` VARCHAR(120) NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `verified_at` DATETIME(3) NULL,
    `password_hash` VARCHAR(255) NULL,
    `mfa_secret_enc` TEXT NULL,
    `mfa_enabled_at` DATETIME(3) NULL,
    `failed_logins` INTEGER NOT NULL DEFAULT 0,
    `locked_until` DATETIME(3) NULL,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    INDEX `users_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` CHAR(26) NOT NULL,
    `user_id` CHAR(26) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `kind` VARCHAR(10) NOT NULL DEFAULT 'CUSTOMER',
    `mfa_verified` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `device_metadata` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sessions_token_hash_key`(`token_hash`),
    INDEX `sessions_user_id_expires_at_idx`(`user_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_addresses` (
    `id` CHAR(26) NOT NULL,
    `user_id` CHAR(26) NOT NULL,
    `label` VARCHAR(40) NULL,
    `full_name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `line1` VARCHAR(200) NOT NULL,
    `line2` VARCHAR(200) NULL,
    `locality` VARCHAR(120) NULL,
    `city` VARCHAR(80) NOT NULL,
    `region` VARCHAR(80) NOT NULL,
    `postal_code` VARCHAR(10) NOT NULL,
    `country` CHAR(2) NOT NULL DEFAULT 'IN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `customer_addresses_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_consents` (
    `id` CHAR(26) NOT NULL,
    `user_id` CHAR(26) NULL,
    `subject_ref` CHAR(64) NULL,
    `purpose` VARCHAR(40) NOT NULL,
    `version` VARCHAR(20) NOT NULL,
    `accepted_at` DATETIME(3) NOT NULL,
    `source` VARCHAR(40) NOT NULL,

    INDEX `customer_consents_user_id_purpose_idx`(`user_id`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` CHAR(26) NOT NULL,
    `parent_id` CHAR(26) NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `intro` TEXT NULL,
    `storefront_id` VARCHAR(40) NOT NULL DEFAULT 'crystal',

    UNIQUE INDEX `categories_slug_key`(`slug`),
    INDEX `categories_parent_id_sort_order_idx`(`parent_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collections` (
    `id` CHAR(26) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `rule_json` JSON NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `seo_title` VARCHAR(70) NULL,
    `seo_description` VARCHAR(170) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `collections_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collection_products` (
    `collection_id` CHAR(26) NOT NULL,
    `product_id` CHAR(26) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `collection_products_product_id_idx`(`product_id`),
    PRIMARY KEY (`collection_id`, `product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` CHAR(26) NOT NULL,
    `category_id` CHAR(26) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `product_type` VARCHAR(20) NOT NULL DEFAULT 'PRODUCT',
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `short_description` VARCHAR(500) NOT NULL DEFAULT '',
    `body` TEXT NOT NULL,
    `seo_title` VARCHAR(70) NULL,
    `seo_description` VARCHAR(170) NULL,
    `tax_group` VARCHAR(40) NULL,
    `shipping_profile` VARCHAR(40) NULL,
    `return_eligible` BOOLEAN NULL,
    `is_demo` BOOLEAN NOT NULL DEFAULT false,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL DEFAULT 0,
    `published_at` DATETIME(3) NULL,
    `published_by` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_slug_key`(`slug`),
    INDEX `products_category_id_status_published_at_id_idx`(`category_id`, `status`, `published_at`, `id`),
    INDEX `products_status_featured_idx`(`status`, `featured`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variants` (
    `id` CHAR(26) NOT NULL,
    `product_id` CHAR(26) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `option_json` JSON NOT NULL,
    `price_paise` BIGINT NOT NULL,
    `compare_at_paise` BIGINT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `weight_g` INTEGER NOT NULL,
    `unique_specimen` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_variants_sku_key`(`sku`),
    INDEX `product_variants_product_id_status_idx`(`product_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attribute_definitions` (
    `id` CHAR(26) NOT NULL,
    `code` VARCHAR(60) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `unit` VARCHAR(20) NULL,
    `filterable` BOOLEAN NOT NULL DEFAULT false,
    `searchable` BOOLEAN NOT NULL DEFAULT false,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `category_id` CHAR(26) NULL,

    UNIQUE INDEX `attribute_definitions_code_key`(`code`),
    INDEX `attribute_definitions_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attribute_options` (
    `id` CHAR(26) NOT NULL,
    `definition_id` CHAR(26) NOT NULL,
    `value` VARCHAR(120) NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `attribute_options_definition_id_value_key`(`definition_id`, `value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_attribute_values` (
    `id` CHAR(26) NOT NULL,
    `product_id` CHAR(26) NOT NULL,
    `variant_id` CHAR(26) NULL,
    `definition_id` CHAR(26) NOT NULL,
    `value_text` VARCHAR(500) NULL,
    `value_number` DECIMAL(14, 4) NULL,
    `normalized_value` VARCHAR(160) NOT NULL,

    INDEX `product_attribute_values_definition_id_normalized_value_prod_idx`(`definition_id`, `normalized_value`, `product_id`),
    UNIQUE INDEX `product_attribute_values_product_id_variant_id_definition_id_key`(`product_id`, `variant_id`, `definition_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_media` (
    `id` CHAR(26) NOT NULL,
    `product_id` CHAR(26) NOT NULL,
    `variant_id` CHAR(26) NULL,
    `object_key` VARCHAR(400) NOT NULL,
    `alt_text` VARCHAR(250) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `visibility` VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `authorized` BOOLEAN NOT NULL DEFAULT false,

    INDEX `product_media_product_id_sort_order_idx`(`product_id`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rudraksha_specs` (
    `product_id` CHAR(26) NOT NULL,
    `mukhi_count` INTEGER NOT NULL,
    `origin` VARCHAR(60) NOT NULL,
    `bead_type` VARCHAR(60) NOT NULL,
    `size_mm` DECIMAL(6, 2) NOT NULL,
    `notes` TEXT NULL,

    INDEX `rudraksha_specs_mukhi_count_idx`(`mukhi_count`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gemstone_specs` (
    `variant_id` CHAR(26) NOT NULL,
    `mineral` VARCHAR(80) NOT NULL,
    `variety` VARCHAR(80) NOT NULL,
    `carat_decimal` DECIMAL(8, 3) NOT NULL,
    `ratti_decimal` DECIMAL(8, 3) NULL,
    `cut` VARCHAR(60) NOT NULL,
    `treatment` VARCHAR(60) NOT NULL,
    `origin` VARCHAR(80) NOT NULL,

    INDEX `gemstone_specs_mineral_variety_idx`(`mineral`, `variety`),
    PRIMARY KEY (`variant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crystal_specs` (
    `product_id` CHAR(26) NOT NULL,
    `mineral` VARCHAR(80) NOT NULL,
    `form` VARCHAR(60) NOT NULL,
    `bead_size_mm` DECIMAL(6, 2) NULL,
    `dimensions_json` JSON NULL,
    `base_material` VARCHAR(80) NULL,

    INDEX `crystal_specs_mineral_form_idx`(`mineral`, `form`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `yantra_specs` (
    `product_id` CHAR(26) NOT NULL,
    `yantra_type` VARCHAR(80) NOT NULL,
    `material` VARCHAR(60) NOT NULL,
    `dimensions_json` JSON NULL,
    `usage_instructions` TEXT NULL,

    INDEX `yantra_specs_yantra_type_idx`(`yantra_type`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `certificates` (
    `id` CHAR(26) NOT NULL,
    `product_variant_id` CHAR(26) NOT NULL,
    `issuer` VARCHAR(160) NOT NULL,
    `report_no` VARCHAR(80) NULL,
    `report_type` VARCHAR(80) NOT NULL,
    `issued_on` DATE NULL,
    `object_key` VARCHAR(400) NULL,
    `verified_status` VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED',
    `disclosure_json` JSON NOT NULL,
    `evidence_note` VARCHAR(500) NOT NULL,
    `is_demo` BOOLEAN NOT NULL DEFAULT false,
    `verified_by` CHAR(26) NULL,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `certificates_report_no_key`(`report_no`),
    INDEX `certificates_product_variant_id_idx`(`product_variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `variant_id` CHAR(26) NOT NULL,
    `on_hand_qty` INTEGER NOT NULL DEFAULT 0,
    `reserved_qty` INTEGER NOT NULL DEFAULT 0,
    `reorder_level` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`variant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_reservations` (
    `id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `variant_id` CHAR(26) NOT NULL,
    `qty` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'HELD',
    `expires_at` DATETIME(3) NOT NULL,
    `released_at` DATETIME(3) NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_reservations_status_expires_at_idx`(`status`, `expires_at`),
    UNIQUE INDEX `inventory_reservations_order_id_variant_id_key`(`order_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` CHAR(26) NOT NULL,
    `variant_id` CHAR(26) NOT NULL,
    `kind` VARCHAR(30) NOT NULL,
    `qty_delta` INTEGER NOT NULL,
    `reference_type` VARCHAR(40) NULL,
    `reference_id` VARCHAR(40) NULL,
    `note` VARCHAR(500) NULL,
    `actor_id` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_movements_variant_id_created_at_idx`(`variant_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carts` (
    `id` CHAR(26) NOT NULL,
    `user_id` CHAR(26) NULL,
    `guest_token_hash` CHAR(64) NULL,
    `storefront_id` VARCHAR(40) NOT NULL DEFAULT 'crystal',
    `expires_at` DATETIME(3) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `carts_guest_token_hash_key`(`guest_token_hash`),
    INDEX `carts_user_id_idx`(`user_id`),
    INDEX `carts_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart_items` (
    `cart_id` CHAR(26) NOT NULL,
    `variant_id` CHAR(26) NOT NULL,
    `qty` INTEGER NOT NULL,
    `added_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`cart_id`, `variant_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discounts` (
    `id` CHAR(26) NOT NULL,
    `code` VARCHAR(40) NULL,
    `description` VARCHAR(255) NOT NULL DEFAULT '',
    `type` VARCHAR(10) NOT NULL,
    `value` BIGINT NOT NULL,
    `starts_at` DATETIME(3) NULL,
    `ends_at` DATETIME(3) NULL,
    `cap_paise` BIGINT NULL,
    `min_order_paise` BIGINT NULL,
    `limit_total` INTEGER NULL,
    `limit_per_customer` INTEGER NULL,
    `redeemed_count` INTEGER NOT NULL DEFAULT 0,
    `eligible_rules_json` JSON NOT NULL,
    `combinable` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 0,
    `created_by` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `discounts_code_key`(`code`),
    INDEX `discounts_active_starts_at_ends_at_idx`(`active`, `starts_at`, `ends_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `discount_redemptions` (
    `id` CHAR(26) NOT NULL,
    `discount_id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `user_id` CHAR(26) NULL,
    `customer_ref` CHAR(64) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'RESERVED',
    `redeemed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `discount_redemptions_order_id_key`(`order_id`),
    INDEX `discount_redemptions_discount_id_customer_ref_idx`(`discount_id`, `customer_ref`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` CHAR(26) NOT NULL,
    `public_code` VARCHAR(20) NOT NULL,
    `access_token_hash` CHAR(64) NOT NULL,
    `user_id` CHAR(26) NULL,
    `email` VARCHAR(254) NOT NULL,
    `storefront_id` VARCHAR(40) NOT NULL DEFAULT 'crystal',
    `status` VARCHAR(30) NOT NULL DEFAULT 'AWAITING_PAYMENT',
    `payment_status` VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    `fulfillment_status` VARCHAR(30) NOT NULL DEFAULT 'UNFULFILLED',
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `subtotal_paise` BIGINT NOT NULL,
    `discount_paise` BIGINT NOT NULL,
    `shipping_paise` BIGINT NOT NULL,
    `tax_paise` BIGINT NOT NULL,
    `total_paise` BIGINT NOT NULL,
    `refunded_paise` BIGINT NOT NULL DEFAULT 0,
    `tax_mode` VARCHAR(12) NOT NULL,
    `price_version` VARCHAR(64) NOT NULL,
    `shipping_method_id` VARCHAR(40) NOT NULL,
    `pricing_snapshot` JSON NOT NULL,
    `discount_id` CHAR(26) NULL,
    `campaign_id` CHAR(26) NULL,
    `affiliate_link_id` CHAR(26) NULL,
    `commission_paise` BIGINT NOT NULL DEFAULT 0,
    `payment_due_at` DATETIME(3) NOT NULL,
    `paid_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `custom_request_id` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_public_code_key`(`public_code`),
    INDEX `orders_user_id_created_at_id_idx`(`user_id`, `created_at`, `id`),
    INDEX `orders_status_created_at_idx`(`status`, `created_at`),
    INDEX `orders_payment_due_at_status_idx`(`payment_due_at`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_lines` (
    `id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `variant_id` CHAR(26) NOT NULL,
    `sku_snapshot` VARCHAR(64) NOT NULL,
    `title_snapshot` VARCHAR(300) NOT NULL,
    `attributes_snapshot_json` JSON NOT NULL,
    `qty` INTEGER NOT NULL,
    `unit_price_paise` BIGINT NOT NULL,
    `discount_paise` BIGINT NOT NULL,
    `tax_paise` BIGINT NOT NULL,
    `total_paise` BIGINT NOT NULL,

    INDEX `order_lines_order_id_idx`(`order_id`),
    INDEX `order_lines_variant_id_idx`(`variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_addresses` (
    `order_id` CHAR(26) NOT NULL,
    `type` VARCHAR(10) NOT NULL,
    `snapshot_json` JSON NOT NULL,
    `captured_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`order_id`, `type`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `provider` VARCHAR(20) NOT NULL,
    `environment` VARCHAR(10) NOT NULL,
    `provider_order_id` VARCHAR(80) NOT NULL,
    `provider_payment_id` VARCHAR(80) NULL,
    `amount_paise` BIGINT NOT NULL,
    `refunded_paise` BIGINT NOT NULL DEFAULT 0,
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `status` VARCHAR(30) NOT NULL DEFAULT 'CREATED',
    `failure_reason` VARCHAR(300) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_provider_payment_id_key`(`provider_payment_id`),
    INDEX `payments_order_id_idx`(`order_id`),
    INDEX `payments_status_created_at_idx`(`status`, `created_at`),
    UNIQUE INDEX `payments_provider_provider_order_id_key`(`provider`, `provider_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_events` (
    `id` CHAR(26) NOT NULL,
    `provider` VARCHAR(30) NOT NULL,
    `event_id` VARCHAR(120) NOT NULL,
    `event_type` VARCHAR(80) NOT NULL,
    `signature_valid` BOOLEAN NOT NULL,
    `body_hash` CHAR(64) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
    `error` VARCHAR(500) NULL,
    `received_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    INDEX `webhook_events_status_received_at_idx`(`status`, `received_at`),
    UNIQUE INDEX `webhook_events_provider_event_id_key`(`provider`, `event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_keys` (
    `id` CHAR(26) NOT NULL,
    `actor_ref` VARCHAR(64) NOT NULL,
    `scope` VARCHAR(60) NOT NULL,
    `key_hash` CHAR(64) NOT NULL,
    `request_hash` CHAR(64) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    `response_code` INTEGER NULL,
    `response_json` JSON NULL,
    `result_ref` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `idempotency_keys_expires_at_idx`(`expires_at`),
    UNIQUE INDEX `idempotency_keys_scope_actor_ref_key_hash_key`(`scope`, `actor_ref`, `key_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refunds` (
    `id` CHAR(26) NOT NULL,
    `payment_id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `amount_paise` BIGINT NOT NULL,
    `provider_ref` VARCHAR(80) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    `reason` VARCHAR(500) NOT NULL,
    `requested_by` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processed_at` DATETIME(3) NULL,

    UNIQUE INDEX `refunds_provider_ref_key`(`provider_ref`),
    INDEX `refunds_order_id_idx`(`order_id`),
    INDEX `refunds_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipments` (
    `id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `courier` VARCHAR(80) NOT NULL,
    `service` VARCHAR(80) NULL,
    `tracking_no` VARCHAR(80) NOT NULL,
    `awb` VARCHAR(80) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'SHIPPED',
    `shipping_cost_paise` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `shipments_order_id_idx`(`order_id`),
    UNIQUE INDEX `shipments_courier_tracking_no_key`(`courier`, `tracking_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipment_events` (
    `id` CHAR(26) NOT NULL,
    `shipment_id` CHAR(26) NOT NULL,
    `provider_event_id` VARCHAR(120) NULL,
    `status` VARCHAR(30) NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL,
    `payload_digest` CHAR(64) NOT NULL,
    `applied` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `shipment_events_provider_event_id_key`(`provider_event_id`),
    INDEX `shipment_events_shipment_id_occurred_at_idx`(`shipment_id`, `occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `return_requests` (
    `id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    `reason` VARCHAR(1000) NOT NULL,
    `line_ids_json` JSON NOT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decision_at` DATETIME(3) NULL,
    `decision_by` CHAR(26) NULL,

    INDEX `return_requests_order_id_idx`(`order_id`),
    INDEX `return_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_events` (
    `id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `actor_id` CHAR(26) NULL,
    `from_status` VARCHAR(30) NULL,
    `to_status` VARCHAR(30) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `order_events_order_id_created_at_idx`(`order_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_requests` (
    `id` CHAR(26) NOT NULL,
    `user_id` CHAR(26) NULL,
    `request_type` VARCHAR(20) NOT NULL,
    `reference_code` VARCHAR(20) NOT NULL,
    `access_token_hash` CHAR(64) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    `budget_band` VARCHAR(20) NOT NULL,
    `public_notes` TEXT NOT NULL,
    `private_details_encrypted` TEXT NOT NULL,
    `consent_version` VARCHAR(20) NOT NULL,
    `email_hash` CHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `custom_requests_reference_code_key`(`reference_code`),
    INDEX `custom_requests_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotations` (
    `id` CHAR(26) NOT NULL,
    `request_id` CHAR(26) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'SENT',
    `total_paise` BIGINT NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `terms_snapshot` TEXT NOT NULL,
    `created_by` CHAR(26) NULL,
    `accepted_at` DATETIME(3) NULL,
    `order_id` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `quotations_request_id_version_key`(`request_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quotation_items` (
    `id` CHAR(26) NOT NULL,
    `quotation_id` CHAR(26) NOT NULL,
    `description` VARCHAR(300) NOT NULL,
    `qty` INTEGER NOT NULL,
    `unit_paise` BIGINT NOT NULL,
    `tax_paise` BIGINT NOT NULL,

    INDEX `quotation_items_quotation_id_idx`(`quotation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consultation_leads` (
    `id` CHAR(26) NOT NULL,
    `user_id` CHAR(26) NULL,
    `topic` VARCHAR(40) NOT NULL,
    `contact_ref` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'NEW',
    `consent_version` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `consultation_leads_status_created_at_idx`(`status`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cms_pages` (
    `id` CHAR(26) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `kind` VARCHAR(20) NOT NULL DEFAULT 'PAGE',
    `body_blocks_json` JSON NOT NULL,
    `seo_title` VARCHAR(70) NULL,
    `seo_description` VARCHAR(170) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `legal_approved_by` VARCHAR(120) NULL,
    `version` INTEGER NOT NULL DEFAULT 0,
    `updated_by` CHAR(26) NULL,
    `published_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cms_pages_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `articles` (
    `id` CHAR(26) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `summary` VARCHAR(400) NOT NULL DEFAULT '',
    `body` TEXT NOT NULL,
    `author` VARCHAR(120) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `is_demo` BOOLEAN NOT NULL DEFAULT false,
    `published_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `articles_slug_key`(`slug`),
    INDEX `articles_status_published_at_idx`(`status`, `published_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` CHAR(26) NOT NULL,
    `product_id` CHAR(26) NOT NULL,
    `order_line_id` CHAR(26) NULL,
    `rating` INTEGER NOT NULL,
    `body` TEXT NOT NULL,
    `author_name` VARCHAR(120) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `moderation` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `reviews_product_id_status_idx`(`product_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_settings` (
    `key` VARCHAR(100) NOT NULL,
    `value_json` JSON NOT NULL,
    `updated_by` CHAR(26) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_outbox` (
    `id` CHAR(26) NOT NULL,
    `type` VARCHAR(60) NOT NULL,
    `payload_json` JSON NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `max_attempts` INTEGER NOT NULL DEFAULT 8,
    `run_after` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lock_until` DATETIME(3) NULL,
    `locked_by` VARCHAR(64) NULL,
    `dedupe_key` VARCHAR(160) NULL,
    `last_error` VARCHAR(1000) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    UNIQUE INDEX `job_outbox_dedupe_key_key`(`dedupe_key`),
    INDEX `job_outbox_status_run_after_lock_until_idx`(`status`, `run_after`, `lock_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(26) NOT NULL,
    `actor_id` CHAR(26) NULL,
    `action` VARCHAR(80) NOT NULL,
    `entity_type` VARCHAR(60) NOT NULL,
    `entity_id` VARCHAR(64) NULL,
    `changes_redacted_json` JSON NOT NULL,
    `ip_hash` CHAR(64) NULL,
    `request_id` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_created_at_entity_type_entity_id_idx`(`created_at`, `entity_type`, `entity_id`),
    INDEX `audit_logs_actor_id_created_at_idx`(`actor_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storefronts` (
    `id` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `base_url` VARCHAR(255) NOT NULL,
    `allowed_origins` JSON NOT NULL,
    `api_key_hash` CHAR(64) NULL,
    `api_key_last4` VARCHAR(8) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `storefronts_api_key_hash_key`(`api_key_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaigns` (
    `id` CHAR(26) NOT NULL,
    `name` VARCHAR(190) NOT NULL,
    `slug` VARCHAR(80) NOT NULL,
    `storefronts` JSON NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `ends_at` DATETIME(3) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `rule_json` JSON NOT NULL,
    `theme_json` JSON NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `campaigns_slug_key`(`slug`),
    INDEX `campaigns_active_starts_at_ends_at_idx`(`active`, `starts_at`, `ends_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliates` (
    `id` CHAR(26) NOT NULL,
    `name` VARCHAR(190) NOT NULL,
    `email` VARCHAR(190) NULL,
    `phone` VARCHAR(40) NULL,
    `platform` VARCHAR(80) NULL,
    `handle` VARCHAR(120) NULL,
    `commission_json` JSON NOT NULL,
    `notes` TEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_by` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliate_links` (
    `id` CHAR(26) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `affiliate_id` CHAR(26) NOT NULL,
    `discount_id` CHAR(26) NULL,
    `storefront_id` VARCHAR(40) NOT NULL,
    `target_path` VARCHAR(255) NOT NULL DEFAULT '/',
    `label` VARCHAR(120) NOT NULL DEFAULT '',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `affiliate_links_code_key`(`code`),
    INDEX `affiliate_links_affiliate_id_idx`(`affiliate_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliate_clicks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `link_id` CHAR(26) NOT NULL,
    `referrer` VARCHAR(500) NULL,
    `user_agent` VARCHAR(300) NULL,
    `visitor_hash` CHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `affiliate_clicks_link_id_created_at_idx`(`link_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `secrets` (
    `name` VARCHAR(100) NOT NULL,
    `ciphertext` TEXT NOT NULL,
    `last4` VARCHAR(8) NOT NULL,
    `updated_by` CHAR(26) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp_challenges` (
    `id` CHAR(26) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `code_hash` CHAR(64) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `consumed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `otp_challenges_email_created_at_idx`(`email`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_addresses` ADD CONSTRAINT `customer_addresses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_consents` ADD CONSTRAINT `customer_consents_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_storefront_id_fkey` FOREIGN KEY (`storefront_id`) REFERENCES `storefronts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_products` ADD CONSTRAINT `collection_products_collection_id_fkey` FOREIGN KEY (`collection_id`) REFERENCES `collections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collection_products` ADD CONSTRAINT `collection_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attribute_definitions` ADD CONSTRAINT `attribute_definitions_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attribute_options` ADD CONSTRAINT `attribute_options_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `attribute_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_attribute_values` ADD CONSTRAINT `product_attribute_values_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_attribute_values` ADD CONSTRAINT `product_attribute_values_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_attribute_values` ADD CONSTRAINT `product_attribute_values_definition_id_fkey` FOREIGN KEY (`definition_id`) REFERENCES `attribute_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_media` ADD CONSTRAINT `product_media_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_media` ADD CONSTRAINT `product_media_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rudraksha_specs` ADD CONSTRAINT `rudraksha_specs_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gemstone_specs` ADD CONSTRAINT `gemstone_specs_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crystal_specs` ADD CONSTRAINT `crystal_specs_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `yantra_specs` ADD CONSTRAINT `yantra_specs_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `certificates` ADD CONSTRAINT `certificates_product_variant_id_fkey` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_items` ADD CONSTRAINT `inventory_items_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `carts` ADD CONSTRAINT `carts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discount_redemptions` ADD CONSTRAINT `discount_redemptions_discount_id_fkey` FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `discount_redemptions` ADD CONSTRAINT `discount_redemptions_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_lines` ADD CONSTRAINT `order_lines_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_lines` ADD CONSTRAINT `order_lines_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_addresses` ADD CONSTRAINT `order_addresses_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipments` ADD CONSTRAINT `shipments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipment_events` ADD CONSTRAINT `shipment_events_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `return_requests` ADD CONSTRAINT `return_requests_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_requests` ADD CONSTRAINT `custom_requests_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `custom_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quotation_items` ADD CONSTRAINT `quotation_items_quotation_id_fkey` FOREIGN KEY (`quotation_id`) REFERENCES `quotations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_order_line_id_fkey` FOREIGN KEY (`order_line_id`) REFERENCES `order_lines`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliate_links` ADD CONSTRAINT `affiliate_links_affiliate_id_fkey` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliate_links` ADD CONSTRAINT `affiliate_links_discount_id_fkey` FOREIGN KEY (`discount_id`) REFERENCES `discounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliate_clicks` ADD CONSTRAINT `affiliate_clicks_link_id_fkey` FOREIGN KEY (`link_id`) REFERENCES `affiliate_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
