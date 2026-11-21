/** frequency 单位为 Hz，duration 为秒，volume 播放时限制到有效增益范围。 */
export interface ToneOptions { frequency?: number; duration?: number; volume?: number }

/** 延迟创建 WebAudio；首次手势解锁，在无 document 的 SSR/Node 环境也可构造。 */
export class AudioManager {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private readonly tones = new Set<OscillatorNode>();
  private muted = false;
  private hidden = false;
  private destroyed = false;
  private readonly target: Document | undefined;

  constructor(target?: Document) {
    this.target = target ?? (typeof document === 'undefined' ? undefined : document);
    this.hidden = this.target?.hidden ?? false;
    this.target?.addEventListener('pointerdown', this.onUnlock);
    this.target?.addEventListener('touchstart', this.onUnlock, { passive: true });
    this.target?.addEventListener('visibilitychange', this.onVisibility);
  }

  get isMuted(): boolean { return this.muted; }

  /** 请求创建/恢复上下文；成功后撤掉手势监听，不支持或被拒绝时返回 false。 */
  async unlock(): Promise<boolean> {
    if (this.destroyed || typeof AudioContext === 'undefined') return false;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.connect(this.context.destination);
        this.updateGain();
      }
      await this.context.resume();
      if (this.destroyed) return false;
      const running = this.context.state === 'running';
      if (running) this.detachUnlock();
      return running;
    } catch { return false; }
  }

  /** 设置用户静音偏好；前后台切换只改变实际增益，不覆盖该偏好。 */
  setMuted(value: boolean): void {
    this.muted = value;
    this.updateGain();
  }

  /** 播放轻量反馈音；未解锁、后台、静音、参数非法或并发达到 16 时返回 false。 */
  playTone({ frequency = 440, duration = 0.12, volume = 0.12 }: ToneOptions = {}): boolean {
    const context = this.context;
    if (!context || !this.master || context.state !== 'running' || this.muted || this.hidden || this.destroyed) return false;
    if (!Number.isFinite(frequency) || frequency <= 0 || !Number.isFinite(duration) || duration <= 0 || !Number.isFinite(volume) || this.tones.size >= 16) return false;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.frequency.value = Math.min(frequency, context.sampleRate / 2);
    gain.gain.setValueAtTime(Math.max(0.0001, Math.min(volume, 1)), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.tones.add(oscillator);
    oscillator.onended = () => {
      this.tones.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration);
    return true;
  }

  /** 停止音调、撤销监听并关闭上下文；销毁后的实例不可再次解锁。 */
  async destroy(): Promise<void> {
    this.destroyed = true;
    this.detachUnlock();
    this.target?.removeEventListener('visibilitychange', this.onVisibility);
    for (const oscillator of this.tones) {
      oscillator.onended = null;
      oscillator.stop();
      oscillator.disconnect();
    }
    this.tones.clear();
    this.master?.disconnect();
    try { await this.context?.close(); } catch { /* 上下文已关闭或平台不支持时仍完成本地释放。 */ }
    this.context = undefined;
    this.master = undefined;
  }

  private readonly onUnlock = (): void => { void this.unlock(); };
  private readonly onVisibility = (): void => {
    this.hidden = this.target?.hidden ?? false;
    this.updateGain();
  };
  private detachUnlock(): void {
    this.target?.removeEventListener('pointerdown', this.onUnlock);
    this.target?.removeEventListener('touchstart', this.onUnlock);
  }
  private updateGain(): void {
    if (this.context && this.master) {
      this.master.gain.setValueAtTime(this.muted || this.hidden ? 0 : 1, this.context.currentTime);
    }
  }
}
