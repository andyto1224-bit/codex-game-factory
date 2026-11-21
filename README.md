# codex-game-factory

**ROSGames 官方网站：[https://www.rosgames.com/](https://www.rosgames.com/)**

代码仓库：[andyto1224-bit/codex-game-factory](https://github.com/andyto1224-bit/codex-game-factory) · 问题反馈：[GitHub Issues](https://github.com/andyto1224-bit/codex-game-factory/issues) · 基线版本：[`v1.0.0`](https://github.com/andyto1224-bit/codex-game-factory/tree/v1.0.0)

面向 H5 小游戏的 pnpm Monorepo 工厂母体：共享 TypeScript 内核、PixiJS v8 薄壳、四阶段人审协议及跨平台 Node ESM 工具链。

这是用于创建、开发和验收游戏的工程母体。仓库内提供一个可运行的点击收集示例；官网链接指向 ROSGames 主站。公开代码仓库、npm 发布和网站托管是不同事项：根 `package.json` 的 `private: true` 用于防止误发 npm 包，不限制 GitHub 公开访问；设置官网不会自动把游戏发布到 ROSGames 或 GitHub Pages。

## 文档导航与支持范围

| 内容 | 阅读入口 | 说明 |
| --- | --- | --- |
| 工厂协议与人审门禁 | [AGENTS.md](AGENTS.md) | 四阶段、两个人审门禁、六条红线 |
| 模块职责与共享内核 API | [架构说明](docs/ARCHITECTURE.md) | 状态/渲染/UI 分层、生命周期、接口返回值 |
| 自动化命令与排错 | [工具手册](docs/TOOLING.md) | 参数、输入输出、预算、错误处理 |
| 贡献与版本维护 | [CONTRIBUTING.md](CONTRIBUTING.md) | 本地验证、注释规范、标签与发布边界 |
| 初始验收证据 | [VALIDATION.md](VALIDATION.md) | v1.0.0 母体的实际运行记录 |

已实现：`@factory/game-core` 六个公共模块、`pixi-ts` 模板、五屏示例、Vitest/Playwright、建项/资产/审计/本地静态打包脚本。其他三条引擎路线目前只有决策规范；真实广告 SDK、远端上传、账号后端和生产运营由具体游戏接入。当前仓库尚未指定开源许可证；使用许可由维护者另行明确。

## 环境与安装

Node.js ≥22.13（推荐当前 LTS）、pnpm 11.25.0。当前模板使用 Vite 8、PixiJS 8、GSAP 3、TypeScript 5.9、Vitest 4、Playwright；精确解析版本锁定于 `pnpm-lock.yaml`。

首次获取仓库：

```text
git clone https://github.com/andyto1224-bit/codex-game-factory.git
cd codex-game-factory
```

以下命令均从克隆后的仓库根目录运行：

```text
pnpm install
pnpm run typecheck
pnpm run test
pnpm run test:tools
pnpm run build
```

所有维护脚本为 `.mjs`，使用 Node 文件 API 与无 Shell 子进程；包含本地 pnpm CLI 依赖，部署脚本不会在 Windows 上尝试执行 `.cmd`。

只预览母体示例时运行 `pnpm --filter @factory/template-pixi-ts run dev`，再打开终端显示的本地 URL。`dev` 是本机开发服务器，需要执行 `build` 和托管 `dist/` 才能供其他人在线访问。

## 开始项目

先读根 `AGENTS.md`，每次游戏会话执行一个阶段，尊重两个人审门禁。可在建项前将批准的设计放入 `apps/<slug>/_artifacts/`，脚手架会原样保留。除该工件目录之外有任何文件的现有项目均拒绝覆盖。

```text
node scripts/init-project.mjs --name star-demo --template pixi-ts --skills puzzle
pnpm install
node scripts/gen-placeholder-assets.mjs --app star-demo
pnpm --filter @factory/star-demo run dev
```

`--skills puzzle,roguelike` 可组合，仅选择适用类型。所有命令从仓库根运行。`pixi-matter` / `phaser4-ts` / `threejs-ts` 在路由矩阵中有选择依据，但母体仅交付已实现的 `pixi-ts`，脚手架会拒绝不存在的模板。

### 四阶段与交付物

| 阶段 | 输入/操作 | 主要输出与停止条件 |
| --- | --- | --- |
| Stage 1 · 策划与视觉 | GDD、Design Tokens、无字 FTUE、资产契约 | `01_GDD.md`、`02_ART_UI_SPEC.md`；等待 HUMAN GATE 1 |
| Stage 2 · 技术与建项 | 引擎决策、共享内核边界、脚手架 | `03_TECH_ARCH.md`、可启动项目 |
| Stage 3 · 逻辑与打磨 | 纯 TS 状态、测试、占位图、TestBridge | 白盒试玩等待 HUMAN GATE 2；确认后完成手感打磨 |
| Stage 4 · 验收与产物 | 类型、单测、E2E、体积审计、本地打包 | QA 工件、截图、可托管 `dist/` |

工件保存在 `apps/<slug>/_artifacts/`；进度写入 `STATUS.md`。每次游戏会话只执行一个阶段；门禁的人工批准必须真实记录。具体执行步骤以根协议和对应 `pipeline/` 手册为准。

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

`review.txt` 是可重新生成的本地审核包，已加入 `.gitignore`。依赖、构建产物和浏览器截图也不纳入 Git；公开仓库保留源代码、锁文件、协议和验收记录。`v1.0.0` 标签固定首次封板提交，后续说明和注释完善通过 `main` 上的新提交交付。

```text
packages/game-core/     单一共享内核与单元测试（直接导出 TS，无独立 build）
templates/pixi-ts/      可运行的引擎薄壳、五屏示例与测试
apps/                  由脚手架生成的游戏（审核工件留在项目内）
pipeline/              四阶段执行手册
skills/                foundation / polish / genres 分层规范
scripts/               建项、占位图、审计、静态打包、审核导出
docs/                  架构、公共 API 与命令排错说明
```
