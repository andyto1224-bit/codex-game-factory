export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export type Migration = (data: unknown) => unknown;
export interface StorageOptions {
  namespace: string;
  version: number;
  backend?: StorageBackend | null;
  /** Key is the destination version, e.g. 2 migrates version 1 to 2. */
  migrations?: Readonly<Record<number, Migration>>;
}

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

  get<T>(key: string, defaultValue: T, validate: (data: unknown) => data is T): T {
    const fullKey = this.key(key);
    if (this.removed.has(fullKey)) return defaultValue;
    let raw = this.fallback.get(fullKey);
    if (raw === undefined) {
      try { raw = this.backend?.getItem(fullKey) ?? undefined; } catch { /* Memory fallback. */ }
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

  /** Returns false on unserializable input; persistence failures stay usable in memory. */
  set<T>(key: string, data: T): boolean {
    try {
      if (JSON.stringify(data) === undefined) return false;
      const raw = JSON.stringify({ version: this.options.version, data });
      const fullKey = this.key(key);
      this.fallback.set(fullKey, raw);
      this.removed.delete(fullKey);
      try { this.backend?.setItem(fullKey, raw); } catch { /* Quota/private mode. */ }
      return true;
    } catch { return false; }
  }

  remove(key: string): void {
    const fullKey = this.key(key);
    this.fallback.delete(fullKey);
    this.removed.add(fullKey); // Prevent stale reads if backend.removeItem fails.
    try { this.backend?.removeItem(fullKey); } catch { /* Keep the memory tombstone. */ }
  }

  private key(key: string): string { return `${this.options.namespace}:${key}`; }
}
