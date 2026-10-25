> V2 在线版已接入资料库、规则生成与账号服务。参见 [online/README.md](online/README.md) 与 [V2 验收报告](docs/V2_TEST_REPORT.md)。以下为保留的本地 V1 说明。

# FitLead AI V1.0

可在本地运行的健身评估与私教咨询 MVP。Next.js App Router + TypeScript + Tailwind CSS + shadcn 风格的 Radix/CVA Button + React Hook Form/Zod；FastAPI + SQLAlchemy + Pydantic v2；PostgreSQL + Alembic。

**当前服务是明确标注的规则引擎演示，不调用真实 AI。无需普通用户注册，没有在线支付。** 咨询申请免费；真人服务的交付与价格需要另行确认。不要把咨询提交成功误认为预约时间已经确认。

## 现在访问

在服务保持运行期间：

- 前端：http://127.0.0.1:3000
- API 健康检查：http://127.0.0.1:8000/health
- API 文档：http://127.0.0.1:8000/docs
- 管理后台：http://127.0.0.1:3000/admin

本次已生成的本地管理员用户名为 `admin`，随机密码保存在根目录 `.env` 的 `ADMIN_PASSWORD`。没有公开默认密码。`.env`、加密密钥和数据库文件不会进入 Git。

## 文件结构

```text
fitlead-ai/
├── apps/web/
│   ├── app/                 首页、assessment、plan/[id]、consultation、admin、privacy
│   ├── components/          通用按钮、来源记录、已保存方案入口
│   ├── hooks/               浏览器已保存方案读取
│   ├── lib/                 同源 API 客户端与来源参数校验
│   ├── types/               结构化方案类型
│   └── tests/               Playwright 新用户验收
├── services/api/
│   ├── app/
│   │   ├── api/             路由说明（V1 路由在 main.py 组合）
│   │   ├── core/            环境与联系方式加密配置
│   │   ├── models/          11 张 UUID 标识数据表
│   │   ├── schemas/         输入和输出 Schema
│   │   ├── services/        评估、安全、营养、训练、验证、线索、种子数据
│   │   └── agents/          真实 AI 预留边界，当前关闭
│   ├── alembic/             初始迁移
│   └── tests/               15 项 API/安全验收
├── tools/                   可选 Windows PostgreSQL 开发运行时与校验脚本
├── docs/                    测试报告、架构说明、截图
├── IMPLEMENTATION_PLAN.md
├── docker-compose.yml
└── .env.example
```

## 本机启动（Windows PowerShell）

需要 Node.js 20.9+、Python 3.12、PostgreSQL 17，或使用下面的可选本地数据库工具。默认选择 Webpack，避免本次 Windows 环境遇到的 Turbopack 子进程故障。

首次安装：

```powershell
cd fitlead-ai
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/api/requirements.lock.txt
cd apps/web
npm ci
cd ../..
```

本次环境的 Python 位于 `C:\Users\MLRRRR\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`。默认 WindowsApps 的 `python` 不是可用运行时。本次已在 `.venv` 安装依赖，无需重复安装。

数据库，任选一种：

1. 已有 PostgreSQL：复制 `.env.example` 为 `.env`，配置 `DATABASE_URL`、至少 12 位 `ADMIN_PASSWORD` 与 Fernet `CONTACT_ENCRYPTION_KEY`。
2. 本项目可选 Windows 工具（本次已安装并运行）：

```powershell
npm ci --prefix tools
node tools/local-postgres.mjs
```

工具使用 PostgreSQL 17.10 二进制，只绑定 `127.0.0.1:55439`，不创建系统服务。数据库与二进制放在当前用户 Temp 下独立的 `fitlead-pg-*` 目录，以规避中文路径编码问题；凭据与连接串保存在被忽略的 `.runtime/`。保留该终端。此工具仅供 Windows 开发；包装包使用其发布的 beta 版本标签，生产使用标准 PostgreSQL/Compose。

仅首次使用工具且没有 `.env` 时执行：

```powershell
.\.venv\Scripts\python.exe tools/configure_local.py
```

该脚本生成随机管理员密码和加密密钥，拒绝覆盖已有 `.env`。若只需临时 SQLite 演示，设置 `DATABASE_URL=sqlite:///./fitlead.db`；SQLite 不是生产数据库，本次最终联调实际使用 PostgreSQL。

第二个终端启动后端：

```powershell
cd fitlead-ai/services/api
..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

第三个终端启动前端：

```powershell
cd fitlead-ai/apps/web
$env:NEXT_TELEMETRY_DISABLED='1'
npm run dev
```

浏览器打开 `http://127.0.0.1:3000/?source=xiaohongshu&campaign=note01`。请始终使用相同主机名和浏览器；`localhost` 与 `127.0.0.1` 的 Cookie 不互通。匿名令牌丢失后不支持恢复旧方案。

## Docker Compose

先在根目录 `.env` 设置 `ADMIN_PASSWORD` 和 `CONTACT_ENCRYPTION_KEY`，可选设置 `POSTGRES_PASSWORD`。然后：

```powershell
docker compose up --build
```

数据库健康后，API 自动执行迁移和种子数据；前端编译时 API 地址为内部 `http://api:8000`。本次机器没有 Docker，**Compose 配置未实际运行验证**。它是本地开发配置；正式上线需 HTTPS、Secure Cookie、多实例限流、备份与数据保留策略。

## 关键行为

- 六步问卷，前后端校验、进度、上一步、确认摘要与单独的数据处理同意。
- 任一风险为“是”或“不确定”、未成年人、超过自动规划范围的年龄/BMI、危险目标体重、未解析饮食限制，都转人工评估。
- Mifflin–St Jeor 基础代谢估算；显式说明活动系数假设。适度能量调整与宏量参考，不保证实际个体需求。
- 每周训练受经验、器械和天数约束；力量日留恢复间隔，额外训练日为低强度活动，提供组次、余力、替代动作、热身和恢复。
- 7 天饮食为熟重份量示例，按所选常见过敏原保守过滤。**尚未逐餐精确匹配宏量目标，不是临床配餐。** 未列出的限制停止自动规划，避免靠关键词猜测。
- 服务端保存方案、原浏览器令牌鉴权、JSON 导出、首页继续查看。
- 只有单独授权咨询后才建立可联系线索；预约申请不等于时间确认。
- 后台安全哈希密码、HttpOnly 会话、授权客户列表、来源统计、状态流转、备注。
- 联系方式 Fernet 加密；匿名访问令牌仅存 SHA-256；事件与健康/联系数据分表。撤回联系授权及删除本人数据可在隐私页操作。
- 来源仅接受 direct/douyin/xiaohongshu，campaign 只接受 64 位以内字母数字、下划线或连字符。
- 同源代理、CORS、Origin 检查、基础单进程内存限流；响应统一为 `{ok,data,error}`，校验错误不回显原始敏感输入。

## 测试

```powershell
cd services/api
..\..\.venv\Scripts\python.exe -m pytest -q
..\..\.venv\Scripts\python.exe -m ruff check app tests
..\..\.venv\Scripts\python.exe -m ruff format --check app tests alembic
cd ../../apps/web
npm run typecheck
npm run build
npm run test:e2e
```

Playwright 默认使用本机 Edge。其他平台先执行 `npx playwright install chromium`，再设置 `$env:PW_CHANNEL='chromium'`。要覆盖已认证后台流程，设置 `TEST_ADMIN_PASSWORD` 为本地 `.env` 中密码；不要提交凭据到测试文件。测试使用演示邮箱，不会发邮件、短信或扣款。

PostgreSQL 测试：从根目录运行 `tools/verify_postgres.py`，其创建独立 `fitlead_test`；将 `.runtime/test-database-url.txt` 内容赋给 `TEST_DATABASE_URL` 再执行 pytest。**测试会重建目标测试库的业务表，只能传独立测试库。** 迁移回滚验证也只对该测试库执行，不对应用库执行。

详细实际结果、问题截图与修复见 `docs/TEST_REPORT.md`。

## 未启用与后续工作

- 真实 OpenAI 调用与实时对话未启用；`/api/v1/chat` 返回 `enabled:false`。Key/模型环境变量仅预留，配置 Key 也不会触发付费调用。
- 不提供普通账号注册、跨设备身份恢复和在线支付；V1 的匿名评估与免费咨询链路不依赖这些功能。
- 32 种食材为明确标注的演示目录，未核实营养值保留 null；32 个训练动作已有种子数据。下一阶段应接入有授权、可追溯的营养数据库，逐餐校验能量与宏量，并由专业人员审核规则。
- 无自动数据过期清理、短信/邮件通知、CRM 集成、退款、订单或排课系统；未正式部署。
- 限流为单进程内存实现，后台展示最近 200 位授权客户。规模化需共享限流、分页、审计、运维监控和定期清理。

Next.js 安装与 CLI 约定参考其随依赖提供的官方文档：`apps/web/node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md` 与 `01-app/03-api-reference/06-cli/next.md`；线上参考 [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)。

