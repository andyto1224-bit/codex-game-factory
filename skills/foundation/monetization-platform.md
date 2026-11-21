# 平台与商业化

所有广告、埋点、多语言调用 `IPlatformAdapter`；默认 `MockPlatformAdapter` 明确模拟，不当成真实平台结算。

- 激励视频复活位：失败 → Revive；同一局最多一次（GDD 可细化）；点击后锁定按钮，await 结果，仅 `rewarded: true` 授予复活。取消、失败、超时均允许回到结算，不吞输入。请求期间暂停游戏。
- 插屏只在局间安全点，禁止首局首次输入和动作中途弹出。适配器冷却至少 90 秒，失败不重复轰炸；SDK 就绪与未成年人限制由平台实现处理。
- 生命周期事件：`game_start`（seed/level）、`game_pause`（reason）、`game_resume`、`game_over`（score/duration）、`revive_offer`、`revive_result`。每次转移发送一次；参数仅可序列化标量，不含用户隐私。适配器异常不能破坏游戏循环。
- i18n 由 `translate(key, params)` 统一获取，必须有 fallback；UI 不直接读 SDK locale。非支持语种回退，变量替换保留未知占位符。
- `VITE_PLATFORM` 仅标记目标，绝不是接入真实 SDK 的证明。gd/gm/poki 上线前实现对应适配器并验证平台生命周期、广告回调和暂停恢复。

验收：广告取消不复活；重复点击只产生一次请求；冷却可注入时钟测试；缺失翻译可读；Mock 不产生网络行为。
