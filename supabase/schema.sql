-- RefChain MVP canonical schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  wallet_address TEXT UNIQUE,
  magic_user_id TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'merchant_admin' CHECK (
    role IN ('merchant_admin', 'merchant_staff', 'ambassador', 'buyer', 'admin')
  ),
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_wallet_idx ON profiles (wallet_address);

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  support_email TEXT,
  wallet_address TEXT NOT NULL UNIQUE,
  cashback_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.0 CHECK (cashback_percentage BETWEEN 0 AND 100),
  referral_reward_percentage NUMERIC(5,2) NOT NULL DEFAULT 2.0 CHECK (referral_reward_percentage BETWEEN 0 AND 100),
  token_id INTEGER UNIQUE,
  contract_address TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'suspended')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS merchants_owner_idx ON merchants (owner_profile_id);

CREATE TABLE IF NOT EXISTS referral_links (
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

CREATE INDEX IF NOT EXISTS referral_links_merchant_idx ON referral_links (merchant_id);
CREATE INDEX IF NOT EXISTS referral_links_owner_idx ON referral_links (owner_profile_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_code TEXT NOT NULL UNIQUE,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  buyer_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  referral_id UUID REFERENCES referral_links(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  cashback_points INTEGER NOT NULL DEFAULT 0 CHECK (cashback_points >= 0),
  referral_points INTEGER NOT NULL DEFAULT 0 CHECK (referral_points >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  onchain_status TEXT NOT NULL DEFAULT 'not_started' CHECK (onchain_status IN ('not_started', 'pending', 'synced', 'failed')),
  transaction_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_merchant_idx ON orders (merchant_id);
CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders (buyer_profile_id);
CREATE INDEX IF NOT EXISTS orders_referral_idx ON orders (referral_id);

CREATE TABLE IF NOT EXISTS point_ledger (
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

CREATE INDEX IF NOT EXISTS point_ledger_profile_idx ON point_ledger (profile_id);
CREATE INDEX IF NOT EXISTS point_ledger_merchant_idx ON point_ledger (merchant_id);

CREATE TABLE IF NOT EXISTS sync_tasks (
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

CREATE INDEX IF NOT EXISTS sync_tasks_status_idx ON sync_tasks (status);

CREATE OR REPLACE FUNCTION increment_referral_usage(referral_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE referral_links
  SET usage_count = usage_count + 1,
      updated_at = NOW()
  WHERE id = referral_uuid;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_merchants_updated
BEFORE UPDATE ON merchants
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_referral_links_updated
BEFORE UPDATE ON referral_links
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_orders_updated
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER trg_sync_tasks_updated
BEFORE UPDATE ON sync_tasks
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
