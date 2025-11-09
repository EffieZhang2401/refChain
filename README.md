# RefChain MVP (Web2 Preview)

一个可登录的推荐与积分演示系统：

- **后端**：Node.js + Express，内置会话、商户、推荐码、订单与积分逻辑（数据存于内存，结构与 `supabase/schema.sql` 一致，随时可接入真正的 PostgreSQL / Supabase）。
- **前端**：Next.js 14 + Tailwind CSS，包含登录、仪表盘、推荐码生成、订单模拟。
- **DDL**：`supabase/schema.sql`（PostgreSQL 版）与 `mvp_schema.sql`（MySQL 版）分别提供了完整的数据库结构。

## 快速启动

1. 初始化环境变量  
   ```bash
   cp .env.example .env
   # 如需修改 API 地址/数据库连接，在各自文件内调整
   ```
   `.env` 默认已经填入提供的 MySQL 连接（host `35.236.223.1` / user `root` / password `Refchain@123` / db `refchain`），前端 `.env.local` 默认走 `http://localhost:4000/api`。

2. 安装依赖  
   ```bash
   npm install
   npm --workspace apps/api install
   npm --workspace apps/web install
   ```

3. 启动服务  
   ```bash
   npm run dev:api   # http://localhost:4000
   npm run dev:web   # http://localhost:3000
   ```

4. 使用演示账号登录前端  
   - 邮箱：`merchant@test.com`  
   - 密码：`123456`
5. （可选）准备 Polygon Amoy 连接  
   - 设置 `.env` 中的 `POLYGON_AMOY_RPC_URL / WEB3_PRIVATE_KEY / POINTS_CONTRACT_ADDRESS`
   - MetaMask 切换到 Amoy，与前端的 Connect Wallet 功能配合即可把钱包地址写入数据库，并触发积分上链。

登录后即可：
- 查看仪表盘的关键指标（订单数、待处理数、推荐使用次数、积分余额）
- 一键生成新的推荐链接
- 模拟创建带推荐码的订单，实时更新订单列表和积分

## 后端接口概览（`apps/api/src/routes`）

| Endpoint | Method | 说明 |
| --- | --- | --- |
| `/api/auth/login` | POST | 邮箱 + 明文密码登录，返回 token + 可访问商户 |
| `/api/merchants` | GET | 当前用户可管理的商户列表 |
| `/api/dashboard?merchantId=` | GET | 统计视图（订单、推荐、积分） |
| `/api/referrals` | GET/POST | 查询或生成推荐链接 |
| `/api/orders` | GET/POST | 查询或模拟创建订单 |

所有受保护的接口只需通过 `Authorization: Bearer <token>` 访问，不额外校验刷新令牌或多因素登录（符合题目“只需账号密码验证”的要求）。

## 新增 Web3 功能
- Dashboard 顶部可 “Connect Wallet”，成功后会把地址回写 `merchants.wallet_address`（并可选更新 `token_id`）。
- 模拟订单时，如果配置了 Polygon RPC + 合约 + 商户 tokenId，则会直接调用 ERC-1155 合约 `mint` 并记录 `transaction_hash`、`onchain_status`。
- 新增接口 `GET /api/points/onchain/:merchantId`，返回本地积分与链上积分的对比，前端会显示同步状态。

## 数据库脚本

- `supabase/schema.sql`：最新的 PostgreSQL DDL，覆盖用户、会话、商户、团队成员、推荐、订单、积分流水与审核日志等实体。
- `mysql/mock_data.sql`：基于现有 DDL 的 MySQL 测试数据脚本（清空相关表后插入演示账号/商户/推荐/订单/积分，并为商户设置 `token_id=1`），运行 `mysql -h 35.236.223.1 -P 3306 -u root -p refchain < mysql/mock_data.sql` 即可。
- `mvp_schema.sql`：来自《MVP版DDL.txt》的轻量 MySQL 版本，可作为学习参考。

## 进一步扩展

1. 把 `apps/api/src/data/store.ts` 替换为真实数据库查询（Supabase client、Prisma 等）。
2. 在 `contracts/` 目录启用 Hardhat，将积分 `mint`/`burn` 同步到 Polygon (ERC-1155)。
3. 引入密码哈希、刷新令牌、RBAC、Webhook 等生产级能力。
