import { describe, expect, it } from 'vitest';
import { Container } from 'pixi.js';
import { SceneManager } from '../SceneManager';
import type { Scene, SceneContext } from '../SceneManager';

function context(): SceneContext {
  return { world: new Container(), background: new Container(), viewport: {
    width: 360, height: 640, dpr: 1, safe: { x: 0, y: 0, width: 360, height: 640, scale: 1 },
  } };
}
describe('SceneManager lifecycle', () => {
  it('disposes an in-flight enter exactly once without activating it', async () => {
    const calls: string[] = [];
    const manager = new SceneManager(context());
    let release = (): void => {};
    let markEntered = (): void => {};
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    const entered = new Promise<void>((resolve) => { markEntered = resolve; });
    const transition = manager.change({
      enter: async () => { calls.push('enter'); markEntered(); await blocked; },
      update: () => { calls.push('update'); }, resize: () => { calls.push('resize'); }, exit: () => { calls.push('exit'); },
    });
    await entered;
    const destruction = manager.destroy();
    release();
    await Promise.all([transition, destruction]);
    manager.update(0.016);
    expect(calls).toEqual(['enter', 'exit']);
  });
  it('serializes transitions and exits each scene before the next enters', async () => {
    const calls: string[] = [];
    const manager = new SceneManager(context());
    const scene = (name: string): Scene => ({
      enter: async () => { calls.push(`${name}:enter`); await Promise.resolve(); },
      update: () => { calls.push(`${name}:update`); },
      resize: () => { calls.push(`${name}:resize`); },
      exit: () => { calls.push(`${name}:exit`); },
    });
    await Promise.all([manager.change(scene('a')), manager.change(scene('b'))]);
    manager.update(0.016);
    await manager.destroy();
    expect(calls).toEqual(['a:enter', 'a:resize', 'a:exit', 'b:enter', 'b:resize', 'b:update', 'b:exit']);
    await expect(manager.change(scene('c'))).rejects.toThrow('disposed');
  });

  it('cleans up a failed enter and still accepts the next scene', async () => {
    const calls: string[] = [];
    const manager = new SceneManager(context());
    await expect(manager.change({
      enter: () => { throw new Error('load failed'); },
      update: () => {}, resize: () => {}, exit: () => { calls.push('cleanup'); },
    })).rejects.toThrow('load failed');
    await manager.change({ enter: () => { calls.push('next'); }, update: () => {}, resize: () => {}, exit: () => {} });
    await manager.destroy();
    expect(calls).toEqual(['cleanup', 'next']);
  });
});
