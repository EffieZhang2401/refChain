-- RefChain MVP – Relational schema with login + loyalty modules

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Keep updated_at fresh on every write
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Authentication & identity ------------------------------------------------

CREATE TYPE login_provider AS ENUM ('password', 'magic_link', 'wallet');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deleted');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  password_salt TEXT,
  login_provider login_provider NOT NULL DEFAULT 'password',
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  status user_status NOT NULL DEFAULT 'pending',
  last_login_at TIMESTAMPTZ,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (login_provider = 'password' AND password_hash IS NOT NULL)
    OR login_provider <> 'password'
  )
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_active_idx ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  wallet_address TEXT UNIQUE,
  locale TEXT DEFAULT 'en-US',
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX profiles_user_idx ON profiles(user_id);

-- 2. Merchant & team management ----------------------------------------------

CREATE TYPE merchant_status AS ENUM ('draft', 'active', 'suspended');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'staff', 'analyst');

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT,
  support_email TEXT,
  support_phone TEXT,
  wallet_address TEXT,
  cashback_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.0 CHECK (cashback_percentage BETWEEN 0 AND 100),
  referral_reward_percentage NUMERIC(5,2) NOT NULL DEFAULT 2.0 CHECK (referral_reward_percentage BETWEEN 0 AND 100),
  logo_url TEXT,
  status merchant_status NOT NULL DEFAULT 'draft',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX merchants_owner_idx ON merchants(owner_profile_id);

CREATE TABLE merchant_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'staff',
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (merchant_id, profile_id)
);
CREATE INDEX merchant_members_role_idx ON merchant_members(merchant_id, role);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- 3. Referrals, orders & loyalty ---------------------------------------------

CREATE TABLE referral_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  owner_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_uses INTEGER DEFAULT 0 CHECK (max_uses >= 0),
  usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX referral_links_merchant_idx ON referral_links(merchant_id);
CREATE INDEX referral_links_owner_idx ON referral_links(owner_profile_id);

CREATE TYPE order_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE onchain_status AS ENUM ('not_started', 'pending', 'synced', 'failed');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_code TEXT NOT NULL UNIQUE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  buyer_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  referral_id UUID REFERENCES referral_links(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  cashback_points INTEGER NOT NULL DEFAULT 0 CHECK (cashback_points >= 0),
  referral_points INTEGER NOT NULL DEFAULT 0 CHECK (referral_points >= 0),
  status order_status NOT NULL DEFAULT 'pending',
  onchain_status onchain_status NOT NULL DEFAULT 'not_started',
  transaction_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX orders_merchant_idx ON orders(merchant_id);
CREATE INDEX orders_buyer_idx ON orders(buyer_profile_id);
CREATE INDEX orders_status_idx ON orders(status);

CREATE TABLE point_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL CHECK (points > 0),
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  source TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX point_ledger_profile_idx ON point_ledger(profile_id);
CREATE INDEX point_ledger_merchant_idx ON point_ledger(merchant_id);

CREATE TABLE wallet_balances (
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (merchant_id, profile_id)
);

CREATE TABLE sync_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('mint_points', 'revoke_points')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX sync_tasks_status_idx ON sync_tasks(status);

-- 4. Audit & supporting utilities --------------------------------------------

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_profile_id UUID REFERENCES profiles(id),
  merchant_id UUID REFERENCES merchants(id),
  event TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_referral_usage(referral_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE referral_links
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = referral_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recompute_wallet_balances()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallet_balances (merchant_id, profile_id, balance)
  VALUES (NEW.merchant_id, NEW.profile_id, CASE WHEN NEW.direction = 'credit' THEN NEW.points ELSE -NEW.points END)
  ON CONFLICT (merchant_id, profile_id)
  DO UPDATE
    SET balance = wallet_balances.balance + (
      CASE WHEN NEW.direction = 'credit' THEN NEW.points ELSE -NEW.points END
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_merchants_updated BEFORE UPDATE ON merchants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_referrals_updated BEFORE UPDATE ON referral_links
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sync_tasks_updated BEFORE UPDATE ON sync_tasks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_point_ledger_balance
AFTER INSERT ON point_ledger
FOR EACH ROW EXECUTE FUNCTION recompute_wallet_balances();
