-- RefChain Web2 MVP schema (MySQL)
-- This script can be executed directly:  mysql -u root -p < mvp_schema.sql

DROP DATABASE IF EXISTS `refchain_mvp`;
CREATE DATABASE IF NOT EXISTS `refchain_mvp`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `refchain_mvp`;

-- ---------------------------------------------------------------------------
-- TABLE: merchants (merchant login + configuration)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `merchants`;
CREATE TABLE `merchants` (
  `id` CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `points_reward_per_click` INT NOT NULL DEFAULT 50,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX `idx_merchants_email` ON `merchants` (`email`);

-- ---------------------------------------------------------------------------
-- TABLE: referrals (referral links bound to a merchant)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `referrals`;
CREATE TABLE `referrals` (
  `id` CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `merchant_id` CHAR(36) NOT NULL,
  `clicks` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_referrals_merchant`
    FOREIGN KEY (`merchant_id`) REFERENCES `merchants` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX `idx_referrals_merchant` ON `referrals` (`merchant_id`);

-- ---------------------------------------------------------------------------
-- TABLE: users (end customers who redeem points)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX `idx_users_email` ON `users` (`email`);

-- ---------------------------------------------------------------------------
-- TABLE: points (per-merchant wallet balance)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `points`;
CREATE TABLE `points` (
  `id` CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `merchant_id` CHAR(36) NOT NULL,
  `balance` INT NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uq_points_user_merchant` UNIQUE (`user_id`, `merchant_id`),
  CONSTRAINT `fk_points_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_points_merchant`
    FOREIGN KEY (`merchant_id`) REFERENCES `merchants` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX `idx_points_merchant` ON `points` (`merchant_id`);

-- ---------------------------------------------------------------------------
-- TABLE: point_transactions (history of point changes)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS `point_transactions`;
CREATE TABLE `point_transactions` (
  `id` CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  `user_id` CHAR(36) NOT NULL,
  `referral_id` CHAR(36) NOT NULL,
  `merchant_id` CHAR(36) NOT NULL,
  `points_change` INT NOT NULL,
  `description` VARCHAR(255),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_transactions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_referral`
    FOREIGN KEY (`referral_id`) REFERENCES `referrals` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_transactions_merchant`
    FOREIGN KEY (`merchant_id`) REFERENCES `merchants` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX `idx_transactions_user` ON `point_transactions` (`user_id`);
CREATE INDEX `idx_transactions_merchant` ON `point_transactions` (`merchant_id`);

-- ---------------------------------------------------------------------------
-- Seed data (optional)
-- Default merchant account: email=merchant@test.com, password=123456
-- Hash corresponds to bcrypt(10) of "123456"
-- ---------------------------------------------------------------------------
INSERT INTO `merchants` (`name`, `email`, `password_hash`, `points_reward_per_click`)
VALUES (
  'Test Store',
  'merchant@test.com',
  '$2b$10$7dS03fK5aZ5y7tv/82PO7OL53UUS7PtklnKj2uP1T5A8SdOzzMOfy',
  50
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`);
