import { describe, expect, it, vi } from 'vitest';
import { AudioManager, EventBus, MockPlatformAdapter, ObjectPool, SeededRNG, StorageManager } from '../index';
import type { StorageBackend } from '../StorageManager';

describe('EventBus', () => {
  it('does not fire once twice if another listener emits reentrantly first', () => {
    const bus = new EventBus<{ tick: number }>();
    const listener = vi.fn();
    bus.on('tick', (value) => { if (value === 1) bus.emit('tick', 2); });
    bus.once('tick', listener);
    bus.emit('tick', 1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2);
  });
  it('supports on/off/clear and one-shot reentrant dispatch', () => {
    const bus = new EventBus<{ score: number }>();
    const seen: number[] = [];
    const off = bus.on('score', (value) => seen.push(value));
    bus.once('score', (value) => bus.emit('score', value + 1));
    bus.emit('score', 1);
    expect(seen).toEqual([1, 2]);
    off();
    bus.emit('score', 3);
    expect(seen).toEqual([1, 2]);
    bus.on('score', (value) => seen.push(value));
    bus.clear('score');
    bus.emit('score', 4);
    bus.clear();
    expect(seen).toEqual([1, 2]);
  });
});

describe('SeededRNG', () => {
  it('replays across 1000 seeds and never changes shuffle input', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const left = new SeededRNG(seed);
      const right = new SeededRNG(seed);
      for (let draw = 0; draw < 20; draw += 1) {
        const value = left.next();
        expect(value).toBe(right.next());
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    }
    const rng = new SeededRNG(42);
    const items = [1, 2, 3, 4];
    expect(rng.shuffle(items).sort()).toEqual(items);
    expect(items).toEqual([1, 2, 3, 4]);
    expect(rng.pick(['only'])).toBe('only');
    expect(rng.range(2, 2)).toBe(2);
    expect(() => rng.pick([])).toThrow(RangeError);
    expect(() => rng.range(3, 2)).toThrow(RangeError);
    expect(() => new SeededRNG(NaN)).toThrow(RangeError);
  });
});

describe('ObjectPool', () => {
  it('resets, rejects duplicate recycling, and invalidates checked-out objects on clear', () => {
    const disposed = vi.fn();
    const pool = new ObjectPool(() => ({ x: 0 }), (value) => { value.x = 0; }, disposed);
    pool.prewarm(2);
    const first = pool.obtain();
    first.x = 10;
    pool.recycle(first);
    pool.recycle(first);
    expect(pool.size).toBe(2);
    expect(pool.obtain()).toBe(first);
    expect(first.x).toBe(0);
    pool.clear();
    expect(disposed).toHaveBeenCalledTimes(2);
    pool.recycle(first);
    expect(pool.size).toBe(0);
    expect(pool.activeCount).toBe(0);
    expect(() => pool.prewarm(-1)).toThrow(RangeError);
  });
});

describe('StorageManager', () => {
  const isNumber = (value: unknown): value is number => typeof value === 'number';
  it('migrates one version at a time and validates loaded data', () => {
    const records = new Map([['test:score', JSON.stringify({ version: 1, data: 2 })]]);
    const backend: StorageBackend = {
      getItem: (key) => records.get(key) ?? null,
      setItem: (key, value) => { records.set(key, value); },
      removeItem: (key) => { records.delete(key); },
    };
    const storage = new StorageManager({ namespace: 'test', version: 3, backend, migrations: {
      2: (data) => isNumber(data) ? data + 1 : 0,
      3: (data) => isNumber(data) ? data * 2 : 0,
    } });
    expect(storage.get('score', 0, isNumber)).toBe(6);
    expect(JSON.parse(records.get('test:score') ?? '{}')).toEqual({ version: 3, data: 6 });
    records.set('test:bad', '{');
    expect(storage.get('bad', 9, isNumber)).toBe(9);
    records.set('test:future', JSON.stringify({ version: 9, data: 99 }));
    expect(storage.get('future', 9, isNumber)).toBe(9);
  });

  it('survives denied storage, cyclic input, failed deletion and wrong schema', () => {
    const backend: StorageBackend = {
      getItem: () => JSON.stringify({ version: 1, data: 3 }),
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('denied'); },
    };
    const storage = new StorageManager({ namespace: 'test', version: 1, backend });
    expect(storage.set('score', 7)).toBe(true);
    expect(storage.get('score', 0, isNumber)).toBe(7);
    storage.remove('score');
    expect(storage.get('score', 0, isNumber)).toBe(0);
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    expect(storage.set('bad', cycle)).toBe(false);
    expect(storage.set('undefined', undefined)).toBe(false);
    const memory = new StorageManager({ namespace: 'memory', version: 1, backend: null });
    memory.set('score', 'wrong');
    expect(memory.get('score', 0, isNumber)).toBe(0);
  });
});

describe('MockPlatformAdapter', () => {
  it('respects reward cancellation, interstitial cooldown and fallback translations', async () => {
    let clock = 0;
    const platform = new MockPlatformAdapter({ rewarded: false, now: () => clock, dictionary: { score: 'Score {n}' } });
    expect(await platform.showRewardedAd('revive')).toEqual({ rewarded: false, reason: 'cancelled' });
    expect(await platform.showInterstitial('end')).toBe(true);
    expect(await platform.showInterstitial('end')).toBe(false);
    clock = 90_000;
    expect(await platform.showInterstitial('end')).toBe(true);
    expect(platform.translate('score', { n: 12 })).toBe('Score 12');
    expect(platform.translate('missing')).toBe('missing');
    platform.track('game_start', { seed: 42 });
    expect(platform.events[0]?.data).toEqual({ seed: 42 });
  });
});

describe('AudioManager', () => {
  it('can be created and disposed outside the browser', async () => {
    const audio = new AudioManager();
    expect(await audio.unlock()).toBe(false);
    audio.setMuted(true);
    expect(audio.isMuted).toBe(true);
    expect(audio.playTone()).toBe(false);
    await audio.destroy();
    expect(await audio.unlock()).toBe(false);
  });

  it('unlocks on gestures, mutes on visibility changes and removes listeners', async () => {
    const target = new EventTarget();
    let hidden = false;
    Object.defineProperty(target, 'hidden', { get: () => hidden });
    const gains: { gain: { setValueAtTime: ReturnType<typeof vi.fn> }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
    class FakeAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      resume = vi.fn(async () => {});
      close = vi.fn(async () => {});
      createGain() {
        const gain = { gain: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
        gains.push(gain);
        return gain;
      }
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    try {
      const audio = new AudioManager(target as Document);
      target.dispatchEvent(new Event('pointerdown'));
      await Promise.resolve();
      expect(gains).toHaveLength(1);
      hidden = true;
      target.dispatchEvent(new Event('visibilitychange'));
      expect(gains[0]?.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
      audio.setMuted(true);
      hidden = false;
      target.dispatchEvent(new Event('visibilitychange'));
      expect(gains[0]?.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
      audio.setMuted(false);
      expect(gains[0]?.gain.setValueAtTime).toHaveBeenLastCalledWith(1, 0);
      await audio.destroy();
      target.dispatchEvent(new Event('touchstart'));
      expect(gains).toHaveLength(1);
    } finally { vi.unstubAllGlobals(); }
  });
});
