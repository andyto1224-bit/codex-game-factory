# Web 游戏架构

- Vite 强制 `base: './'`；所有资源使用 `assets/...` 相对 URL，禁止 `/assets/...`，嵌套部署与平台 iframe 同样适用。
- 业务分 state（纯 TS）、scene（引擎）、ui（DOM）、platform（适配器）。state 不引用渲染、DOM、浏览器存储、音频或副作用；通过命令改变状态并产出表现事件。
- GameApp 管理单一画布、DPR（建议上限 2）、resize 与 `visibilitychange`；切后台停止模拟和渲染，回来不追赶后台时间，不覆盖用户主动暂停。
- 场景统一 `enter/update/resize/exit`。enter 只绑定一次；exit 释放事件订阅、Ticker、Tween、粒子、物理体、临时 AudioNode，移除显示对象。共享贴图归资源缓存所有，场景不可错误销毁下一场景复用的纹理。
- 异步加载失败显示可重试状态；切场景串行化，旧 enter 未完成不得泄漏；应用销毁时撤销监听与音频解锁监听。
- 设计坐标映射到可视安全区；背景单独 cover 延展；刘海/底部手势区由 CSS `env(safe-area-inset-*)` 与运行时 insets 共同处理。
- 持久化只通过 `StorageManager`；随机只通过可注入 `SeededRNG`；通讯通过泛型 EventBus；禁止复制共享内核。

验收：子路径加载、横竖屏切换、三次场景进出、后台停留 10 秒后状态不突跳、销毁后无持续输入/音频。
