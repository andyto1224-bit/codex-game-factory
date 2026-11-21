# 母体仓库验收记录

日期：2026-11-21（Asia/Shanghai）。工作目录：`D:/Codex-Game-Development-bot`。
环境：Windows / Node.js v25.2.1 / pnpm 11.25.0。

## 官网与中文文档维护检查（2026-11-21）

本次补充 README、架构/API 与工具手册、贡献说明及关键模块中文注释；在 README 和 package.json 添加 `https://www.rosgames.com/` 官网入口。业务实现和 v1.0.0 标签保持不变。
`pnpm install --frozen-lockfile`、`pnpm run typecheck`、14 项单测、4 项工具集成测试、`pnpm run build`、模板静态审计及 `git diff --check` 全部通过。新生产 JS 674733 bytes、总产物 679834 bytes，与基线一致；本次未重复浏览器 E2E，以下浏览器结果属于初次母体验收。`pnpm run review` 已重新生成本地审核包。

## 依赖安装

`pnpm install` 成功，已生成 `pnpm-lock.yaml`。安装时 npm/CDN 曾出现连接重试，最终依赖安装完成。关键解析版本：TypeScript 5.9.3、Vitest 4.1.12、Vite 8.3.8、PixiJS 8.23.0、GSAP 3.15.1、Playwright 1.65.1。

## TypeScript 类型检查

`pnpm run typecheck` 通过。共享内核、模板及生成的临时项目均无类型错误。

## 单元测试

`pnpm run test` 通过。最终保留的工作区共 14 项测试：共享内核 9 项，模板 5 项。临时项目另运行相同 5 项测试并通过。
覆盖事件重入/once、1000 seeds 的 RNG 重放、对象池重复回收与代际失效、存储迁移/异常回退、平台广告结果/冷却/i18n、音频解锁/后台静音、五屏状态边界，以及异步场景切换/异常清理/加载中销毁。
示例属于确定性动作玩法，采用边界断言；没有将 RNG 重放宣称为 1000 局玩法 Monte Carlo。随机类正式游戏按 GDD 补充完整局模拟。

## 工具集成测试

`pnpm run test:tools` 通过，4 项集成测试。覆盖已有设计工件保留、空目标目录、包名替换、缓存目录跳过、拒绝重复建项、SVG 尺寸/XML 转义、正式资产保留、路径越界/别名拒绝，以及审计规则的负向样例。
负向样例故意输出违规 JSON，测试捕获失败并验证；不代表母体审计失败。

## 构建与静态审计

`pnpm run build` 与 `node scripts/audit-perf.mjs --project templates/pixi-ts` 通过。
最终模板：26 个 dist 文件，JS 原始总量 **674733 bytes**，全部产物 **679834 bytes**；预算分别 1572864 / 10485760 bytes；违规数 0。
生产 JS 未包含 `__GAME_TEST__`，Vite base 为相对路径。

## 脚手架与部署

执行过用户指定的命令：
```text
node scripts/init-project.mjs --name _smoke-test --template pixi-ts --skills puzzle
```
生成项目安装、类型检查、5 项单测均通过；`node scripts/gen-placeholder-assets.mjs --app _smoke-test` 正确保留已有资产。
`node scripts/deploy-static.mjs --app _smoke-test --platform web` 成功注入环境变量、构建、生成 release.json 并审计。该产物 JS 674732 bytes、总量 679996 bytes、违规 0。
临时项目验收后使用受限于固定 slug 且校验包身份的 `node scripts/cleanup-smoke.mjs` 清理，apps 仅保留 `.gitkeep`；锁文件不保留临时项目 importer。

## Playwright E2E 与关键帧

`pnpm run test:e2e`：桌面 Chromium 与 Pixel 7 移动模拟 **2/2 通过**。
覆盖 Start → HUD → Pause → Revive → GameOver、真实画布输入、重开、seed、320px resize，以及通过 document.hidden 注入触发真实 visibilitychange 处理器的暂停/显式恢复。未把注入测试宣称为真机后台测试。
关键帧：`templates/pixi-ts/_artifacts/_screenshots/{chromium,mobile-chromium}/01-start.png` 至 `05-gameover.png`，共 10 张；已视觉检查 Start/HUD 的布局。
浏览器下载经历网络重试；完整 Chromium 在本环境缺少 chrome.dll，使用官方 `playwright install --only-shell chromium` 成功安装 Headless Shell 并通过测试。无需改写或绕过浏览器 DLL。
验收发现并修复 Pixi autoDensity 写入画布尺寸导致安全区错位的问题，现从容器测量，并由 E2E 断言画布初始尺寸与 viewport 一致。

## 生产子路径验证

模板与临时项目各执行 `pnpm --filter @factory/<package> run test:production`，均通过。
纯 Node 静态服务器托管真实 dist 于 `/factory-check/`；验证真实画布点击加分、无页面/控制台错误、无资源 404、`window.__GAME_TEST__` 不存在。
模板截图：`templates/pixi-ts/_artifacts/_screenshots/production/subpath-hud.png`。

## 审核导出与交付边界

`pnpm run review` 生成根 `review.txt`，合并根 AGENTS、4 份 pipeline、8 份 skills（共 13 份协议文档）及核心目录树。
母体初次验收时 Git 已初始化 main 分支；之后已封板为 `09e9a9a`，`v1.0.0` 标签固定此首次提交。当前 `main` 的说明和注释维护通过后续提交交付，准确状态以 Git 历史为准。
仅 pixi-ts 薄壳已实现；其他引擎为路由规范。mock/web/gd/gm/poki 都使用默认 MockPlatformAdapter；此处只实际验证 web 打包，不宣称集成真实广告 SDK 或上传上线。性能审计覆盖静态规则与体积，真机帧率/内存、真实广告和平台认证仍需具体项目验证。
