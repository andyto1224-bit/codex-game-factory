# codex-game-factory 工厂总控协议

## 适用范围与 Monorepo 单一内核
本协议控制后续游戏项目生产；当前工厂母体初始化、模板自身的示例及自动验收已由建仓请求授权，不冒充已通过任何游戏的人审门禁。
共享内核唯一来源：`packages/game-core/`，包名 `@factory/game-core`。子项目必须通过 `workspace:*` 引用，严禁复制 EventBus、音频、存储、对象池、随机数、平台适配等底层模块。
所有自动化脚本使用纯 Node.js ESM `.mjs`，文件操作使用 `node:fs`，进程使用无 Shell 的 spawn；禁止平台专用 Shell 文件命令。

## 4 阶段（11 步）门禁流水线与上下文隔离
每次游戏会话只执行一个阶段。先读取项目工件中的进度、种子、验收记录，禁止凭聊天记忆跨阶段。阶段结束写回 `_artifacts/STATUS.md`，记录阶段、子步骤、输入版本、运行命令、结果与待确认项。下一阶段须另开会话。

### Stage 1：策划与视觉契约（Step 01–03）
读取 `pipeline/01-03_design_spec.md`、`skills/polish/game-design-theory.md`、`skills/polish/game-ui-ux.md`。
01 定义用户、单局循环与胜负；02 制定美术/UI 和资产契约；03 验证并交付 `_artifacts/01_GDD.md`、`_artifacts/02_ART_UI_SPEC.md`。
必须包含明亮风 Design Tokens、背景延展层/安全区分离、前 5 秒无字 FTUE 引导、资产替换契约。
**[HUMAN GATE 1] STOP 等待人工确认**。记录确认者和时间，禁止自行推定批准。建项前工件可暂存 `apps/<slug>/_artifacts/`；脚手架保留已有工件。

### Stage 2：技术路由与建项（Step 04–06）
读取 `pipeline/04-06_tech_routing.md` 和已批准的 Stage 1 工件。
04 根据矩阵选引擎；05 产出 `_artifacts/03_TECH_ARCH.md`；06 执行 `node scripts/init-project.mjs --name <slug> --template pixi-ts --skills <genres>`，安装依赖并验证基础运行。
母体只附带 `pixi-ts` 模板；其他路线必须先实现并验证对应薄壳，不得谎称已支持。

### Stage 3：逻辑、白盒与手感打磨（Step 07–08）
读取 `pipeline/07-08_dev_and_juice.md`。
Step 3a / 07：编写 `src/gameplay/state/` 纯 TS 逻辑和 Vitest 测试；策略/随机类使用固定种子跑 1000 局 Monte Carlo，动作/物理类运行确定性边界断言，输出指标与失败种子。
Step 3b / 08a：运行 `node scripts/gen-placeholder-assets.mjs --app <slug>`，跑通白盒，接入 TestBridge。
**[HUMAN GATE 2] STOP 等待人工白盒试玩**。只有确认后才能继续；下一次会话仍属于 Stage 3，先读取确认和白盒状态，不进入 Stage 4。
Step 3c / 08b：按 `skills/polish/game-feel.md` 与 `skills/polish/game-ui-ux.md` 完成动效、音效、UI 打磨，核查资产可替换。

### Stage 4：验收、审计与发布（Step 09–11）
读取 `pipeline/09-11_qa_perf_deploy.md` 和前序全部工件。
09 执行 `pnpm run typecheck`、`pnpm run test`、项目 Playwright E2E 及关键帧截图；10 执行 `node scripts/audit-perf.mjs --app <slug>`；11 执行 `node scripts/deploy-static.mjs --app <slug> --platform <mock|web|gd|gm|poki>`，对最终产物再审计并登记发布清单。
部署脚本只打包本地静态产物，不自动上传外部平台。真实 SDK、账户、平台审核须在项目架构中明确。

## 6 条不可违背红线
1. `src/gameplay/state/` 严禁导入 PixiJS/Phaser/Three.js 或 DOM API；也不得间接依赖表现层、浏览器存储和音频。
2. TypeScript 必须 `strict: true`，禁止 `any` 和 `@ts-ignore`。
3. 资源 URL 严禁以 `/` 开头，所有 `vite.config.ts` 强制 `base: './'`；资源清单相对于页面加载。
4. 广告、埋点、多语言必须通过 `PlatformAdapter` 调用，业务不得直接访问平台 SDK。
5. `window.__GAME_TEST__` 必须包裹在 `if (import.meta.env.DEV || import.meta.env.MODE === 'test')` 中，生产构建自动 Tree-shake 剔除；不得用全局调试开关重新打开。
6. 替换 `public/assets/` 正式美术图时必须零代码修改生效；保持清单中的路径、尺寸、锚点、透明边界和命名，不把占位图绘制硬编码为正式资源。

## 优先级覆盖链
`apps/<slug>/_artifacts/*.md` > `skills/genres/*.md` > `skills/foundation/*.md` > 根目录 `AGENTS.md`。
此链用于项目细化和设计决策；不得借局部说明绕过以上六条红线或未批准的人审门禁。polish 规范作为视觉/手感基线，由项目视觉契约细化。

## 完成标准
不以“已写文件”代替运行验证。记录真实命令与结果；失败明确说明，禁止伪造截图、性能数字或人工批准。所有工具在仓库根运行，使用 `--app <slug>` 定位项目；先读各项目局部 AGENTS。
