import type { GameSnapshot } from '../gameplay/state/GameSession';

export interface GameTestBridge {
  readonly ready: true;
  getSnapshot(): Readonly<GameSnapshot>;
  start(seed?: number): void;
  pause(): void;
  resume(): void;
}
declare global { interface Window { __GAME_TEST__?: GameTestBridge } }

export function installTestBridge(bridge: GameTestBridge): () => void {
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    window.__GAME_TEST__ = Object.freeze(bridge);
    return () => { delete window.__GAME_TEST__; };
  }
  return () => {};
}
