# RefChain MVP

Full-stack referral and loyalty demo using MySQL, Express, Next.js 14, and an optional Polygon Amoy ERC-1155 bridge. The monorepo contains:
- `apps/api` – Express API with zod validation, MySQL persistence, and optional Polygon balance checks / minting.
- `apps/web` – Merchant console (login, dashboard, mock orders, referral code generation, coupon catalog, wallet connect).
- `apps/user-web` – Member portal (sign up/login, balances, transactions, referral lookup, coupon + token redemption).
- `contracts` – Hardhat project with `MultiMerchantPoints` ERC-1155 for Polygon Amoy.

## What’s supported
- Email/password auth for merchants and members; bearer tokens are stored in-memory (restart clears sessions).
- Merchant dashboard: KPIs, latest orders, top referrals, create referral codes, create mock orders (cashback/referral points ledgered), view coupon catalog + issued coupons, connect wallet for on-chain balance checks, update merchant token id via API.
- Member portal: view balances per merchant, view ledger transactions, lookup referral code info, redeem coupons from merchant catalogs, redeem ERC-1155 tokens to a wallet when Web3 is configured.
- API surface in `apps/api/src/routes`: `/auth/login`, `/merchants`, `/orders`, `/referrals`, `/dashboard`, `/coupons/catalog` plus user-focused `/user/auth`, `/user/points`, `/user/transactions`, `/user/referrals/:code/info`, `/user/:userId/redeem-coupon`, `/user/:userId/redeem-token`, etc. All protected routes expect `Authorization: Bearer <token>`.

## Prerequisites
- Node.js >= 18.18
- MySQL 8.x with a database named `refchain`
- npm 9+ (workspaces enabled)
- Optional: MetaMask on Polygon Amoy, Hardhat (for contract deploys)

## Install dependencies
From repository root:
```bash
npm install
# If npm skips workspace installs, run:
npm --workspace apps/api install
npm --workspace apps/web install
npm --workspace apps/user-web install
npm --workspace contracts install
```

## Configure environment
Copy the template and fill in DB + Polygon settings:
```bash
cp .env.example .env
```
Important variables (all read by `apps/api`, Next.js apps read `NEXT_PUBLIC_API_BASE_URL`):
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` – MySQL connection (defaults point to the demo DB).
- `POLYGON_AMOY_RPC_URL`, `WEB3_PRIVATE_KEY`, `POINTS_CONTRACT_ADDRESS` – needed only for on-chain balance checks and token minting.
- `NEXT_PUBLIC_API_BASE_URL` – defaults to `http://localhost:4000/api`; change if you host the API elsewhere.

## Initialize the database
Run against your MySQL instance (replace host/port/user as needed):
```bash
mysql -h <host> -P <port> -u <user> -p refchain < supabase/schema.sql      # schema
mysql -h <host> -P <port> -u <user> -p refchain < mysql/mock_data.sql      # optional seed
```

Example using the provided demo DB credentials:
```bash
mysql -h 35.236.223.1 -P 3306 -u root -p refchain < mysql/mock_data.sql
# password: Refchain@123
```

## Run the stack locally
```bash
npm run dev:api        # http://localhost:4000
npm run dev:web        # http://localhost:3000 (merchant console)
npm run dev:web:user   # http://localhost:3001 (member portal)
```
Available builds: `npm run build:api`, `npm run build:web`, `npm run build:web:user`. Hardhat: `npm run dev:contracts` (compile) and `npm --workspace contracts run deploy:amoy`.

Demo accounts from `mysql/mock_data.sql`:
- Merchant console `apps/web`: email `merchant@test.com`, password `123456` (has “RefChain Studio” merchant with sample coupons).
- Member portal `apps/user-web`: email `andysu@gmail.com`, password `123456`.

## Optional Polygon Amoy bridge
1. Deploy `contracts/contracts/MultiMerchantPoints.sol` (ERC-1155) to Polygon Amoy:
   ```bash
   npm --workspace contracts run deploy:amoy
   ```
2. Put the deployed address + RPC URL + private key in `.env` (`POINTS_CONTRACT_ADDRESS`, `POLYGON_AMOY_RPC_URL`, `WEB3_PRIVATE_KEY`).
3. In the merchant console, click **Connect Wallet** to save a merchant wallet. If you have a token id for the merchant, update it via `PUT /api/merchants/:id/wallet` with `{ walletAddress, tokenId }` so the on-chain balance check uses the right id.
4. Members can now redeem points to tokens from `/merchant/[id]/token`; minting uses the configured contract/minter key.

Without these variables the app stays in “not configured” mode; all off-chain features continue to work.

## Notes on API/auth
- Sessions are in-memory (`apps/api/src/sessionStore.ts`); restarting the API invalidates tokens.
- Order creation (`POST /api/orders`) computes cashback/referral points and writes `point_ledger`. On-chain minting only happens when a member redeems tokens via `/api/user/:userId/redeem-token`.
- Coupon catalog + issuance live under `/api/coupons/catalog` (merchant) and `/api/user/:userId/redeem-coupon` (member).

## Repository map
- `apps/api/src/routes` – Express routers for auth, merchants, orders, referrals, dashboard, coupons, user flows.
- `apps/web` – Next.js 14 merchant UI components (`LoginForm`, `DashboardView`) and API helper.
- `apps/user-web` – Next.js 14 member UI (`LoginCard`, `UserDashboard`, coupon/token pages) and API helper.
- `contracts` – Hardhat config + `MultiMerchantPoints` contract + deploy script.
- `supabase/schema.sql` / `mysql/mock_data.sql` – schema + demo seed data.


# RefChain MVP — Architecture (current code)

## Stack flow
```text
Next.js apps (merchant console, member portal)
      │  REST (Bearer token)
      ▼
Express API (Zod validation, MySQL, optional ethers.js client)
      │
MySQL 8.x (schema in supabase/schema.sql)
      │
Optional: Polygon Amoy via MultiMerchantPoints (ethers.js)
```

- **Auth & session**: email/password only; sessions live in memory (`sessionStore.ts`), so restarting the API clears tokens. Merchant access is scoped by `merchant_members`.
- **Orders & points**: `POST /api/orders` auto-creates buyer profiles by email, computes cashback/referral points, inserts `point_ledger`, and increments referral usage. A MySQL trigger (`trg_point_ledger_balance`) keeps `wallet_balances` in sync.
- **Referrals**: merchants list/create codes via `/api/referrals`; users can look up codes and record clicks via `/api/user/referrals/:code/*`.
- **Coupons**: merchant catalog + stats via `/api/coupons/catalog`; members redeem through `/api/user/:userId/redeem-coupon`, which debits the ledger and issues a code.
- **Tokens / Web3**: on-chain minting only occurs in `/api/user/:userId/redeem-token`; regular orders stay off-chain. On-chain balance checks compare `point_ledger` totals with ERC-1155 `balanceOf` when wallet + token id + RPC/private key are configured.
- **Contracts**: `contracts/contracts/MultiMerchantPoints.sol` assigns one ERC-1155 token id per merchant; deploy with `npm --workspace contracts run deploy:amoy`.

## Data model notes (MySQL)
- `users` / `profiles`: canonical identity; seed passwords are plaintext for demo.
- `merchants` + `merchant_members`: merchant metadata and access control; wallet + token id live on `merchants`.
- `referral_links`: per-merchant codes with usage counts and activity flags.
- `orders`: monetary amount, referral linkage, computed cashback/referral points, status, and on-chain status fields.
- `point_ledger` + trigger-backed `wallet_balances`: append-only credits/debits and a running balance per merchant/profile.
- `coupon_catalog` / `coupons`: reward catalog and issued coupons.
- `token_redemptions`: tracks ERC-1155 mint requests; `sync_tasks` exists in the schema but is not used by the current API.
- `orders`: FK to merchant + buyer profile + referral link, monetary amount, computed cashback/referral points, status, blockchain sync flags, and transaction hash.
- `point_ledger`: append-only credits/debits tied to merchant + profile + order, allowing audits and reversals.
- `sync_tasks`: outbox table describing pending blockchain actions (`mint_points`, `revoke_points`) with payload JSON, retries, and last error.

## 4. API slice
- `POST /api/merchants` – create a merchant bound to the authenticated profile.
- `GET /api/merchants` / `GET /api/merchants/:id` – list merchants or fetch detail.
- `POST /api/referrals` – generate a referral code with optional max uses/expiry.
- `GET /api/referrals/:code` / `GET /api/referrals/merchant/:id` – fetch link metadata.
- `POST /api/orders` – record an order, compute cashback/referral points, emit ledger entries, and enqueue blockchain sync.
- `GET /api/orders/merchant/:id` – latest merchant orders.
- `GET /api/dashboard/merchant` – aggregated KPIs (orders, referral usage, outstanding points).
- `GET /api/auth/profile` – returns the hydrated profile for the caller (Magic DID token required).

## 5. Frontend design
- App Router with nested client components for login and the dashboard.
- `LoginCard` uses the Magic SDK to obtain a DID token, then calls `/api/auth/profile`.
- `useMerchantDashboard` (SWR) consumes `/api/dashboard/merchant` with the DID token header and powers stat cards, order timelines, and referral leaderboards.
- Tailwind + CSS variables provide theming, while React Hot Toast surfaces API feedback.

## 6. Blockchain + sync
- `contracts/MultiMerchantPoints.sol` implements ERC-1155 with `MINTER_ROLE` and `registerMerchant` for deterministic token IDs per merchant.
- `contracts/scripts/deploy.ts` deploys to Polygon Amoy and prints the address so it can be copied into the API env.
- The API stores on-chain `token_id` per merchant and writes `sync_tasks` rows whenever ledger credits need minting. A worker (implemented later) reads the tasks, invokes the contract via ethers, and updates `sync_tasks.status` + `orders.onchain_status`.

## 7. Development workflow
1. Apply `supabase/schema.sql` to a fresh Supabase project.
2. Configure Magic.link (publishable + secret keys) and drop them into `.env`.
3. Run `npm run dev:api` (port 4000) and `npm run dev:web` (port 3000).
4. Deploy the smart contract via Hardhat and set `POINTS_CONTRACT_ADDRESS` once ready.
5. Extend `sync_tasks` consumption via a worker/cron when blockchain automation is needed.
