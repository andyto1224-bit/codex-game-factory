export type AnalyticsValue = string | number | boolean | null;
export interface RewardResult { rewarded: boolean; reason: 'completed' | 'cancelled' | 'unavailable' }
export interface IPlatformAdapter {
  readonly platform: string;
  showRewardedAd(placement: string): Promise<RewardResult>;
  showInterstitial(placement: string): Promise<boolean>;
  track(event: string, data?: Readonly<Record<string, AnalyticsValue>>): void;
  translate(key: string, params?: Readonly<Record<string, string | number>>): string;
}
export interface MockPlatformOptions {
  platform?: string;
  rewarded?: boolean;
  interstitialCooldownMs?: number;
  now?: () => number;
  dictionary?: Readonly<Record<string, string>>;
}

/** Local stand-in. A platform name does not constitute a real SDK integration. */
export class MockPlatformAdapter implements IPlatformAdapter {
  readonly platform: string;
  readonly events: { event: string; data: Readonly<Record<string, AnalyticsValue>> }[] = [];
  private lastInterstitial = -Infinity;
  private readonly now: () => number;

  constructor(private readonly options: MockPlatformOptions = {}) {
    this.platform = options.platform ?? 'mock';
    this.now = options.now ?? Date.now;
  }

  async showRewardedAd(_placement: string): Promise<RewardResult> {
    const rewarded = this.options.rewarded ?? true;
    return { rewarded, reason: rewarded ? 'completed' : 'cancelled' };
  }

  async showInterstitial(_placement: string): Promise<boolean> {
    const now = this.now();
    if (now - this.lastInterstitial < (this.options.interstitialCooldownMs ?? 90_000)) return false;
    this.lastInterstitial = now;
    return true;
  }

  track(event: string, data: Readonly<Record<string, AnalyticsValue>> = {}): void {
    this.events.push({ event, data: { ...data } });
    if (this.events.length > 1000) this.events.shift();
  }

  translate(key: string, params: Readonly<Record<string, string | number>> = {}): string {
    return (this.options.dictionary?.[key] ?? key).replace(/\{(\w+)\}/g, (token: string, name: string) => String(params[name] ?? token));
  }
}
