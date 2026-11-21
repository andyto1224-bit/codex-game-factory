# 贡献与维护说明

官方网站：[ROSGames](https://www.rosgames.com/) · [项目主页](README.md) · [问题反馈](https://github.com/andyto1224-bit/codex-game-factory/issues)

## 先确认修改属于哪一层

工厂母体维护直接修改共享内核、模板、工具和文档；具体游戏开发按根 [AGENTS.md](AGENTS.md) 与项目局部协议执行四阶段流程。项目不得复制共享内核，也不得把样例通过当成正式游戏的人审批准。

修改公共 API 时同步更新中文 JSDoc、[架构 API 说明](docs/ARCHITECTURE.md) 和相关调用方。修改脚本参数时同步更新 [工具手册](docs/TOOLING.md)。注释说明输入/返回值、生命周期、失败处理及采用该实现的原因，避免逐行复述代码。

保持 strict TypeScript；state 层纯逻辑；资源相对路径；平台功能通过适配器；生产剔除 TestBridge。自动化脚本使用 Node ESM 和 Node 文件 API，无 Shell 平台文件命令。

## 提交前验证

```text
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run test:tools
pnpm run build
node scripts/audit-perf.mjs --project templates/pixi-ts
```

涉及画布、UI、输入、资源或生命周期行为时，安装浏览器后再运行：

```text
pnpm run test:e2e
pnpm --filter @factory/template-pixi-ts run test:production
```

仅说明/注释改动无需新增镜像测试；按影响运行必要检查。随机玩法使用 GDD 指定区间的 1000 局完整模拟；动作玩法运行确定性边界断言。测试报告明确命令、结果与未覆盖项，不填造真机性能或 SDK 接入状态。

## 提交内容与版本

提交源代码、锁文件、协议和必要验收文档；不提交 node_modules、dist、截图、`.env` 或可重新生成的 review.txt。访问令牌使用本机凭据管理器或部署平台的密钥配置，不写入仓库和 `VITE_*` 公共变量。

`main` 接收后续维护提交；`v1.0.0` 永久指向首次封板基线，不移动旧标签来覆盖历史。文档完善不会自动变更包版本；需要新发布时另行确定版本号、验收并创建新标签。根 `private: true` 保持 npm 防误发布设置；GitHub 的 Public/Private 由仓库设置独立管理。

## 问题反馈

在 Issues 提供 Node/pnpm 版本、系统、执行目录、命令、预期/实际结果和可复现 seed。分享报错前移除访问令牌与用户个人数据。玩法需求同时给出 GDD/TECH_ARCH 中对应条目，避免把渲染效果问题误判为纯状态问题。
