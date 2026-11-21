import type { GameSnapshot } from '../gameplay/state/GameSession';

/** 测试只读快照和正常业务命令，不暴露可写状态或引擎实例。 */
export interface GameTestBridge {
  readonly ready: true;
  getSnapshot(): Readonly<GameSnapshot>;
  start(seed?: number): void;
  pause(): void;
  resume(): void;
}
declare global { interface Window { __GAME_TEST__?: GameTestBridge } }

/** 仅 dev/test 挂载，返回卸载函数；生产常量折叠后整段调试入口必须剔除。 */
export function installTestBridge(bridge: GameTestBridge): () => void {
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    window.__GAME_TEST__ = Object.freeze(bridge);
    return () => { delete window.__GAME_TEST__; };
  }
  return () => {};
}
