interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/** 汎用インメモリ TTL キャッシュ（期限切れエントリの定期クリーンアップ付き） */
export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly sweepTimer: ReturnType<typeof setInterval>;
  private readonly ttlMs: number;

  constructor(ttlMs: number, sweepIntervalMs?: number) {
    this.ttlMs = ttlMs;
    this.sweepTimer = setInterval(
      () => this.sweep(),
      sweepIntervalMs ?? ttlMs * 2
    );
    this.sweepTimer.unref();
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  dispose(): void {
    clearInterval(this.sweepTimer);
    this.store.clear();
  }

  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}
