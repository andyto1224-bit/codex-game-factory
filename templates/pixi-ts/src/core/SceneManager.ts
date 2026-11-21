import type { Container } from 'pixi.js';

export interface Viewport {
  width: number; height: number; dpr: number;
  safe: { x: number; y: number; width: number; height: number; scale: number };
}
export interface SceneContext { world: Container; background: Container; viewport: Viewport }
export interface Scene {
  enter(context: SceneContext): void | Promise<void>;
  update(deltaSeconds: number): void;
  resize(viewport: Viewport): void;
  exit(): void | Promise<void>;
}

export class SceneManager {
  private current: Scene | undefined;
  private queue: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(private readonly context: SceneContext) {}

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
  async destroy(): Promise<void> {
    this.disposed = true;
    await this.queue;
    const scene = this.current;
    this.current = undefined;
    await scene?.exit();
  }
}
