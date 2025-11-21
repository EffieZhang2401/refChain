USE `refchain`;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE coupons;
TRUNCATE TABLE coupon_catalog;
TRUNCATE TABLE wallet_balances;
TRUNCATE TABLE point_ledger;
TRUNCATE TABLE orders;
TRUNCATE TABLE referral_links;
TRUNCATE TABLE merchant_members;
TRUNCATE TABLE merchants;
TRUNCATE TABLE profiles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO users (
  id, email, password_hash, login_provider, wallet_address, is_email_verified, status,
  created_at, updated_at
) VALUES
  (
    'usr_demo_owner',
    'merchant@test.com',
    '123456',
    'password',
    NULL,
    1,
    'active',
    NOW(),
    NOW()
  ),
  (
    'usr_demo_user',
    'andysu@gmail.com',
    '123456',
    'password',
    NULL,
    1,
    'active',
    NOW(),
    NOW()
  ),
  (
    'usr_demo_owner2',
    'merchant2@test.com',
    '123456',
    'password',
    NULL,
    1,
    'active',
    NOW(),
    NOW()
  );

INSERT INTO profiles (
  id, user_id, display_name, avatar_url, wallet_address, locale, timezone,
  created_at, updated_at
) VALUES
  (
    'prf_demo_owner',
    'usr_demo_owner',
    'Demo Merchant',
    NULL,
    '0x0000000000000000000000000000000000000000',
    'zh-CN',
    'Asia/Shanghai',
    NOW(),
    NOW()
  ),
  (
    'prf_demo_user',
    'usr_demo_user',
    'Andy Su',
    NULL,
    NULL,
    'en-US',
    'UTC',
    NOW(),
    NOW()
  ),
  (
    'prf_demo_owner2',
    'usr_demo_owner2',
    'Market Merchant',
    NULL,
    NULL,
    'en-US',
    'UTC',
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
  token_id,
  cashback_percentage,
  referral_reward_percentage,
  status,
  metadata,
  created_at,
  updated_at
) VALUES
  (
    'mrc_demo_store',
    'prf_demo_owner',
    'RefChain Studio',
    'refchain-studio',
    'Lifestyle',
    'support@refchain.dev',
    '0x0000000000000000000000000000000000000000',
    1,
    5.0,
    2.0,
    'active',
    JSON_OBJECT(),
    NOW(),
    NOW()
  ),
  (
    'mrc_demo_cafe',
    'prf_demo_owner2',
    'Urban Brew Collective',
    'urban-brew-co',
    'Cafe',
    'hello@urbanbrew.test',
    '0x0000000000000000000000000000000000000000',
    NULL,
    8.0,
    3.0,
    'active',
    JSON_OBJECT(),
    NOW(),
    NOW()
  ),
  (
    'mrc_demo_market',
    'prf_demo_owner2',
    'Green Market Supply',
    'green-market',
    'Retail',
    'support@greenmarket.test',
    '0x0000000000000000000000000000000000000000',
    NULL,
    4.0,
    1.5,
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
) VALUES
  (
    'mem_demo_owner',
    'mrc_demo_store',
    'prf_demo_owner',
    'owner',
    NULL,
    NOW(),
    NOW(),
    1
  ),
  (
    'mem_demo_cafe',
    'mrc_demo_cafe',
    'prf_demo_owner2',
    'owner',
    NULL,
    NOW(),
    NOW(),
    1
  ),
  (
    'mem_demo_market',
    'mrc_demo_market',
    'prf_demo_owner2',
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
  ),
  (
    'ref_cafe_day',
    'UB-DAY',
    'mrc_demo_cafe',
    'prf_demo_owner2',
    NULL,
    32,
    NULL,
    1,
    JSON_OBJECT(),
    NOW(),
    NOW()
  ),
  (
    'ref_market_green',
    'GM-GREEN',
    'mrc_demo_market',
    'prf_demo_owner2',
    NULL,
    21,
    NULL,
    1,
    JSON_OBJECT(),
    NOW(),
    NOW()
  );

INSERT INTO coupon_catalog (
  id,
  merchant_id,
  title,
  description,
  points_required,
  expires_at,
  is_active,
  created_at,
  updated_at
) VALUES
  (
    'cpc_demo_five',
    'mrc_demo_store',
    '$5 studio credit',
    'Instant $5 off any in-store drink or retail purchase',
    120,
    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
    1,
    NOW(),
    NOW()
  ),
  (
    'cpc_demo_ten',
    'mrc_demo_store',
    '$10 day-pass upgrade',
    'Apply $10 toward a day pass or workshop booking',
    240,
    DATE_ADD(CURDATE(), INTERVAL 45 DAY),
    1,
    NOW(),
    NOW()
  ),
  (
    'cpc_demo_fifteen',
    'mrc_demo_store',
    '$15 duo bundle',
    'Bring a friend and save $15 on select experiences',
    360,
    DATE_ADD(CURDATE(), INTERVAL 60 DAY),
    1,
    NOW(),
    NOW()
  ),
  (
    'cpc_cafe_brunch',
    'mrc_demo_cafe',
    '$8 brunch card',
    'Apply $8 toward any handcrafted drink or brunch item',
    160,
    DATE_ADD(CURDATE(), INTERVAL 25 DAY),
    1,
    NOW(),
    NOW()
  ),
  (
    'cpc_cafe_pastry',
    'mrc_demo_cafe',
    'Complimentary pastry',
    'One seasonal pastry with purchase of any latte flight',
    200,
    DATE_ADD(CURDATE(), INTERVAL 40 DAY),
    1,
    NOW(),
    NOW()
  ),
  (
    'cpc_market_bundle',
    'mrc_demo_market',
    '$12 pantry bundle',
    'Redeem for a curated pantry bundle from local vendors',
    240,
    DATE_ADD(CURDATE(), INTERVAL 45 DAY),
    1,
    NOW(),
    NOW()
  ),
  (
    'cpc_market_produce',
    'mrc_demo_market',
    '$7 produce credit',
    'Apply $7 toward farm-fresh produce and greens',
    140,
    DATE_ADD(CURDATE(), INTERVAL 20 DAY),
    1,
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
  ),
  (
    'ord_demo_003',
    'ORD-7H8J9K',
    'mrc_demo_store',
    'prf_demo_user',
    'andysu@gmail.com',
    NULL,
    180.00,
    'USD',
    9,
    0,
    'completed',
    'pending',
    JSON_OBJECT(),
    NOW(),
    NOW()
  ),
  (
    'ord_demo_004',
    'ORD-9L0M1N',
    'mrc_demo_store',
    'prf_demo_user',
    'andysu@gmail.com',
    NULL,
    220.00,
    'USD',
    11,
    0,
    'completed',
    'pending',
    JSON_OBJECT(),
    NOW(),
    NOW()
  ),
  (
    'ord_demo_005',
    'ORD-2P3Q4R',
    'mrc_demo_cafe',
    'prf_demo_user',
    'andysu@gmail.com',
    NULL,
    320.00,
    'USD',
    26,
    0,
    'completed',
    'pending',
    JSON_OBJECT('notes', 'Latte flight + brunch'),
    NOW(),
    NOW()
  ),
  (
    'ord_demo_006',
    'ORD-5S6T7U',
    'mrc_demo_market',
    'prf_demo_user',
    'andysu@gmail.com',
    NULL,
    195.00,
    'USD',
    8,
    0,
    'completed',
    'pending',
    JSON_OBJECT('notes', 'Weekly produce share'),
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
  ),
  (
    'led_demo_user_001',
    'mrc_demo_store',
    'prf_demo_user',
    'ord_demo_003',
    90,
    'credit',
    'cashback',
    JSON_OBJECT('order_code', 'ORD-7H8J9K'),
    NOW()
  ),
  (
    'led_demo_user_002',
    'mrc_demo_store',
    'prf_demo_user',
    'ord_demo_004',
    110,
    'credit',
    'cashback',
    JSON_OBJECT('order_code', 'ORD-9L0M1N'),
    NOW()
  ),
  (
    'led_demo_user_003',
    'mrc_demo_cafe',
    'prf_demo_user',
    'ord_demo_005',
    130,
    'credit',
    'cashback',
    JSON_OBJECT('order_code', 'ORD-2P3Q4R'),
    NOW()
  ),
  (
    'led_demo_user_004',
    'mrc_demo_market',
    'prf_demo_user',
    'ord_demo_006',
    70,
    'credit',
    'cashback',
    JSON_OBJECT('order_code', 'ORD-5S6T7U'),
    NOW()
  );
