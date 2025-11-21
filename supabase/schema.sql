-- RefChain MVP – MySQL 8.0 版 ------------------------------------------------

-- 1. Authentication & identity ---------------------------------------------

CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(320) NOT NULL UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  wallet_address VARCHAR(255) UNIQUE,
  login_provider ENUM('password', 'magic_link', 'wallet') NOT NULL DEFAULT 'password',
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status ENUM('pending', 'active', 'suspended', 'deleted') NOT NULL DEFAULT 'pending',
  last_login_at TIMESTAMP NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CHECK (
    (login_provider = 'password' AND password_hash IS NOT NULL)
    OR login_provider <> 'password'
  )
);

CREATE TABLE sessions (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  refresh_token VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_active_idx ON sessions(user_id, expires_at, revoked_at);

CREATE TABLE password_reset_tokens (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  consumed_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE profiles (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  avatar_url VARCHAR(2048),
  wallet_address VARCHAR(255) UNIQUE,
  locale VARCHAR(10) DEFAULT 'en-US',
  timezone VARCHAR(64) DEFAULT 'UTC',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX profiles_user_idx ON profiles(user_id);

-- 2. Merchant & team management -------------------------------------------

CREATE TABLE merchants (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  owner_profile_id CHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  industry VARCHAR(255),
  support_email VARCHAR(320),
  support_phone VARCHAR(32),
  wallet_address VARCHAR(255),
  token_id INT UNIQUE,
  cashback_percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00 CHECK (cashback_percentage BETWEEN 0 AND 100),
  referral_reward_percentage DECIMAL(5,2) NOT NULL DEFAULT 2.00 CHECK (referral_reward_percentage BETWEEN 0 AND 100),
  logo_url VARCHAR(2048),
  status ENUM('draft', 'active', 'suspended') NOT NULL DEFAULT 'draft',
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_merchants_owner FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

CREATE INDEX merchants_owner_idx ON merchants(owner_profile_id);

CREATE TABLE merchant_members (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  merchant_id CHAR(36) NOT NULL,
  profile_id CHAR(36) NOT NULL,
  role ENUM('owner', 'admin', 'staff', 'analyst') NOT NULL DEFAULT 'staff',
  invited_by CHAR(36),
  invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (merchant_id, profile_id),
  CONSTRAINT fk_merchant_members_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_members_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_merchant_members_invited_by FOREIGN KEY (invited_by) REFERENCES profiles(id)
);

CREATE INDEX merchant_members_role_idx ON merchant_members(merchant_id, role);

CREATE TABLE api_keys (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  merchant_id CHAR(36) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  label VARCHAR(255) NOT NULL,
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP NULL,
  CONSTRAINT fk_api_keys_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 3. Referrals, orders & loyalty -------------------------------------------

CREATE TABLE referral_links (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(255) NOT NULL UNIQUE,
  merchant_id CHAR(36) NOT NULL,
  owner_profile_id CHAR(36) NOT NULL,
  max_uses INT DEFAULT 0 CHECK (max_uses >= 0),
  usage_count INT NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_referral_links_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_links_owner FOREIGN KEY (owner_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX referral_links_merchant_idx ON referral_links(merchant_id);
CREATE INDEX referral_links_owner_idx ON referral_links(owner_profile_id);

CREATE TABLE orders (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  order_code VARCHAR(255) NOT NULL UNIQUE,
  merchant_id CHAR(36) NOT NULL,
  buyer_profile_id CHAR(36) NULL,
  buyer_email VARCHAR(255) NOT NULL,
  referral_id CHAR(36) NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  cashback_points INT NOT NULL DEFAULT 0 CHECK (cashback_points >= 0),
  referral_points INT NOT NULL DEFAULT 0 CHECK (referral_points >= 0),
  status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
  onchain_status ENUM('not_started', 'pending', 'synced', 'failed') NOT NULL DEFAULT 'not_started',
  transaction_hash VARCHAR(255),
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_referral FOREIGN KEY (referral_id) REFERENCES referral_links(id) ON DELETE SET NULL
);

CREATE INDEX orders_merchant_idx ON orders(merchant_id);
CREATE INDEX orders_buyer_idx ON orders(buyer_profile_id);
CREATE INDEX orders_status_idx ON orders(status);

CREATE TABLE point_ledger (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  merchant_id CHAR(36) NOT NULL,
  profile_id CHAR(36) NOT NULL,
  order_id CHAR(36) NULL,
  points INT NOT NULL CHECK (points > 0),
  direction ENUM('credit', 'debit') NOT NULL,
  source VARCHAR(255) NOT NULL,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_point_ledger_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  CONSTRAINT fk_point_ledger_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_point_ledger_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX point_ledger_profile_idx ON point_ledger(profile_id);
CREATE INDEX point_ledger_merchant_idx ON point_ledger(merchant_id);

CREATE TABLE wallet_balances (
  merchant_id CHAR(36) NOT NULL,
  profile_id CHAR(36) NOT NULL,
  balance INT NOT NULL DEFAULT 0,
  PRIMARY KEY (merchant_id, profile_id),
  CONSTRAINT fk_wallet_balances_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  CONSTRAINT fk_wallet_balances_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE sync_tasks (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  order_id CHAR(36) NULL,
  task_type ENUM('mint_points', 'revoke_points') NOT NULL,
  status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
  payload JSON NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sync_tasks_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX sync_tasks_status_idx ON sync_tasks(status);

-- 4. Audit & supporting utilities ------------------------------------------

CREATE TABLE audit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  actor_profile_id CHAR(36) NULL,
  merchant_id CHAR(36) NULL,
  event VARCHAR(255) NOT NULL,
  description TEXT,
  metadata JSON NOT NULL DEFAULT (JSON_OBJECT()),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_profile_id) REFERENCES profiles(id),
  CONSTRAINT fk_audit_logs_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- Coupons: catalog + issued coupons
CREATE TABLE coupon_catalog (
  id CHAR(36) NOT NULL PRIMARY KEY,
  merchant_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  points_required INT NOT NULL CHECK (points_required > 0),
  expires_at DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_coupon_catalog_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

CREATE INDEX coupon_catalog_merchant_idx ON coupon_catalog(merchant_id, is_active);

CREATE TABLE coupons (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  profile_id CHAR(36) NOT NULL,
  merchant_id CHAR(36) NOT NULL,
  catalog_id CHAR(36) NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  points_spent INT NOT NULL CHECK (points_spent > 0),
  status ENUM('active', 'redeemed', 'expired') NOT NULL DEFAULT 'active',
  expires_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_coupons_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_coupons_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_coupons_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  CONSTRAINT fk_coupons_catalog FOREIGN KEY (catalog_id) REFERENCES coupon_catalog(id) ON DELETE CASCADE
);

CREATE INDEX coupons_user_idx ON coupons(user_id, merchant_id);

-- Loyalty token redemption log
CREATE TABLE token_redemptions (
  id CHAR(36) PRIMARY KEY DEFAULT(UUID()),
  user_id CHAR(36) NOT NULL,
  merchant_id CHAR(36) NOT NULL,
  points_spent INT NOT NULL,
  token_amount INT NOT NULL,
  tx_hash VARCHAR(255),
  status ENUM('pending','success','failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_token_redemptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_token_redemptions_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
);

-- 存储过程：对应 PostgreSQL 里的 increment_referral_usage()
DELIMITER $$

CREATE PROCEDURE increment_referral_usage(IN p_referral_uuid CHAR(36))
BEGIN
  UPDATE referral_links
  SET usage_count = usage_count + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_referral_uuid;
END$$

-- 触发器：对应 recompute_wallet_balances() + trg_point_ledger_balance
CREATE TRIGGER trg_point_ledger_balance
AFTER INSERT ON point_ledger
FOR EACH ROW
BEGIN
  INSERT INTO wallet_balances (merchant_id, profile_id, balance)
  VALUES (
    NEW.merchant_id,
    NEW.profile_id,
    CASE WHEN NEW.direction = 'credit' THEN NEW.points ELSE -NEW.points END
  )
  ON DUPLICATE KEY UPDATE
    balance = wallet_balances.balance +
      (CASE WHEN NEW.direction = 'credit' THEN NEW.points ELSE -NEW.points END);
END$$

DELIMITER ;
