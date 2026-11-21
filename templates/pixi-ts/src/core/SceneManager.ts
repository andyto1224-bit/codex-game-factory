import type { Container } from 'pixi.js';

/** width/height 为 CSS 像素；safe 为设计坐标区及其在视口中的位移、缩放。 */
export interface Viewport {
  width: number; height: number; dpr: number;
  safe: { x: number; y: number; width: number; height: number; scale: number };
}
export interface SceneContext { world: Container; background: Container; viewport: Viewport }
/** exit 必须清理本场景监听、Tween 和显示对象；共享缓存贴图由资源所有者管理。 */
export interface Scene {
  enter(context: SceneContext): void | Promise<void>;
  update(deltaSeconds: number): void;
  resize(viewport: Viewport): void;
  exit(): void | Promise<void>;
}

/** 串行化异步场景切换，避免前一 enter/exit 未完成就激活下一场景。 */
export class SceneManager {
  private current: Scene | undefined;
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(private readonly context: SceneContext) {}

  /** 返回本次切换结果；失败会尝试 exit，内部队列恢复后仍可处理下一次切换。 */
  change(scene: Scene): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('SceneManager is disposed'));
    const transition = this.queue.then(async () => {
      if (this.disposed) return;
      const previous = this.current;
      this.current = undefined;
      await previous?.exit();
      if (this.disposed) return;
      try {
        await scene.enter(this.context);
        if (!this.disposed) scene.resize(this.context.viewport);
      } catch (error) {
        try { await scene.exit(); }
        catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Scene enter/resize and cleanup failed'); }
        throw error;
      }
      if (this.disposed) await scene.exit();
      else this.current = scene;
    });
    this.queue = transition.catch(() => {});
    return transition;
  }
  update(deltaSeconds: number): void { this.current?.update(deltaSeconds); }
  resize(viewport: Viewport): void {
    this.context.viewport = viewport;
    this.current?.resize(viewport);
  }
  /** 拒绝新切换，等待在途 enter 清理，再退出当前场景。 */
  async destroy(): Promise<void> {
    this.disposed = true;
    await this.queue;
    const scene = this.current;
    this.current = undefined;
    await scene?.exit();
  }
}
