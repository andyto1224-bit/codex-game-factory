export type Screen = 'start' | 'hud' | 'pause' | 'revive' | 'gameover';
export interface GameSnapshot { screen: Screen; score: number; seed: number; revived: boolean }

/** Minimal deterministic action example; no engine, DOM, timers or side effects. */
export class GameSession {
  private state: GameSnapshot = { screen: 'start', score: 0, seed: 1, revived: false };

  snapshot(): Readonly<GameSnapshot> { return { ...this.state }; }

  start(seed = 1): void {
    if (!Number.isFinite(seed)) throw new RangeError('Seed must be finite');
    this.state = { screen: 'hud', score: 0, seed: seed >>> 0, revived: false };
  }
  tap(): boolean {
    if (this.state.screen !== 'hud') return false;
    this.state.score += 1;
    if (this.state.score >= (this.state.revived ? 20 : 10)) this.state.screen = this.state.revived ? 'gameover' : 'revive';
    return true;
  }
  pause(): void { if (this.state.screen === 'hud') this.state.screen = 'pause'; }
  resume(): void { if (this.state.screen === 'pause') this.state.screen = 'hud'; }
  revive(rewarded: boolean): void {
    if (this.state.screen !== 'revive') return;
    this.state.revived = rewarded;
    this.state.screen = rewarded ? 'hud' : 'gameover';
  }
}
