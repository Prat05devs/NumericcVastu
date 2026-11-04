-- CreateTable
CREATE TABLE `service_bookings` (
    `id` CHAR(26) NOT NULL,
    `offer_id` VARCHAR(60) NOT NULL,
    `offer_name` VARCHAR(200) NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `amount_minor` BIGINT NOT NULL,
    `provider` VARCHAR(20) NOT NULL DEFAULT 'razorpay',
    `environment` VARCHAR(10) NOT NULL DEFAULT 'live',
    `provider_order_id` VARCHAR(80) NOT NULL,
    `provider_payment_id` VARCHAR(80) NULL,
    `payment_status` VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    `status` VARCHAR(20) NOT NULL DEFAULT 'NEW',
    `contact_ref` TEXT NOT NULL,
    `failure_reason` VARCHAR(300) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `service_bookings_payment_status_created_at_idx`(`payment_status`, `created_at`),
    INDEX `service_bookings_status_created_at_idx`(`status`, `created_at`),
    UNIQUE INDEX `service_bookings_provider_provider_order_id_key`(`provider`, `provider_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
