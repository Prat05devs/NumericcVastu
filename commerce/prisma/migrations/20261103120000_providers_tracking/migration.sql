-- AlterTable
ALTER TABLE `payments` ADD COLUMN `exchange_rate` VARCHAR(20) NULL,
    ADD COLUMN `provider_amount_minor` BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN `provider_currency` CHAR(3) NOT NULL DEFAULT 'INR';

-- AlterTable
ALTER TABLE `refunds` ADD COLUMN `provider_amount_minor` BIGINT NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `shipment_events` ADD COLUMN `description` VARCHAR(300) NULL,
    ADD COLUMN `location` VARCHAR(160) NULL;

-- AlterTable
ALTER TABLE `shipments` ADD COLUMN `delivered_at` DATETIME(3) NULL,
    ADD COLUMN `expected_by` DATETIME(3) NULL,
    ADD COLUMN `label_url` VARCHAR(500) NULL,
    ADD COLUMN `last_synced_at` DATETIME(3) NULL,
    ADD COLUMN `provider` VARCHAR(40) NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE `delivery_feedback` (
    `id` CHAR(26) NOT NULL,
    `order_id` CHAR(26) NOT NULL,
    `shipment_id` CHAR(26) NULL,
    `rating` INTEGER NOT NULL,
    `on_time` BOOLEAN NULL,
    `packaging_ok` BOOLEAN NULL,
    `comment` VARCHAR(1000) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'NEW',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `delivery_feedback_order_id_key`(`order_id`),
    INDEX `delivery_feedback_created_at_idx`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `delivery_feedback` ADD CONSTRAINT `delivery_feedback_shipment_id_fkey` FOREIGN KEY (`shipment_id`) REFERENCES `shipments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Existing payments were all INR at par.
UPDATE `payments` SET `provider_amount_minor` = `amount_paise` WHERE `provider_amount_minor` = 0;
UPDATE `refunds` SET `provider_amount_minor` = `amount_paise` WHERE `provider_amount_minor` = 0;
ALTER TABLE `delivery_feedback` ADD CONSTRAINT `feedback_rating_range` CHECK (`rating` BETWEEN 1 AND 5);
