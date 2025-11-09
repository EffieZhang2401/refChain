USE `refchain`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sync_tasks;
TRUNCATE TABLE point_ledger;
TRUNCATE TABLE orders;
TRUNCATE TABLE referral_links;
TRUNCATE TABLE merchant_members;
TRUNCATE TABLE merchants;
TRUNCATE TABLE profiles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (
  id, email, password_hash, login_provider, is_email_verified, status,
  created_at, updated_at
) VALUES (
  'usr_demo_owner',
  'merchant@test.com',
  '123456',
  'password',
  1,
  'active',
  NOW(),
  NOW()
);

INSERT INTO profiles (
  id, user_id, display_name, avatar_url, wallet_address, locale, timezone,
  created_at, updated_at
) VALUES (
  'prf_demo_owner',
  'usr_demo_owner',
  'Demo Merchant',
  NULL,
  '0x0000000000000000000000000000000000000000',
  'zh-CN',
  'Asia/Shanghai',
  NOW(),
  NOW()
);

INSERT INTO merchants (
  id,
  owner_profile_id,
  name,
  slug,
  industry,
  support_email,
  wallet_address,
  cashback_percentage,
  referral_reward_percentage,
  status,
  metadata,
  created_at,
  updated_at
) VALUES (
  'mrc_demo_store',
  'prf_demo_owner',
  'RefChain Studio',
  'refchain-studio',
  'Lifestyle',
  'support@refchain.dev',
  '0x0000000000000000000000000000000000000000',
  5.0,
  2.0,
  'active',
  JSON_OBJECT(),
  NOW(),
  NOW()
);

INSERT INTO merchant_members (
  id,
  merchant_id,
  profile_id,
  role,
  invited_by,
  invited_at,
  accepted_at,
  is_active
) VALUES (
  'mem_demo_owner',
  'mrc_demo_store',
  'prf_demo_owner',
  'owner',
  NULL,
  NOW(),
  NOW(),
  1
);

INSERT INTO referral_links (
  id,
  code,
  merchant_id,
  owner_profile_id,
  max_uses,
  usage_count,
  expires_at,
  is_active,
  metadata,
  created_at,
  updated_at
) VALUES
  (
    'ref_alpha',
    'RC-ALPHA',
    'mrc_demo_store',
    'prf_demo_owner',
    NULL,
    19,
    NULL,
    1,
    JSON_OBJECT(),
    NOW(),
    NOW()
  ),
  (
    'ref_beta',
    'RC-BETA',
    'mrc_demo_store',
    'prf_demo_owner',
    NULL,
    14,
    NULL,
    1,
    JSON_OBJECT(),
    NOW(),
    NOW()
  );

INSERT INTO orders (
  id,
  order_code,
  merchant_id,
  buyer_profile_id,
  buyer_email,
  referral_id,
  amount,
  currency,
  cashback_points,
  referral_points,
  status,
  onchain_status,
  metadata,
  created_at,
  updated_at
) VALUES
  (
    'ord_demo_001',
    'ORD-1A2B3C',
    'mrc_demo_store',
    NULL,
    'luna@example.com',
    'ref_alpha',
    249.50,
    'USD',
    12,
    5,
    'completed',
    'pending',
    JSON_OBJECT(),
    NOW(),
    NOW()
  ),
  (
    'ord_demo_002',
    'ORD-4D5E6F',
    'mrc_demo_store',
    NULL,
    'miles@example.com',
    'ref_beta',
    540.00,
    'USD',
    27,
    10,
    'processing',
    'not_started',
    JSON_OBJECT(),
    NOW(),
    NOW()
  );

INSERT INTO point_ledger (
  id,
  merchant_id,
  profile_id,
  order_id,
  points,
  direction,
  source,
  metadata,
  created_at
) VALUES
  (
    'led_demo_001',
    'mrc_demo_store',
    'prf_demo_owner',
    'ord_demo_001',
    12,
    'credit',
    'cashback',
    JSON_OBJECT('order_code', 'ORD-1A2B3C'),
    NOW()
  ),
  (
    'led_demo_002',
    'mrc_demo_store',
    'prf_demo_owner',
    'ord_demo_001',
    5,
    'credit',
    'referral',
    JSON_OBJECT('order_code', 'ORD-1A2B3C'),
    NOW()
  ),
  (
    'led_demo_003',
    'mrc_demo_store',
    'prf_demo_owner',
    'ord_demo_002',
    27,
    'credit',
    'cashback',
    JSON_OBJECT('order_code', 'ORD-4D5E6F'),
    NOW()
  );
