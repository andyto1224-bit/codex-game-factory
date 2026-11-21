# Stage 2 · Step 04–06：技术路由与建项

输入：已批准的 `01_GDD.md`、`02_ART_UI_SPEC.md`、对应 genres/foundation 规范。

| 路线 | 选择条件 | 约束 | 母体状态 |
| --- | --- | --- | --- |
| pixi-ts | 2D 休闲、消除、卡牌、轻动作 | PixiJS v8 渲染，纯 TS 状态 | 已实现薄壳 |
| pixi-matter | 2D 刚体、碰撞、堆叠 | Pixi + Matter；固定步长、可回放输入 | 需先实现/验收薄壳 |
| phaser4-ts | 大量场景、精灵动画、2D 地图 | 核对当前 Phaser 4 API；状态隔离 | 需先实现/验收薄壳 |
| threejs-ts | 真 3D 场景/相机/模型 | Three.js；限制 draw calls/贴图预算 | 需先实现/验收薄壳 |

执行：
1. Step 04 按需求而非偏好选引擎，记录排除其他路线的理由与资源预算。
2. Step 05 写 `apps/<slug>/_artifacts/03_TECH_ARCH.md`；Stage 1 可已在该目录存放工件，脚手架允许仅有 `_artifacts` 的目录。
3. Step 06 在根目录执行 `node scripts/init-project.mjs --name <slug> --template pixi-ts --skills puzzle,roguelike`。只选择实际适用的 skills。运行 `pnpm install`、`pnpm --filter @factory/<slug> run typecheck`；生成局部 AGENTS 指向根 skills，绝不复制内核。

输出模板：
```md
# TECH ARCH
引擎路线 / 依据 / 依赖版本：
state（纯逻辑）/ scene（表现）/ UI（DOM）边界：
事件、输入队列、时钟和 RNG seed：
PlatformAdapter（广告/埋点/i18n）/ Storage 版本：
资产 manifest / 锚点 / 背景和安全区：
TestBridge 只读快照与控制接口：
性能预算（JS 原始字节、总资源字节、对象池、目标帧率）：
测试矩阵 / 安装和启动命令 / 风险：
```
阶段结束记录 STATUS，另开 Stage 3 会话。
