export type Screen = 'start' | 'hud' | 'pause' | 'revive' | 'gameover';
export interface GameSnapshot { screen: Screen; score: number; seed: number; revived: boolean }

/** 确定性动作示例：只处理五屏与分数，不依赖引擎、DOM、时钟和其他副作用。 */
export class GameSession {
  private state: GameSnapshot = { screen: 'start', score: 0, seed: 1, revived: false };

  /** 返回值独立于内部对象；UI 和 TestBridge 只能读取快照，不能直接改状态。 */
  snapshot(): Readonly<GameSnapshot> { return { ...this.state }; }

  start(seed = 1): void {
    if (!Number.isFinite(seed)) throw new RangeError('Seed must be finite');
    this.state = { screen: 'hud', score: 0, seed: seed >>> 0, revived: false };
  }
  /** 只有 HUD 接受点击；首次 10 分给复活机会，复活后 20 分直接结算。 */
  tap(): boolean {
    if (this.state.screen !== 'hud') return false;
    this.state.score += 1;
    if (this.state.score >= (this.state.revived ? 20 : 10)) this.state.screen = this.state.revived ? 'gameover' : 'revive';
    return true;
  }
  pause(): void { if (this.state.screen === 'hud') this.state.screen = 'pause'; }
  resume(): void { if (this.state.screen === 'pause') this.state.screen = 'hud'; }
  /** rewarded 必须来自适配器的实际结果；取消或失败统一进入结算。 */
  revive(rewarded: boolean): void {
    if (this.state.screen !== 'revive') return;
    this.state.revived = rewarded;
    this.state.screen = rewarded ? 'hud' : 'gameover';
  }
}
