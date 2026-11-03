-- AlterTable
ALTER TABLE `affiliate_clicks` ADD COLUMN `click_id` CHAR(26) NOT NULL,
    ADD COLUMN `is_unique` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `suspected_bot` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `affiliate_links` ADD COLUMN `created_by_partner` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `affiliates` ADD COLUMN `attribution_days` INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN `can_create_links` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `email_hash` CHAR(64) NULL,
    ADD COLUMN `payout_details_enc` TEXT NULL,
    ADD COLUMN `payout_hint` VARCHAR(60) NULL,
    ADD COLUMN `status` VARCHAR(20) NOT NULL DEFAULT 'INVITED',
    ADD COLUMN `terms_accepted_at` DATETIME(3) NULL,
    ADD COLUMN `terms_version` VARCHAR(20) NULL,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `user_id` CHAR(26) NULL;

-- AlterTable
ALTER TABLE `orders` ADD COLUMN `affiliate_click_id` CHAR(26) NULL;

-- CreateTable
CREATE TABLE `affiliate_commissions` (
    `id` CHAR(26) NOT NULL,
    `affiliate_id` CHAR(26) NOT NULL,
    `link_id` CHAR(26) NULL,
    `order_id` CHAR(26) NOT NULL,
    `attribution` VARCHAR(10) NOT NULL,
    `basis_paise` BIGINT NOT NULL,
    `amount_paise` BIGINT NOT NULL,
    `reversed_paise` BIGINT NOT NULL DEFAULT 0,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `flags` JSON NOT NULL,
    `approvable_at` DATETIME(3) NOT NULL,
    `decided_by` CHAR(26) NULL,
    `decision_note` VARCHAR(500) NULL,
    `payout_id` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `affiliate_commissions_order_id_key`(`order_id`),
    INDEX `affiliate_commissions_affiliate_id_status_created_at_idx`(`affiliate_id`, `status`, `created_at`),
    INDEX `affiliate_commissions_status_approvable_at_idx`(`status`, `approvable_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliate_payouts` (
    `id` CHAR(26) NOT NULL,
    `affiliate_id` CHAR(26) NOT NULL,
    `gross_paise` BIGINT NOT NULL,
    `tds_paise` BIGINT NOT NULL,
    `net_paise` BIGINT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `method` VARCHAR(40) NULL,
    `reference` VARCHAR(120) NULL,
    `paid_at` DATETIME(3) NULL,
    `created_by` CHAR(26) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `affiliate_payouts_affiliate_id_created_at_idx`(`affiliate_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `affiliate_clicks_click_id_key` ON `affiliate_clicks`(`click_id`);

-- CreateIndex
CREATE INDEX `affiliate_clicks_link_id_visitor_hash_created_at_idx` ON `affiliate_clicks`(`link_id`, `visitor_hash`, `created_at`);

-- CreateIndex
CREATE UNIQUE INDEX `affiliates_user_id_key` ON `affiliates`(`user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `affiliates_email_key` ON `affiliates`(`email`);

-- CreateIndex
CREATE INDEX `affiliates_status_idx` ON `affiliates`(`status`);

-- AddForeignKey
ALTER TABLE `affiliate_commissions` ADD CONSTRAINT `affiliate_commissions_affiliate_id_fkey` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliate_commissions` ADD CONSTRAINT `affiliate_commissions_link_id_fkey` FOREIGN KEY (`link_id`) REFERENCES `affiliate_links`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliate_commissions` ADD CONSTRAINT `affiliate_commissions_payout_id_fkey` FOREIGN KEY (`payout_id`) REFERENCES `affiliate_payouts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliate_payouts` ADD CONSTRAINT `affiliate_payouts_affiliate_id_fkey` FOREIGN KEY (`affiliate_id`) REFERENCES `affiliates`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Integrity rules Prisma cannot express.
ALTER TABLE `affiliate_commissions` ADD CONSTRAINT `commission_amounts_valid` CHECK (`basis_paise` >= 0 AND `amount_paise` >= 0 AND `reversed_paise` >= 0 AND `reversed_paise` <= `amount_paise`);
ALTER TABLE `affiliate_payouts` ADD CONSTRAINT `payout_amounts_valid` CHECK (`gross_paise` > 0 AND `tds_paise` >= 0 AND `net_paise` = `gross_paise` - `tds_paise`);
ALTER TABLE `affiliates` ADD CONSTRAINT `attribution_days_range` CHECK (`attribution_days` BETWEEN 1 AND 90);
