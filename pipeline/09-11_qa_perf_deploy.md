# Stage 4 · Step 09–11：验收、审计与发布

输入：所有设计/技术/白盒/打磨工件、两个人审记录、固定 seed 和关键帧列表。

1. Step 09：运行 `pnpm run typecheck`、`pnpm run test`，随机玩法补齐 1000 局报告。首次环境执行 `pnpm --filter @factory/<slug> exec playwright install chromium`，再执行 `pnpm --filter @factory/<slug> run test:e2e`。E2E 依赖明确状态，禁止任意睡眠；截图写 `_artifacts/_screenshots/`。覆盖 Start/HUD/Pause/Revive/GameOver、重开、尺寸变化、页面报错、移动端触控、后台恢复。
2. Step 10：`pnpm --filter @factory/<slug> run build`，再 `node scripts/audit-perf.mjs --app <slug>`。记录 JS 原始体积、总资源体积、违规源路径、生产 TestBridge 是否剔除。默认预算 JS 1.5 MiB、总资源 10 MiB；修改必须有 TECH_ARCH 依据，参数见 README。
3. Step 11：`node scripts/deploy-static.mjs --app <slug> --platform web`；支持 mock/web/gd/gm/poki。这只产生本地静态目录，不上传、不内置真实广告 SDK。脚本注入 `VITE_PLATFORM`，对最终 `dist/` 自动再审计；交付前在子路径静态服务器验证资源。

输出 `_artifacts/06_RELEASE_QA.md` 模板：
```md
# RELEASE QA
版本 / 平台 / 时间 / 审批引用：
typecheck / 单测 / Monte Carlo / E2E 命令、退出码、统计：
关键帧路径 / 浏览器 / viewport / seed：
内存/帧率采样方法、设备与结果：
ObjectPool 清单 / 退出释放验证：
audit JS bytes / total bytes / budgets：
dist 相对入口 / 平台 SDK 就绪情况 / 已知限制 / 回滚方式：
```
性能审计只覆盖静态规则与体积，不替代真实设备帧率、GPU 和内存测试。
