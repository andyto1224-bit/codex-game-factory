# codex-game-factory

面向 H5 小游戏的 pnpm Monorepo 工厂母体：共享 TypeScript 内核、PixiJS v8 薄壳、四阶段人审协议及跨平台 Node ESM 工具链。

## 环境与安装

Node.js ≥22.13（推荐当前 LTS）、pnpm 11.25.0。当前模板使用 Vite 8、PixiJS 8、GSAP 3、TypeScript 5.9、Vitest 4、Playwright；精确解析版本锁定于 `pnpm-lock.yaml`。

```text
pnpm install
pnpm run typecheck
pnpm run test
pnpm run test:tools
pnpm run build
```

所有维护脚本为 `.mjs`，使用 Node 文件 API 与无 Shell 子进程；包含本地 pnpm CLI 依赖，部署脚本不会在 Windows 上尝试执行 `.cmd`。

## 开始项目

先读根 `AGENTS.md`，每次游戏会话执行一个阶段，尊重两个人审门禁。可在建项前将批准的设计放入 `apps/<slug>/_artifacts/`，脚手架会原样保留。除该工件目录之外有任何文件的现有项目均拒绝覆盖。

```text
node scripts/init-project.mjs --name star-demo --template pixi-ts --skills puzzle
pnpm install
node scripts/gen-placeholder-assets.mjs --app star-demo
pnpm --filter @factory/star-demo run dev
```

`--skills puzzle,roguelike` 可组合，仅选择适用类型。所有命令从仓库根运行。`pixi-matter` / `phaser4-ts` / `threejs-ts` 在路由矩阵中有选择依据，但母体仅交付已实现的 `pixi-ts`，脚手架会拒绝不存在的模板。

模板示例为确定性的点击收集器，用来验证五屏、输入、音频和生命周期；不等于完整 puzzle/roguelike。正式项目的随机玩法须按规范补充 1000 局完整 Monte Carlo。示例动作状态采用确定性边界断言，内核另验证 1000 seeds 的 RNG 重放。

## 资产契约

根项目清单 `apps/<slug>/assets.manifest.json`：

```json
{
  "version": 1,
  "assets": [
    { "id": "orb", "path": "assets/orb.svg", "width": 160, "height": 160,
      "anchor": [0.5, 0.5], "color": "#ffcc4d", "label": "TAP" }
  ]
}
```

占位脚本只生成缺失的 SVG（尺寸 1–4096），不会覆盖已有正式资源。改尺寸后需要先由开发者移走对应旧占位图再生成。正式美术覆盖 `public/assets/` 的同路径文件，保持格式、尺寸、锚点和透明边界，重新构建即生效，无需修改源代码。新增资源须登记清单，已有资源替换无需编辑清单。脚本拒绝路径越界、重复 ID/路径及非法 SVG 颜色。

## 浏览器验收

```text
pnpm --filter @factory/template-pixi-ts exec playwright install chromium
pnpm run test:e2e
pnpm --filter @factory/template-pixi-ts run build
pnpm --filter @factory/template-pixi-ts run test:production
```

项目可用 `pnpm --filter @factory/<slug> run test:e2e` 和构建后的 `run test:production`。桌面与移动 Chromium 测试真实画布输入、五屏流程、复活、重开和 resize，关键帧写入项目 `_artifacts/_screenshots/`。生产检查用纯 Node 静态服务器在 `/factory-check/` 子路径验证实际 dist、真实输入、资源无 404 及调试接口不存在。TestBridge 仅在 dev/test 中可用，生产静态审计要求其字符串完全剔除。初次安装浏览器需要网络。

## 审计与静态产物

```text
pnpm --filter @factory/star-demo run build
node scripts/audit-perf.mjs --app star-demo
node scripts/deploy-static.mjs --app star-demo --platform web
```

审计支持 `--max-js-bytes 1572864 --max-total-bytes 10485760`；默认分别 1.5 MiB 原始 JS 总量和 10 MiB 全部产物。失败退出码非零。扫描源码、state 的本地传递依赖、HTML/CSS/public 与 dist，检测引擎/DOM、显式 any、忽略类型指令、绝对资源路径、Vite base 和生产调试残留。它是保守的静态防线，不能替代 code review，也不保证识别任意字符串拼接/外部包间接副作用。

`--platform mock|web|gd|gm|poki` 注入 `VITE_PLATFORM`，清理并构建本项目 dist，写入 `release.json` 后再审计。所有目标当前都使用 MockPlatformAdapter，不含真实 SDK、广告或外部上传。上线 gd/gm/poki 前需实现对应适配器并完成平台验收。环境变量不含密钥，Vite 的 `VITE_*` 会进入公开 bundle。

模板可用 `--project templates/pixi-ts` 代替 `--app` 运行占位生成/审计。生产资源全部相对路径，支持子目录和 iframe 静态托管；还需真机补充后台恢复、帧率/内存和真实平台测试。

## 审核包与结构

```text
pnpm run review
```

生成根 `review.txt`：包含根 AGENTS、4 份 pipeline、8 份 skills 和排除依赖/产物的核心目录树。`VALIDATION.md` 记录本次母体真实验收结果。

```text
packages/game-core/     单一共享内核与单元测试（直接导出 TS，无独立 build）
templates/pixi-ts/      可运行的引擎薄壳、五屏示例与测试
apps/                  由脚手架生成的游戏（审核工件留在项目内）
pipeline/              四阶段执行手册
skills/                foundation / polish / genres 分层规范
scripts/               建项、占位图、审计、静态打包、审核导出
```
