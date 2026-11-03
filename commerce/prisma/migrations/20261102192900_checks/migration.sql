-- Invariants Prisma cannot express (Section 05). Enforced by MySQL 8.0.16+ and MariaDB 10.2+.
ALTER TABLE `inventory_items` ADD CONSTRAINT `inv_nonnegative` CHECK (`on_hand_qty` >= 0 AND `reserved_qty` >= 0 AND `reserved_qty` <= `on_hand_qty`);
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `reservation_qty_positive` CHECK (`qty` > 0);
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_qty_positive` CHECK (`qty` > 0);
ALTER TABLE `product_variants` ADD CONSTRAINT `variant_price_nonnegative` CHECK (`price_paise` >= 0 AND (`compare_at_paise` IS NULL OR `compare_at_paise` >= 0));
ALTER TABLE `order_lines` ADD CONSTRAINT `line_amounts_valid` CHECK (`qty` > 0 AND `unit_price_paise` >= 0 AND `discount_paise` >= 0 AND `tax_paise` >= 0 AND `total_paise` >= 0);
ALTER TABLE `orders` ADD CONSTRAINT `order_amounts_valid` CHECK (`subtotal_paise` >= 0 AND `discount_paise` >= 0 AND `shipping_paise` >= 0 AND `tax_paise` >= 0 AND `total_paise` >= 0 AND `refunded_paise` >= 0 AND `refunded_paise` <= `total_paise`);
ALTER TABLE `payments` ADD CONSTRAINT `payment_amounts_valid` CHECK (`amount_paise` > 0 AND `refunded_paise` >= 0 AND `refunded_paise` <= `amount_paise`);
ALTER TABLE `refunds` ADD CONSTRAINT `refund_amount_positive` CHECK (`amount_paise` > 0);
ALTER TABLE `rudraksha_specs` ADD CONSTRAINT `mukhi_range` CHECK (`mukhi_count` BETWEEN 1 AND 27);
ALTER TABLE `reviews` ADD CONSTRAINT `rating_range` CHECK (`rating` BETWEEN 1 AND 5);
ALTER TABLE `discounts` ADD CONSTRAINT `discount_value_positive` CHECK (`value` > 0);
ALTER TABLE `quotations` ADD CONSTRAINT `quote_total_nonnegative` CHECK (`total_paise` >= 0 AND `version` >= 1);
-- Affiliate link codes are random mixed-case strings: compare them exactly.
ALTER TABLE `affiliate_links` MODIFY `code` VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
