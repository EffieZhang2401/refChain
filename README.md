# RefChain MVP

RefChain now ships with a **minimal JSON驱动 demo**，方便你在本地快速体验前后端联动，无需搭建 Supabase、Magic.link 或 Polygon 节点。完整的 Web3 版架构依旧保存在 `docs/architecture.md`，随时可以在此基础上扩展。

## 架构速览（Mini 版本）
- **Web**：Next.js 14 + Tailwind CSS，直接请求本地 API。
- **API**：Express 4，所有数据均从 `apps/api/db.json` 读取。
- **Data**：单个 JSON 文件即“数据库”，改完即可立即看到 UI 变化。
- **Contracts**：Hardhat/ERC-1155 脚手架依然保留，等需要链上功能时再启用。

## 仓库结构
```
.
├── apps
│   ├── api        # 轻量 Express API（读取 db.json）
│   └── web        # Next.js 仪表盘
├── contracts      # Hardhat + ERC-1155（可选）
├── docs           # 完整架构说明
├── supabase       # 原始 SQL schema
├── package.json   # npm workspaces
└── README.md
```

## 快速运行（JSON Demo）
1. 复制 `.env.example` → `.env`（只需要 `PORT` 与 `NEXT_PUBLIC_API_BASE_URL`）。
2. 安装依赖：
   ```bash
   npm install
   npm --workspace apps/api install
   npm --workspace apps/web install
   ```
3. 根据需要编辑 `apps/api/db.json`（示例数据已内置）。
4. 分别启动后端与前端：
   ```bash
   npm run dev:api    # http://localhost:4000
   npm run dev:web    # http://localhost:3000
   ```
5. 打开浏览器访问 `http://localhost:3000`，无需登录即可看到仪表盘示例。

## 环境变量
- `.env`（给 API）：`PORT=4000`
- `apps/web/.env.local`：`NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api`

## 可选：恢复到真实后端
当你准备接入 Supabase / Magic.link / Polygon 时：
1. 运行 `npm --workspace contracts install` 并使用 Hardhat 部署 ERC-1155；
2. 将 `supabase/schema.sql` 应用到数据库，然后重新实现 API；
3. 按照 `docs/architecture.md` 重新加入鉴权、数据校验与链上同步逻辑。

## 后续建议
- 将 `apps/api/db.json` 替换为数据库或 Supabase 表；
- 加入 Playwright / Vitest 等自动化测试；
- 依据实际需求扩展为生产级多租户推荐系统。
