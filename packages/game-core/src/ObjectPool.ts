/** 按对象身份跟踪借还，防止重复回收；clear 前借出的对象不能混入新池。 */
export class ObjectPool<T extends object> {
  private readonly available: T[] = [];
  private readonly borrowed = new Set<T>();

  /** create 必须返回独立对象；reset 清理业务字段，dispose 释放外部资源。 */
  constructor(
    private readonly create: () => T,
    private readonly reset: (value: T) => void = () => {},
    private readonly dispose: (value: T) => void = () => {},
  ) {}

  /** 当前立即可借用数量，不包含已借出的对象。 */
  get size(): number { return this.available.length; }
  /** 已借出且尚未归还的对象数。 */
  get activeCount(): number { return this.borrowed.size; }

  /** 优先复用空闲对象，池为空时调用工厂创建。 */
  obtain(): T {
    const value = this.available.pop() ?? this.create();
    this.borrowed.add(value);
    return value;
  }

  /** 只回收本池当前借出的对象；reset 失败时销毁该对象并向上传播异常。 */
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

  /** 预热到至少 count 个空闲对象；count 必须为非负安全整数。 */
  prewarm(count: number): void {
    if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Invalid prewarm count');
    while (this.available.length < count) this.available.push(this.create());
  }

  /** 清空并销毁空闲和借出对象；调用前先停止使用这些对象，dispose 应保证异常安全。 */
  clear(): void {
    const values = [...this.available, ...this.borrowed];
    this.available.length = 0;
    this.borrowed.clear();
    for (const value of values) this.dispose(value);
  }
}
