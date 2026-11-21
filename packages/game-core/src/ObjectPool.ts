/** Identity-tracked pool. Unknown, duplicate or pre-clear objects are ignored. */
export class ObjectPool<T extends object> {
  private readonly available: T[] = [];
  private readonly borrowed = new Set<T>();

  constructor(
    private readonly create: () => T,
    private readonly reset: (value: T) => void = () => {},
    private readonly dispose: (value: T) => void = () => {},
  ) {}

  get size(): number { return this.available.length; }
  get activeCount(): number { return this.borrowed.size; }

  obtain(): T {
    const value = this.available.pop() ?? this.create();
    this.borrowed.add(value);
    return value;
  }

  recycle(value: T): void {
    if (!this.borrowed.delete(value)) return;
    try {
      this.reset(value);
      this.available.push(value);
    } catch (error) {
      this.dispose(value);
      throw error;
    }
  }

  /** Ensures at least count objects are immediately available. */
  prewarm(count: number): void {
    if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Invalid prewarm count');
    while (this.available.length < count) this.available.push(this.create());
  }

  clear(): void {
    const values = [...this.available, ...this.borrowed];
    this.available.length = 0;
    this.borrowed.clear();
    for (const value of values) this.dispose(value);
  }
}
