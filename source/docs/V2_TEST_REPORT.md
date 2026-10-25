# FitLead V2 在线升级验收

日期：2026-10-25（Asia/Shanghai）。原网站已经更新；没有将本地测试冒充线上验收。

## 访问与部署证据

- [原 GitHub Pages 网站](https://maolr3612-boop.github.io/fitlead-ai/)
- [资料库](https://maolr3612-boop.github.io/fitlead-ai/library/)
- [账号与健康记录](https://maolr3612-boop.github.io/fitlead-ai/account/)
- [在线 API 健康状态](https://fitlead-health-api.maolr3612.workers.dev/health)
- [可编辑源代码分支](https://github.com/maolr3612-boop/fitlead-ai/tree/codex/health-v2-backend/source)

GitHub Pages 最终修复版本提交：`d9518f808561c17288a429f2308ead073e2c182a`。GitHub Pages API 返回 `built`，前端 HTTP 200，旧的“方案生成未接入后台”提示已移除。

Worker：`fitlead-health-api`；D1：`fitlead-health-v2`。均为本次新建的独立资源，其他 Cloudflare Workers 和数据库未被修改。最终 Worker 部署标识：`06eb5686c2e142cda6f0a3dd061800bb`；上传源码 SHA-256：`72b944f2f51660f9e41d35587fbd9d2ef9f1a28e1f4c8924365e94c778b5fb77`。更新时显式保留 DATA_KEY secret，没有轮换已使用的数据密钥。

## 资料与授权

实际导入 876 个 free-exercise-db 动作文本、8,156 个 USDA 食物条目。USDA 版本为 SR Legacy 2018-04 与 Foundation 2026-04-30。源文件原始 SHA-256、大小、导入日期与条目数见 [manifest.json](../online/data/manifest.json)，不是随机生成的“全球数据”。

USDA 数据为 CC0 / public domain；动作仓库声明 Unlicense，本次只导入文本，未复制动作图片。13 项来源登记了 URL、适用领域、授权边界与核对日期，包括 WHO、NICE、NHS、EFSA、ISSN 和 Mifflin 论文。WHO 康复出版物的非商业限制已注明，只提供索引与独立简述，没有复制整本专业手册。

康复部分是 8 个教育主题和风险转介，不是完整临床数据集，不诊断、不替用户开康复处方。资料库不宣称“全球最全面”或获得收录机构背书。

## 实际测试结果

| 验证 | 结果 |
| --- | --- |
| Workers 本地 D1 迁移 | 通过，0001_accounts.sql |
| Cloudflare 插件执行远程初始化 | 通过，14 条 SQL 语句成功 |
| Workers TypeScript 检查 | 通过 |
| 本地 API 与规则参数测试 | 6/6 通过 |
| 公网 API 与规则参数测试 | 6/6 通过，52.3 秒 |
| 新参数组合检验 | 142 组可生成组合通过；2 组约束不成立的植物性基线明确转营养师评估 |
| 本地 UI Playwright / Edge | 4/4 通过，30.4 秒 |
| 静态发布文件 + 真实公网 API | 4/4 通过，38.6 秒 |
| 最终公开网址 Playwright / Edge | 4/4 通过，52.1 秒 |
| 前端生产静态构建 | 通过，10 个生成页面 |
| 前端 tsc --noEmit | 通过 |
| 在线服务 npm audit | 0 vulnerabilities（已升级 Zod，并覆盖修补开发工具的 undici） |
| 真实 LLM、邮件/短信、支付 | 未启用，没有付费模型调用或扣款 |

生产静态构建有 Next.js 关于静态导出不支持 rewrites 的提示；静态版配置实际返回空 rewrites，客户端直接访问独立 API，不依赖静态主机执行代理。该提示不代表服务端代理已在 GitHub Pages 生效。

API 验证覆盖：真实公开数据检索、计量基准、方案菜单实际能量汇总、七天结构、花生等所选常见过敏原过滤、器械和时间约束、恢复间隔、疼痛/未知风险/未成年/危险目标/额外饮食限制/紧急信号拦截、饮水限制未确认时不给数字、注册与匿名历史归属、跨设备登录、记录更新、错误日期拒绝、导出、恢复码重置与旧会话撤销、永久删除、非所有者拒绝、CORS 和请求大小限制。

每日饮水量是“总水”参考，明确扣除食物菜单水分后才能解释饮料部分；没有把 EFSA 总水要求误当作额外白水处方。运动与高温的额外需求不做精确伪造。有医嘱限水时不自动给常规训练/营养方案。

## 浏览器流程

1. 新访客打开真实首页，进入资料库，查询“深蹲”和“米饭”，阅读康复、饮水和来源授权页签。
2. 实际填写健康成年问卷、选择花生过敏和确认无饮水限制，生成并读取个人方案，查看 USDA 菜单汇总与个人饮水参考。
3. 在方案所在标签页注册账号，确认方案进入该账号历史；记录体重、饮水、睡眠和训练，导出账号 JSON。
4. 用另一个新浏览器先直接访问方案，确认被拒绝；登录同一账号后，确认可读取历史方案与已保存记录；用密码确认永久删除账号。
5. 持续疼痛用户不生成常规计划，展示专业评估提示；移动端资料与账号页检查无横向溢出。

测试使用合成身体数据和临时测试账号，不是实际客户。截图中的恢复码来自测试账号，不是运营账号凭据。健康信息、访问令牌、加密密钥和真实管理员密码没有上传到公开仓库。

## 发现的问题与修复

- **GitHub Pages 的软导航错误**：真实网站复测发现 `__next.*.__PAGE__.txt` 段数据请求返回 404，并在从账号历史进入方案时出现模块不匹配错误。静态发布版已通过 site-link 使用完整文档跳转，本地服务器模式保留 NextLink。不是靠忽略浏览器错误让测试通过。
- **网络可能一直加载**：API 客户端已增加 20 秒超时和重试提示。公网验收等待采用合理网络时限，仍要求真实内容出现。
- **手机账号入口不显眼、标题换行生硬**：补移动顶部快捷入口并缩短标题。截图检查已保存。
- **依赖审计**：初始解析器版本与开发工具依赖报告漏洞，已升级为已检查的 Zod 4.6.7、undici 7.30.1+；最终 audit 为零。没有把开发工具警告隐藏成“完全无检查”。

修复前证据：[手机导航](screenshots-v2-static/issues/01-mobile-navigation-before.png)、[静态路由错误](screenshots-v2-live/issues/02-pages-route-before.png)。

最终公开网址截图：

- [食物营养检索](screenshots-v2-live/01-food-library.png)
- [个人饮水参考](screenshots-v2-live/02-personal-hydration.png)
- [账号历史与健康记录](screenshots-v2-live/03-account-history.png)
- [风险拦截](screenshots-v2-live/04-online-risk-review.png)
- [手机资料库](screenshots-v2-live/05-library-mobile.png)
- [手机账号页](screenshots-v2-live/06-account-mobile.png)

## 交付边界

这是有来源的健康起步规则服务，不是“覆盖所有人体情况”的临床系统。生成器采用较小的已核对食材/动作子集，完整目录用于查询；周菜单是定量基线而非长期多样化、微量营养完整的饮食处方。纯植物蛋白目标和实际菜单汇总会明确区分，无法满足约束时停止自动生成。

普通账号、云端私人数据与规则方案已经接通；生成式 AI、邮箱/短信验证、在线支付、在线管理员和自动健康数据到期清理仍未启用。已有的本地 FastAPI/PostgreSQL V1 与管理员没有被替换为 Cloudflare D1，二者为独立运行模式。进一步商业/医疗规模化需要专业审核、隐私治理、运营权限与独立安全审计。
