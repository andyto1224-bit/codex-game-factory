export type AnalyticsValue = string | number | boolean | null;
export interface RewardResult { rewarded: boolean; reason: 'completed' | 'cancelled' | 'unavailable' }
/** 所有广告、生命周期埋点和多语言的统一入口；真实 SDK 由具体项目实现。 */
export interface IPlatformAdapter {
  readonly platform: string;
  /** placement 标记广告位；业务仅在结果 rewarded=true 时发放复活/奖励。 */
  showRewardedAd(placement: string): Promise<RewardResult>;
  /** 返回是否展示；冷却、失败和 SDK 生命周期由平台实现管理。 */
  showInterstitial(placement: string): Promise<boolean>;
  /** 参数仅接受可序列化标量；调用方不写用户隐私、凭据或原始存档。 */
  track(event: string, data?: Readonly<Record<string, AnalyticsValue>>): void;
  /** 按 key 查文本，并替换 params 中的命名变量。 */
  translate(key: string, params?: Readonly<Record<string, string | number>>): string;
}
export interface MockPlatformOptions {
  platform?: string;
  rewarded?: boolean;
  interstitialCooldownMs?: number;
  now?: () => number;
  dictionary?: Readonly<Record<string, string>>;
}

/** 本地模拟器，无广告或埋点网络请求；platform 名字不代表真实 SDK 已接入。 */
export class MockPlatformAdapter implements IPlatformAdapter {
  readonly platform: string;
  readonly events: { event: string; data: Readonly<Record<string, AnalyticsValue>> }[] = [];
  private lastInterstitial = -Infinity;
  private readonly now: () => number;

  constructor(private readonly options: MockPlatformOptions = {}) {
    this.platform = options.platform ?? 'mock';
    this.now = options.now ?? Date.now;
  }

  /** 默认立即模拟成功；rewarded=false 模拟用户取消，不发放奖励。 */
  async showRewardedAd(_placement: string): Promise<RewardResult> {
    const rewarded = this.options.rewarded ?? true;
    return { rewarded, reason: rewarded ? 'completed' : 'cancelled' };
  }

  /** 使用可注入时钟模拟插屏冷却，默认 90 秒；不会弹出真实广告。 */
  async showInterstitial(_placement: string): Promise<boolean> {
    const now = this.now();
    if (now - this.lastInterstitial < (this.options.interstitialCooldownMs ?? 90_000)) return false;
    this.lastInterstitial = now;
    return true;
  }

  /** 只记录内存事件副本，保留最近 1000 条，便于白盒检查。 */
  track(event: string, data: Readonly<Record<string, AnalyticsValue>> = {}): void {
    this.events.push({ event, data: { ...data } });
    if (this.events.length > 1000) this.events.shift();
  }

  /** 缺失翻译时返回 key；已知变量插值，未知占位符原样保留。 */
  translate(key: string, params: Readonly<Record<string, string | number>> = {}): string {
    return (this.options.dictionary?.[key] ?? key).replace(/\{(\w+)\}/g, (token: string, name: string) => String(params[name] ?? token));
  }
}
