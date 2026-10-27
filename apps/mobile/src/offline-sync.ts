import { isValidCoordinates } from '@atent/shared';

export interface TelemetryPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  batteryLevel?: number;
}

export interface QueuedTelemetryItem {
  id: string;
  sessionId: string;
  sessionType: 'emergency' | 'trip';
  point: TelemetryPoint;
  attempts: number;
  queuedAt: number;
  lastAttemptAt?: number;
}

export interface OfflineStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class InMemoryStorageAdapter implements OfflineStorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

export interface SyncResult {
  flushedCount: number;
  failedCount: number;
  remainingQueueSize: number;
}

export type TelemetrySender = (item: QueuedTelemetryItem) => Promise<boolean>;

export class OfflineTelemetrySyncManager {
  private queue: QueuedTelemetryItem[] = [];
  private isSyncing = false;
  private readonly storageKey: string;
  private readonly maxQueueSize: number;
  private readonly maxRetries: number;

  constructor(
    private readonly storage: OfflineStorageAdapter,
    options: {
      storageKey?: string;
      maxQueueSize?: number;
      maxRetries?: number;
    } = {}
  ) {
    this.storageKey = options.storageKey || 'atent_offline_telemetry_queue';
    this.maxQueueSize = options.maxQueueSize || 200;
    this.maxRetries = options.maxRetries || 5;
  }

  public async initialize(): Promise<void> {
    const raw = await this.storage.getItem(this.storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.queue = parsed;
        }
      } catch {
        this.queue = [];
      }
    }
  }

  public async enqueue(
    sessionId: string,
    sessionType: 'emergency' | 'trip',
    point: TelemetryPoint
  ): Promise<boolean> {
    if (!isValidCoordinates(point.latitude, point.longitude)) {
      return false;
    }

    const item: QueuedTelemetryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sessionId,
      sessionType,
      point,
      attempts: 0,
      queuedAt: Date.now(),
    };

    if (this.queue.length >= this.maxQueueSize) {
      // Evict oldest point to keep newest telemetry while honoring buffer limits
      this.queue.shift();
    }

    this.queue.push(item);
    await this.persist();
    return true;
  }

  public async flush(sender: TelemetrySender): Promise<SyncResult> {
    if (this.isSyncing || this.queue.length === 0) {
      return {
        flushedCount: 0,
        failedCount: 0,
        remainingQueueSize: this.queue.length,
      };
    }

    this.isSyncing = true;
    let flushedCount = 0;
    let failedCount = 0;
    const remainingQueue: QueuedTelemetryItem[] = [];

    try {
      for (const item of [...this.queue]) {
        try {
          item.attempts += 1;
          item.lastAttemptAt = Date.now();
          const success = await sender(item);
          if (success) {
            flushedCount += 1;
          } else {
            failedCount += 1;
            if (item.attempts < this.maxRetries) {
              remainingQueue.push(item);
            }
          }
        } catch {
          failedCount += 1;
          if (item.attempts < this.maxRetries) {
            remainingQueue.push(item);
          }
        }
      }

      this.queue = remainingQueue;
      await this.persist();
    } finally {
      this.isSyncing = false;
    }

    return {
      flushedCount,
      failedCount,
      remainingQueueSize: this.queue.length,
    };
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public getQueue(): QueuedTelemetryItem[] {
    return [...this.queue];
  }

  public async clearQueue(): Promise<void> {
    this.queue = [];
    await this.storage.removeItem(this.storageKey);
  }

  private async persist(): Promise<void> {
    await this.storage.setItem(this.storageKey, JSON.stringify(this.queue));
  }
}
