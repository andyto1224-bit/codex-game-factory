export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export type Migration = (data: unknown) => unknown;
export interface StorageOptions {
  /** 最终键为 namespace:key；局内、局外和设置应使用不同命名空间。 */
  namespace: string;
  version: number;
  /** 不传时尝试 localStorage；显式 null 表示仅使用当前实例内存。 */
  backend?: StorageBackend | null;
  /** 键为目标版本，如 2 表示把版本 1 迁移到 2；迁移逐级同步执行。 */
  migrations?: Readonly<Record<number, Migration>>;
}

/** 带 JSON 版本信封和运行时校验的存储；后端拒绝访问时回退到实例内存。 */
export class StorageManager {
  private readonly fallback = new Map<string, string>();
  private readonly backend: StorageBackend | null;
  private readonly removed = new Set<string>();

  constructor(private readonly options: StorageOptions) {
    if (!options.namespace || !Number.isSafeInteger(options.version) || options.version < 1) {
      throw new RangeError('Expected a namespace and positive schema version');
    }
    try {
      this.backend = options.backend === undefined
        ? (typeof localStorage === 'undefined' ? null : localStorage)
        : options.backend;
    } catch {
      this.backend = null;
    }
  }

  /** 损坏、未来版本、迁移缺失或类型守卫失败均返回 defaultValue，不信任 JSON 类型。 */
  get<T>(key: string, defaultValue: T, validate: (data: unknown) => data is T): T {
    const fullKey = this.key(key);
    if (this.removed.has(fullKey)) return defaultValue;
    let raw = this.fallback.get(fullKey);
    if (raw === undefined) {
      try { raw = this.backend?.getItem(fullKey) ?? undefined; } catch { /* 后端不可读时保留内存回退行为。 */ }
    }
    if (raw === undefined) return defaultValue;
    try {
      const envelope: unknown = JSON.parse(raw);
      if (typeof envelope !== 'object' || envelope === null || !('version' in envelope) || !('data' in envelope)) return defaultValue;
      if (typeof envelope.version !== 'number' || !Number.isSafeInteger(envelope.version) || envelope.version < 1 || envelope.version > this.options.version) return defaultValue;
      let version = envelope.version;
      let data: unknown = envelope.data;
      while (version < this.options.version) {
        const migration = this.options.migrations?.[version + 1];
        if (!migration) return defaultValue;
        data = migration(data);
        version += 1;
      }
      if (!validate(data)) return defaultValue;
      if (envelope.version !== version) this.set(key, data);
      return data;
    } catch { return defaultValue; }
  }

  /** 无法序列化时返回 false；后端写失败仍可在本实例使用，但不保证刷新后持久化。 */
  set<T>(key: string, data: T): boolean {
    try {
      if (JSON.stringify(data) === undefined) return false;
      const raw = JSON.stringify({ version: this.options.version, data });
      const fullKey = this.key(key);
      this.fallback.set(fullKey, raw);
      this.removed.delete(fullKey);
      try { this.backend?.setItem(fullKey, raw); } catch { /* 配额不足或隐私模式不阻断当前会话。 */ }
      return true;
    } catch { return false; }
  }

  /** 同步删除内存值并写删除标记，避免后端删除失败导致旧存档复活。 */
  remove(key: string): void {
    const fullKey = this.key(key);
    this.fallback.delete(fullKey);
    this.removed.add(fullKey); // 删除失败后也不能再从后端读取同名旧值。
    try { this.backend?.removeItem(fullKey); } catch { /* 保留当前实例的删除标记。 */ }
  }

  private key(key: string): string { return `${this.options.namespace}:${key}`; }
}
