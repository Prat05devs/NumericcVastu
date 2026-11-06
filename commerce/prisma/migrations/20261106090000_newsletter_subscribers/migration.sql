-- CreateTable
CREATE TABLE `newsletter_subscribers` (
    `id` CHAR(26) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `consent_version` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `unsubscribed_at` DATETIME(3) NULL,

    UNIQUE INDEX `newsletter_subscribers_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
