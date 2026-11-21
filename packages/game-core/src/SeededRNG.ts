/** Mulberry32 玩法随机源：相同种子和调用次序可重放，不用于密码或安全令牌。 */
export class SeededRNG {
  private state: number;

  /** 有限 seed 转为无符号 32 位整数；负数和小数也会按该规则归一化。 */
  constructor(seed = 1) {
    if (!Number.isFinite(seed)) throw new RangeError('Seed must be finite');
    this.state = seed >>> 0;
  }

  /** 推进内部状态并返回 [0, 1) 范围的伪随机数。 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  /** 连续区间 [min, max)；整数抽样可再 Math.floor，端点相等时也会推进状态。 */
  range(min: number, max: number): number {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max < min || !Number.isFinite(max - min)) {
      throw new RangeError('Expected finite min <= max');
    }
    return min + this.next() * (max - min);
  }

  /** 从非空数组均匀抽一项；空数组抛 RangeError。 */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Cannot pick from an empty collection');
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Fisher-Yates 洗牌返回新数组，保留调用方原数组。 */
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(this.next() * (index + 1));
      [result[index], result[other]] = [result[other]!, result[index]!];
    }
    return result;
  }
}
