# RefChain MVP

RefChain is a Supabase + Magic.link + Polygon powered referral and loyalty MVP for multi-merchant brands.

## Architecture Snapshot
- **Web** – Next.js 14 (App Router) with Tailwind CSS, SWR for data fetching, and Magic.link for passwordless wallet-ready auth.
- **API** – Express + Zod + Supabase service client acting as the single data gateway, orchestrating loyalty logic and blockchain sync tasks.
- **Smart contracts** – Hardhat + Solidity ERC-1155 (MultiMerchantPoints) deployed to Polygon Amoy for transparent point issuance.
- **Data** – Supabase/PostgreSQL stores profiles, merchants, referral links, orders, the points ledger, and blockchain sync tasks.

## Repository Layout
```
.
├── apps
│   ├── api        # Express + Supabase service
│   └── web        # Next.js dashboard
├── contracts      # Hardhat + ERC-1155
├── docs           # High level design notes
├── supabase       # SQL schema & seeds
├── package.json   # npm workspaces entry point
└── README.md
```

## Quick start
1. Copy `.env.example` to `.env` and provide Supabase, Magic.link, and Polygon Amoy credentials.
2. Install dependencies:
   ```bash
   npm install
   npm --workspace apps/api install
   npm --workspace apps/web install
   npm --workspace contracts install
   ```
3. Start services:
   ```bash
   npm run dev:api
   npm run dev:web
   ```
4. Deploy / test the contract layer via Hardhat when needed:
   ```bash
   npm --workspace contracts run compile
   npm --workspace contracts run test
   ```

## Environment variables
- Global variables live in the root `.env` (see `.env.example`).
- The API expects Supabase service keys and the Magic secret key.
- The web app needs anon Supabase keys + the Magic publishable key.
- Hardhat needs `POLYGON_AMOY_RPC_URL`, `WEB3_PRIVATE_KEY`, and an optional `POINTS_CONTRACT_ADDRESS` (also read by the API when set).

## Documentation
- `docs/architecture.md` captures the reasoning behind the updated data model and component split.
- `supabase/schema.sql` is the canonical schema; run it once per Supabase project.

## Testing & linting
- `npm --workspace apps/api run test` (placeholder) for backend logic.
- `npm --workspace contracts run test` executes Hardhat test suites.
- `npm --workspace apps/web run lint` runs Next.js lint.

## Next steps
- Wire the API to Supabase edge functions if you need serverless scaling.
- Replace the simple in-process sync worker with a queue worker (Supabase Functions or Temporal) once throughput increases.
- Extend the dashboard with analytics charts fed by Supabase real-time channels.
