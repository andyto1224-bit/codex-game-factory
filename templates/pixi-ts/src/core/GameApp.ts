import { Application, Container } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import { SceneManager } from './SceneManager';
import type { Viewport } from './SceneManager';

export class GameApp {
  readonly pixi = new Application();
  readonly world = new Container();
  readonly background = new Container();
  readonly scenes: SceneManager;
  private initialized = false;
  private destroyed = false;
  private paused = false;
  private hidden = document.hidden;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly onHidden: () => void) {
    this.scenes = new SceneManager({ world: this.world, background: this.background, viewport: this.measure() });
  }

  async init(): Promise<void> {
    await this.pixi.init({
      canvas: this.canvas, antialias: true, autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      backgroundColor: '#edf7ff', preference: 'webgl', autoStart: false,
    });
    this.initialized = true;
    if (this.destroyed) { this.pixi.destroy(false, { children: true }); return; }
    this.pixi.stage.addChild(this.background, this.world);
    this.pixi.ticker.add(this.tick);
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.visibility);
    this.resize();
    this.syncTicker();
  }

  setPaused(paused: boolean): void { this.paused = paused; this.syncTicker(); }
  private readonly tick = (ticker: Ticker): void => { this.scenes.update(Math.min(ticker.deltaMS / 1000, 0.05)); };
  private readonly visibility = (): void => {
    this.hidden = document.hidden;
    if (this.hidden) this.onHidden(); // Explicit resume through UI; never override a user pause.
    this.syncTicker();
  };
  private syncTicker(): void {
    if (!this.initialized || this.destroyed) return;
    if (this.paused || this.hidden) this.pixi.stop();
    else this.pixi.start();
    this.pixi.render();
  }
  private measure(): Viewport {
    // Pixi autoDensity writes inline canvas dimensions during init/resize.
    // Measure the containing shell so those dimensions cannot feed back into layout.
    const { width, height } = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect();
    const style = getComputedStyle(document.documentElement);
    const inset = (side: string): number => Math.max(0, parseFloat(style.getPropertyValue(`--safe-${side}`)) || 0);
    const left = inset('left'); const right = inset('right');
    const top = inset('top'); const bottom = inset('bottom');
    const usableWidth = Math.max(1, width - left - right);
    const usableHeight = Math.max(1, height - top - bottom);
    const scale = Math.min(usableWidth / 360, usableHeight / 640);
    return { width: Math.max(1, width), height: Math.max(1, height), dpr: Math.min(window.devicePixelRatio || 1, 2),
      safe: { x: left + (usableWidth - 360 * scale) / 2, y: top + (usableHeight - 640 * scale) / 2, width: 360, height: 640, scale } };
  }
  private readonly resize = (): void => {
    if (!this.initialized || this.destroyed) return;
    const viewport = this.measure();
    this.pixi.renderer.resize(viewport.width, viewport.height, viewport.dpr);
    this.world.position.set(viewport.safe.x, viewport.safe.y);
    this.world.scale.set(viewport.safe.scale);
    this.scenes.resize(viewport);
    this.pixi.render();
  };
  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.visibility);
    await this.scenes.destroy();
    if (this.initialized) {
      this.pixi.ticker.remove(this.tick);
      this.pixi.destroy(false, { children: true });
    }
  }
}
