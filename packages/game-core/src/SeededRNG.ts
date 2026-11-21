/** Mulberry32. Seed and draw order completely determine the sequence. */
export class SeededRNG {
  private state: number;

  constructor(seed = 1) {
    if (!Number.isFinite(seed)) throw new RangeError('Seed must be finite');
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  /** Continuous range [min, max). Use Math.floor for integer rolls. */
  range(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || !Number.isFinite(max - min)) {
      throw new RangeError('Expected finite min <= max');
    }
    return min + this.next() * (max - min);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Cannot pick from an empty collection');
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Fisher-Yates on a copy; never mutates the caller's array. */
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(this.next() * (index + 1));
      [result[index], result[other]] = [result[other]!, result[index]!];
    }
    return result;
  }
}
