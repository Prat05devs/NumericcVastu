-- AlterTable
ALTER TABLE `service_bookings` ADD COLUMN `coupon_code` VARCHAR(40) NULL,
    ADD COLUMN `customer_key` CHAR(64) NULL,
    ADD COLUMN `discount_minor` BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN `list_amount_minor` BIGINT NULL,
    ADD COLUMN `mailed_at` DATETIME(3) NULL,
    ADD COLUMN `marketing_consent` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `service_bookings_coupon_code_payment_status_idx` ON `service_bookings`(`coupon_code`, `payment_status`);

-- CreateIndex
CREATE INDEX `service_bookings_customer_key_idx` ON `service_bookings`(`customer_key`);

