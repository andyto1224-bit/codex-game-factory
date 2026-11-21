# Stage 1 · Step 01–03：策划与视觉契约

输入：用户玩法目标、目标设备/横竖屏、`skills/polish/game-design-theory.md`、`skills/polish/game-ui-ux.md`。

执行：
1. Step 01 写一句话核心体验，确定 3–5 分钟循环、胜负、首局难度及可测数值。
2. Step 02 定义背景延展层和安全区，列明亮风 tokens、五屏布局、前 5 秒无字 FTUE 与资产清单。
3. Step 03 逐项对照下列模板，提出待确认决策，登记 STATUS，停止等待人工批准。

输出 `apps/<slug>/_artifacts/01_GDD.md` 模板：
```md
# GDD
版本 / 日期 / 目标用户 / 平台：
一句话玩法 / 输入 / 胜利 / 失败：
核心循环（3–5 分钟）：
前 5 秒无字引导（触发、手势、反馈、退出条件）：
难度函数 / 正负反馈 / 防死局：
激励视频复活位 / 插屏时机和冷却：
数值验收（目标胜率、局长、种子集合）：
待确认项 / HUMAN GATE 1 确认记录：
```
输出 `_artifacts/02_ART_UI_SPEC.md` 模板：
```md
# ART / UI SPEC
明亮 Design Tokens（背景、面板、主色、强调、文字、圆角、阴影）：
设计尺寸 / 安全区 / 背景延展策略：
Start / HUD / Pause / Revive / GameOver 布局：
HUD 信息（最多三组）/ 无字 FTUE：
资产表（id、相对 path、width、height、anchor、透明边界、用途）：
替换契约（保持路径和尺寸，覆盖 public/assets 后零代码修改）：
音效 / 动效 / reduced-motion：
```
**[HUMAN GATE 1] STOP 等待人工确认**，不建玩法、不跨到 Stage 2。
