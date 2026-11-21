import { Assets, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { gsap } from 'gsap';
import manifest from '../../assets.manifest.json';
import type { Scene, SceneContext, Viewport } from '../core/SceneManager';

/** 只负责表现：按 manifest 加载相同路径的资源，正式图替换不改玩法代码。 */
export class SampleScene implements Scene {
  private orb: Sprite | undefined;
  private backdrop: Sprite | undefined;
  private elapsed = 0;

  constructor(private readonly onTap: () => void) {}

  async enter(context: SceneContext): Promise<void> {
    const load = async (id: string): Promise<Sprite> => {
      const asset = manifest.assets.find((entry) => entry.id === id);
      if (!asset) throw new Error(`Missing asset: ${id}`);
      const texture = await Assets.load<Texture>(new URL(asset.path, document.baseURI).href);
      const sprite = new Sprite(texture);
      sprite.anchor.set(asset.anchor[0] ?? 0.5, asset.anchor[1] ?? 0.5);
      return sprite;
    };
    this.backdrop = await load('background');
    context.background.addChild(this.backdrop);
    this.orb = await load('orb');
    this.orb.position.set(180, 320);
    this.orb.eventMode = 'static';
    this.orb.cursor = 'pointer';
    this.orb.on('pointerdown', this.onTap);
    context.world.addChild(this.orb);
  }
  pulse(): void {
    if (!this.orb || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(this.orb.scale, { x: 0.9, y: 0.9 }, { x: 1, y: 1, duration: 0.18, overwrite: true, ease: 'back.out(2)' });
  }
  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
    if (this.orb && !matchMedia('(prefers-reduced-motion: reduce)').matches) this.orb.rotation = Math.sin(this.elapsed * 1.4) * 0.04;
  }
  resize(viewport: Viewport): void {
    if (!this.backdrop) return;
    const cover = Math.max(viewport.width / this.backdrop.texture.width, viewport.height / this.backdrop.texture.height);
    this.backdrop.scale.set(cover);
    this.backdrop.position.set(viewport.width / 2, viewport.height / 2);
  }
  /** 解除输入与 Tween 后销毁 Sprite；不销毁 Assets 中其他场景可能复用的贴图。 */
  exit(): void {
    if (this.orb) {
      gsap.killTweensOf(this.orb.scale);
      this.orb.off('pointerdown', this.onTap);
      this.orb.destroy();
      this.orb = undefined;
    }
    this.backdrop?.destroy();
    this.backdrop = undefined;
  }
}
