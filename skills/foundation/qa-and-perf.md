# 测试与性能

## TestBridge 契约
仅在 `if (import.meta.env.DEV || import.meta.env.MODE === 'test')` 内安装 `window.__GAME_TEST__`；生产 `dist` 不得残留此字符串。
接口：`ready: true`、`getSnapshot()`（只读的序列化副本，至少 screen/score/seed）、`start(seed?)`、`pause()`、`resume()`。扩展命令须走正常业务入口，不暴露可写状态或引擎实例。卸载时移除全局。

## Playwright E2E
webServer 使用 Vite `--mode test`；等待 `ready` 或可见 UI，断言真实输入后的状态与界面一致；收集 pageerror、console error，禁止用 `waitForTimeout` 掩盖竞态。
截图至少 Start、HUD、Pause、Revive、GameOver，路径 `_artifacts/_screenshots/`；固定 viewport、seed、动画条件。验证子路径生产入口无 404、触控设备、窄屏和恢复。

## 单元/模拟标准
纯逻辑不启动浏览器。策略/随机类固定 1000 seeds 跑 1000 完整局；报告胜率、平均回合/局长、死局率、异常 seed，断言采用 GDD 允许范围。动作/物理类固定 dt，断言边缘接触、越界、零时间、暂停、事件次序；同一 seed+输入必须复现。严禁为了通过测试放宽目标区间。

## ObjectPool 与预算
建立清单：粒子、弹体、飘字、短生命周期特效；注明 prewarm、峰值、recycle 时机、reset 字段。回收必须撤销 Tween、监听和外部引用；双重回收不得产生同一对象被重复发放；clear 后禁止旧借出对象污染新池代。
默认 JS 原始总量 ≤1.5 MiB、dist 总量 ≤10 MiB；目标移动端 60fps，重负载最低帧率和内存阈值由 TECH_ARCH 指定。静态审计不能替代真机采样；记录设备、时长、P95 帧耗时、GC 峰值和场景退出前后对象数。
