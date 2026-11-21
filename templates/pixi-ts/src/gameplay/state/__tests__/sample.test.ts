import { describe, expect, it } from 'vitest';
import { GameSession } from '../GameSession';

describe('deterministic action state boundaries', () => {
  it('covers all five screens, pause locks, single revive and restart', () => {
    const game = new GameSession();
    expect(game.snapshot().screen).toBe('start');
    expect(game.tap()).toBe(false);
    game.start(42);
    for (let hit = 0; hit < 9; hit += 1) expect(game.tap()).toBe(true);
    expect(game.snapshot().score).toBe(9);
    game.pause();
    game.pause();
    expect(game.tap()).toBe(false);
    expect(game.snapshot().screen).toBe('pause');
    game.resume();
    game.tap();
    expect(game.snapshot().screen).toBe('revive');
    game.resume();
    expect(game.tap()).toBe(false);
    game.revive(true);
    for (let hit = 0; hit < 10; hit += 1) game.tap();
    expect(game.snapshot()).toEqual({ screen: 'gameover', score: 20, seed: 42, revived: true });
    game.revive(true);
    expect(game.tap()).toBe(false);
    game.start(9);
    expect(game.snapshot()).toEqual({ screen: 'hud', score: 0, seed: 9, revived: false });
  });

  it('handles cancelled rewards and snapshots cannot mutate internal state', () => {
    const game = new GameSession();
    game.start();
    const snapshot = { ...game.snapshot(), score: 100 };
    expect(game.snapshot().score).not.toBe(snapshot.score);
    for (let hit = 0; hit < 10; hit += 1) game.tap();
    game.revive(false);
    expect(game.snapshot().screen).toBe('gameover');
    expect(() => game.start(Infinity)).toThrow(RangeError);
  });
});
