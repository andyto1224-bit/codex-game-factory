# Stage 3 · Step 07–08：逻辑、白盒与手感

输入：已批准设计、TECH_ARCH、项目 AGENTS、genres 规范。

1. Step 3a / 07：仅在 `src/gameplay/state/` 写可序列化纯 TS 状态机；注入种子和时间，禁止引擎/DOM。Vitest 覆盖合法/非法转移、边界和资源守恒。策略/随机类固定 1000 seeds 跑 1000 完整局并输出胜率、局长、死局率和失败 seed；断言使用 GDD 给出的区间。动作/物理类按固定步长测越界、穿透、暂停恢复、同帧事件次序。
2. Step 3b / 08a：编辑项目 `assets.manifest.json`，执行 `node scripts/gen-placeholder-assets.mjs --app <slug>`。接入 SceneManager、GameApp、PlatformAdapter、TestBridge。白盒必须能开始、暂停、复活、结束和重开，TestBridge 快照不可直接修改内部状态。输出 `04_WHITEBOX.md` 与截图。
3. **[HUMAN GATE 2] STOP 等待人工白盒试玩**。登记确认者、时间、反馈。未确认不得打磨或继续下阶段；确认后的会话仍只执行 Stage 3 剩余步骤。
4. Step 3c / 08b：读取 `skills/polish/game-feel.md` 和 `game-ui-ux.md`，实现按压、粒子、Combo、轻震屏、音调反馈和可访问 UI。替换同路径资产验证零代码变化。输出 `05_POLISH.md`。

工件模板：
```md
# WHITEBOX / POLISH
版本、seed、测试命令与统计：
输入 → 状态 → 表现事件映射：
开始/暂停/复活/结算/重开结果：
TestBridge 契约与截图路径：
HUMAN GATE 2 确认记录 / 待解决问题：
动效、音效、输入锁、reduced-motion 验收：
正式资源替换验证：
```
退出前销毁监听、Ticker、Tween、AudioNode、贴图引用；不得出现重复输入或后台计时。
