# RefChain MVP – Quick Start

This repository contains a login-ready referral & loyalty demo. The stack includes:

- **API** – Node.js + Express + MySQL (schema also described in `supabase/schema.sql`).
- **Web** – Next.js 14 + Tailwind CSS (login, dashboard, referral generation, mock orders).
- **Web3 bridge** – Optional Polygon Amoy integration for minting ERC‑1155 points.

---

## After every `git pull`
Run the following from the repository root:

```bash
npm install
npm --workspace apps/api install
npm --workspace apps/web install
```

Set up environment variables (only needed once, but double-check after pulling):

```bash
cp .env.example .env           # contains DB + Polygon placeholders
# edit apps/web/.env.local if you change the API base URL
```

If you need fresh demo data:

```bash
mysql -h 35.236.223.1 -P 3306 -u root -p refchain < mysql/mock_data.sql
# password: Refchain@123
```

Finally start both services:

```bash
npm run dev:api   # API on http://localhost:4000
npm run dev:web   # Web on http://localhost:3000
```

Log in:

- **Merchant dashboard:** `http://localhost:3000`  
  - Email: `merchant@test.com`  
  - Password: `123456`  
  - RefChain Studio already has sample $5/$10/$15 coupons after you run the seed script above.
- **User rewards site:** `http://localhost:3001` (or the `apps/user-web` dev server)  
  - Email: `andysu@gmail.com`  
  - Password: `123456`

---

## Optional Polygon Amoy setup
To enable on-chain minting:

1. Deploy `RefChainPoints.sol` to Polygon Amoy (chain id 80002) and note the contract address.
2. Populate `.env` with:
   ```env
   POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
   WEB3_PRIVATE_KEY=0xYourTestWalletPrivateKey   # wallet with MINTER_ROLE
   POINTS_CONTRACT_ADDRESS=0xYourDeployedContract
   ```
3. In the dashboard, click **Connect Wallet** (MetaMask on Amoy) so the merchant record stores your address + token id.
4. Any new mock order will now invoke the mint function and record `transaction_hash` / `onchain_status`.

Without these variables the system stays in “not configured” mode; everything else still works.

---

## Key API routes (`apps/api/src/routes`)

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/auth/login` | POST | Email + password login, returns session token + merchant list |
| `/api/merchants` | GET | Merchants accessible by the current user |
| `/api/merchants/:id/wallet` | PUT | Save merchant wallet address (and optional token id) |
| `/api/dashboard?merchantId=` | GET | Totals, latest orders, top referrals |
| `/api/orders` | GET/POST | Fetch or create mock orders (mint points if Polygon is configured) |
| `/api/referrals` | GET/POST | List or create referral codes |
| `/api/points/onchain/:merchantId` | GET | Compare local vs on-chain balances |

All protected endpoints require `Authorization: Bearer <token>` (the token returned by `/api/auth/login`).

---

## Database scripts

- `supabase/schema.sql` – canonical schema (users, sessions, merchants, referrals, orders, ledger, etc.).
- `mysql/mock_data.sql` – wipes core tables and seeds demo user/merchant/referrals/orders (`token_id=1`).
- `mvp_schema.sql` – legacy lightweight schema from the original MVP spec (for reference only).

> Production note: the API currently stores sessions in memory; restarting the server invalidates tokens. Swap to a persistent session store if you need durability.

---

## Need help?
1. Pull latest changes.
2. Follow the “After git pull” commands above.
3. Re-run the Polygon setup if you moved machines.

If something still fails, share the exact command/output along with your `.env` (minus secrets). Happy building! 🎯
