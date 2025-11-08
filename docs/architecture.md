# RefChain MVP — Architecture

## 1. Issues fixed from the original specification
1. **Missing canonical profiles** – The spec stored `referrer_email`, `buyer_email`, and wallet addresses as raw strings. That prevents referential integrity, auditing, and auth binding. _Fix_: introduce a `profiles` table referenced by every record and hydrate it automatically from Magic metadata or order payloads.
2. **Duplicated merchant identity** – `orders` carried both `merchant_id` and `merchant_on_chain_id`, which would eventually diverge. _Fix_: keep blockchain metadata (collection id, contract address) on the `merchants` row and let orders reference merchants via a single FK.
3. **No loyalty ledger or sync story** – Points lived directly on the order row and never reconciled with Polygon. _Fix_: add a `point_ledger` double-entry table plus a `sync_tasks` outbox that the worker/Hardhat scripts consume before minting or burning ERC-1155 tokens.
4. **Ambiguous data access** – The document suggested both direct Supabase queries from the frontend and an Express backend, which would leak privileged keys. _Fix_: the browser always calls the API with a Magic DID token; only the API owns the Supabase service key.
5. **Validation/tooling mismatch** – Joi duplicates schemas already authored in TypeScript. _Fix_: use `zod` so runtime validation and static inference stay in sync and can be reused on the frontend.
6. **Untracked referral usage** – Referral usage counters were inferred from orders, making concurrent updates unsafe. _Fix_: `referral_links` now keep `usage_count` updated through a Postgres function invoked by the API.

## 2. Target system overview
```text
Next.js (Magic SDK + SWR)
      │
      ▼
Express API (Magic Admin, Zod, Supabase service)
      │              └─ ethers.js client for Polygon Amoy
      ▼
Supabase / Postgres (profiles, merchants, referrals, orders, point_ledger, sync_tasks)
```

- **Frontend**: Magic.link for auth, SWR hooks for dashboards, Tailwind for theming.
- **API**: Typed routers per domain (merchants, referrals, orders, dashboard, auth). Each route validates payloads with Zod, calls Supabase, and emits ledger + sync mutations.
- **Blockchain**: `MultiMerchantPoints` ERC-1155 contract mints merchant-specific token IDs. A lightweight worker (can be Hardhat script, Supabase Edge Function, or Temporal worker) drains `sync_tasks`.
- **Data**: Supabase handles auth (Magic DID -> profile), SQL, storage, and real-time notifications when a ledger entry changes.

## 3. Data model highlights
- `profiles`: every actor (merchant admin, ambassador, buyer) with unique email + wallet, optional Magic user id, and role.
- `merchants`: FK to owner profile, payout wallet, cashback/referral percentages, on-chain token id, contract metadata, status, and audit timestamps.
- `referral_links`: unique `code`, FK to merchant + owner profile, optional expiration/max uses, `usage_count`, and `is_active`.
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
