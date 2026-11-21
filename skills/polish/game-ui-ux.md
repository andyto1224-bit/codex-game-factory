# 明亮休闲游戏 UI / UX

- DOM `#ui-root` 叠在 Canvas `#game-canvas` 上；根节点 `pointer-events: none`，按钮/面板局部 `pointer-events: auto`，空白区域让输入穿透到画布。
- 明亮 tokens 基线：背景 `#edf7ff`、面板 `#ffffff`、主色 `#4285f4`、强调 `#ffcc4d`、正文 `#203552`、次级 `#60748b`、圆角 20px；通过 CSS 变量管理，正文对比度需可读。
- 3D 按钮用底部 5px 阴影，按下位移并缩短阴影；触控目标至少 44px，键盘焦点清晰，GSAP 动画尊重 `prefers-reduced-motion`。
- 数字统一 `font-variant-numeric: tabular-nums`。顶栏 HUD 最多三组信息，避免密集图标；svg 图标集中封装并有 accessible label。
- 标准五屏状态机：Start → HUD → Pause / Revive → GameOver，可重开；暂停恢复保留上一局，Revive 只有成功回调才恢复；屏幕切换同步焦点和 ARIA 状态。
- 前 5 秒无字 FTUE：手势/光圈/目标呼吸动画 → 用户完成一次动作 → 即时正反馈 → 引导永久退出本局。禁止靠大段说明或文字遮挡第一步。
- 背景 cover 延展，不将重要目标放在裁切区；安全区内布局包含 `env(safe-area-inset-top/bottom/left/right)`，常用按钮避开浏览器手势区域。
- 正式资产替换只覆盖 manifest 指定相同路径的文件。锚点、尺寸、透明 padding 保持一致；不要从文件名推断玩法。

验收：320px 窄屏、横屏、200% 字体、键盘操作、减弱动画、无障碍命名；五屏没有 HUD 重叠、裁切或输入穿透误触。
