# 架构与共享内核说明

官方网站：[ROSGames](https://www.rosgames.com/) · [返回 README](../README.md)

## 目录与依赖方向

`apps/<slug>` 与 `templates/pixi-ts` 都通过 `@factory/game-core: workspace:*` 使用 `packages/game-core/src/index.ts`；内核直接导出 TS，由使用方的 Vite/TypeScript 处理，不需要单独 build。

| 层 | 所在目录 | 职责与边界 |
| --- | --- | --- |
| 纯逻辑 | `src/gameplay/state/` | 输入命令、确定性状态机、可序列化快照；不引用 DOM、引擎、存储或音频 |
| 场景表现 | `src/gameplay/`、`src/core/` | Pixi 显示对象、资源加载、帧更新、尺寸适配、场景进出 |
| DOM UI | `src/ui/`、`src/main.ts` | 五屏界面、按钮、输入分发、视觉反馈；状态判断调用逻辑层 |
| 平台服务 | `@factory/game-core` | 事件、音频、存储、对象池、RNG、广告/埋点/i18n 接口 |

示例数据流：用户点击 → `GameSession.tap()` → 新快照 → DOM HUD 更新与 Pixi/音效反馈。广告结果通过 `IPlatformAdapter` 返回，只有 `rewarded: true` 才调用业务复活。TestBridge 复用这些正常命令入口，不提供可写内部对象。

## 共享内核 API

### EventBus

`new EventBus<{ score: number }>()` 用泛型约束事件名与负载。

| 方法 | 契约 |
| --- | --- |
| `on(event, listener)` | 订阅并返回取消函数；相同函数对象不会重复登记 |
| `off(event, listener)` | 移除指定监听，不存在时无副作用 |
| `once(event, listener)` | 返回取消函数；回调前解除订阅，并防止重入重复执行 |
| `emit(event, payload)` | 同步按本轮监听快照派发；本轮新订阅从下次生效；回调异常向上传播 |
| `clear(event?)` | 清空一种或全部事件；已经取得的本轮派发快照仍会继续 |

场景保存订阅返回的取消函数，在 `exit()` 调用；不要每帧重新订阅。

### AudioManager

构造后监听首次 `pointerdown/touchstart`，成功解锁后移除解锁监听。音频上下文按需创建，在无 DOM 的 Node 环境可安全构造。

| 方法/属性 | 契约 |
| --- | --- |
| `unlock(): Promise<boolean>` | 请求恢复 AudioContext；不支持、被拒绝或已销毁时返回 false |
| `setMuted(boolean)` / `isMuted` | 控制并读取用户静音偏好；不会被前后台切换覆盖 |
| `playTone({ frequency, duration, volume })` | frequency 为 Hz、duration 为秒；返回是否实际播放，最大并发 16 路 |
| `destroy()` | 移除监听、停止当前音调、关闭上下文；此实例之后不可重用 |

后台将主增益设为 0；返回前台后仍尊重用户静音。音频不可用时业务继续运行。

### StorageManager

```ts
import { StorageManager } from '@factory/game-core';

const storage = new StorageManager({ namespace: 'star-demo', version: 1 });
const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
storage.set('best-score', 12);
const bestScore = storage.get('best-score', 0, isScore);
```

存储键为 `namespace:key`，JSON 信封为 `{ version, data }`。`get` 必须提供类型守卫；损坏 JSON、未来版本、缺少迁移或校验失败均返回给定默认值。`migrations[2]` 表示从版本 1 迁到 2，逐版本执行，成功后回写。

不传 backend 时尝试 localStorage；传 `null` 时只使用内存。当前实例优先读取内存回退值。`set` 无法序列化时返回 false；localStorage 配额/权限异常时仍在当前实例内可用，但不保证刷新后保留。`remove` 保留删除标记，避免后端删除失败后读到旧值。迁移与类型守卫应为同步纯函数。

### ObjectPool

`new ObjectPool(create, reset?, dispose?)` 要求 create 每次创建独立对象，reset 清理借用期间的业务字段、Tween 和监听，dispose 释放底层资源。

`prewarm(n)` 保证可借用区至少有 n 个对象；`obtain()` 借出；`recycle(value)` 重置并回收。未知、重复回收或上次 clear 前借出的对象会被忽略。`size` 为可借用数，`activeCount` 为借出数。

`clear()` 清空池并对当时所有对象调用 dispose，包括尚未归还的对象；调用方应先停止使用这些对象。reset/dispose 应自行保证异常安全；回调错误会向上传播。

### SeededRNG

Mulberry32 以无符号 32 位种子初始化。相同 seed 加相同调用顺序产生相同序列；它用于玩法复现，不用于密码、令牌或安全用途。

- `next()`：返回 `[0, 1)`。
- `range(min, max)`：连续数值区间 `[min, max)`；整数可再 `Math.floor`。端点相等时返回端点，同时推进 RNG。
- `pick(items)`：返回一项，空数组抛 RangeError。
- `shuffle(items)`：Fisher-Yates 洗牌，返回副本，保留原数组。

复现要保存种子和输入/随机调用次序；当前类没有导出/导入内部 RNG 状态的 API。

### PlatformAdapter

`IPlatformAdapter` 是广告、埋点和翻译的统一边界。`showRewardedAd` 返回 rewarded 和 reason；`showInterstitial` 返回是否展示；`track` 接收标量参数；`translate` 接收 key 和替换变量。

默认 `MockPlatformAdapter` 无网络行为：激励默认成功，可配置为取消；插屏默认冷却 90 秒，可注入时钟；埋点只保存在内存，最多 1000 条；翻译缺失时返回 key，未知占位符保留。

`VITE_PLATFORM=gd/gm/poki` 只改变目标标记，不会自动变成对应真实 SDK。接平台时实现新适配器并在启动入口装配，保持 state 不依赖 SDK；在具体实现中补齐错误、超时、暂停恢复和平台审核要求。

## 模板生命周期

`GameApp.init()` 异步初始化 Pixi v8。DPR 上限为 2；背景容器 cover 延展，world 按 360×640 设计坐标等比缩放到安全区。尺寸从外层 shell 测量，避免 Pixi autoDensity 的内联 canvas 尺寸反向影响布局。CSS 的 `env(safe-area-inset-*)` 与安全区计算配合。

场景遵守 `enter → resize → update → exit`。`SceneManager.change()` 串行切换，上一场景退出完成后才进入下一场景；进入失败尝试 exit 清理。销毁过程中未完成的 enter 不会被激活。场景显示对象归场景清理，共享 Assets 缓存贴图不随单个 Sprite 销毁。

GameApp 每帧传入的 dt 最大 0.05 秒；这不是物理固定步长求解器。物理项目需在独立逻辑层增加固定步长与输入重放。后台触发暂停，回到前台由用户显式继续，不追赶后台时间。

## 测试与发布边界

TestBridge 只在 `DEV || MODE === 'test'` 的条件分支中挂载。`getSnapshot()` 返回独立快照；生产构建审计要求无调试字符串，生产浏览器检查进一步确认全局接口不存在。

Vitest 覆盖内核、状态边界和场景生命周期；Playwright 覆盖桌面/移动五屏、真实输入和窄屏。`test:production` 用真实 dist 在子路径检查资源与调试接口。审计只测静态规则和文件字节，不提供真实设备的帧率、GPU 或内存保证。

正式游戏须另行完成 GDD 指标、两个人审门禁、随机玩法 1000 局完整模拟或动作边界测试、真机性能及目标平台验收。
