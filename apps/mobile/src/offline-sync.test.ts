import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  InMemoryStorageAdapter,
  OfflineTelemetrySyncManager,
  QueuedTelemetryItem,
} from './offline-sync.js';

describe('OfflineTelemetrySyncManager Mobile Unit & Resilience Suite', () => {
  it('enqueues valid coordinates and rejects invalid ones', async () => {
    const storage = new InMemoryStorageAdapter();
    const manager = new OfflineTelemetrySyncManager(storage);
    await manager.initialize();

    const validPoint = {
      latitude: -12.046374,
      longitude: -77.042793,
      accuracy: 10,
      timestamp: Date.now(),
      batteryLevel: 88,
    };

    const accepted = await manager.enqueue('session-101', 'emergency', validPoint);
    assert.strictEqual(accepted, true);
    assert.strictEqual(manager.getQueueLength(), 1);

    const invalidPoint = {
      latitude: 95.0, // beyond earth bounds [-90, 90]
      longitude: -77.042793,
      accuracy: 10,
      timestamp: Date.now(),
    };

    const rejected = await manager.enqueue('session-101', 'emergency', invalidPoint);
    assert.strictEqual(rejected, false);
    assert.strictEqual(manager.getQueueLength(), 1);
  });

  it('persists queue across manager re-initializations', async () => {
    const storage = new InMemoryStorageAdapter();
    const manager1 = new OfflineTelemetrySyncManager(storage);
    await manager1.initialize();

    await manager1.enqueue('session-102', 'trip', {
      latitude: -12.046,
      longitude: -77.042,
      accuracy: 15,
      timestamp: Date.now(),
    });

    assert.strictEqual(manager1.getQueueLength(), 1);

    // Instantiate fresh manager with same storage adapter
    const manager2 = new OfflineTelemetrySyncManager(storage);
    await manager2.initialize();

    assert.strictEqual(manager2.getQueueLength(), 1);
    const queue = manager2.getQueue();
    assert.strictEqual(queue[0]?.sessionId, 'session-102');
    assert.strictEqual(queue[0]?.sessionType, 'trip');
  });

  it('flushes queued telemetry sequentially and clears successfully delivered items', async () => {
    const storage = new InMemoryStorageAdapter();
    const manager = new OfflineTelemetrySyncManager(storage);
    await manager.initialize();

    await manager.enqueue('session-103', 'emergency', {
      latitude: -12.05,
      longitude: -77.05,
      accuracy: 5,
      timestamp: Date.now(),
    });

    await manager.enqueue('session-103', 'emergency', {
      latitude: -12.06,
      longitude: -77.06,
      accuracy: 6,
      timestamp: Date.now() + 5000,
    });

    assert.strictEqual(manager.getQueueLength(), 2);

    const sentItems: QueuedTelemetryItem[] = [];
    const syncResult = await manager.flush(async (item) => {
      sentItems.push(item);
      return true; // Simulate network 200 OK
    });

    assert.strictEqual(syncResult.flushedCount, 2);
    assert.strictEqual(syncResult.failedCount, 0);
    assert.strictEqual(syncResult.remainingQueueSize, 0);
    assert.strictEqual(manager.getQueueLength(), 0);
    assert.strictEqual(sentItems.length, 2);
  });

  it('retains failed items up to maxRetries on network failure', async () => {
    const storage = new InMemoryStorageAdapter();
    const manager = new OfflineTelemetrySyncManager(storage, { maxRetries: 2 });
    await manager.initialize();

    await manager.enqueue('session-104', 'emergency', {
      latitude: -12.1,
      longitude: -77.1,
      accuracy: 10,
      timestamp: Date.now(),
    });

    // 1st attempt: fails
    const result1 = await manager.flush(async () => false);
    assert.strictEqual(result1.flushedCount, 0);
    assert.strictEqual(result1.failedCount, 1);
    assert.strictEqual(result1.remainingQueueSize, 1);

    // 2nd attempt: fails (reaches maxRetries = 2)
    const result2 = await manager.flush(async () => false);
    assert.strictEqual(result2.flushedCount, 0);
    assert.strictEqual(result2.failedCount, 1);
    assert.strictEqual(result2.remainingQueueSize, 0); // discarded after exceeding maxRetries

    assert.strictEqual(manager.getQueueLength(), 0);
  });

  it('evicts oldest entries when maxQueueSize is exceeded to prevent buffer explosion', async () => {
    const storage = new InMemoryStorageAdapter();
    const manager = new OfflineTelemetrySyncManager(storage, { maxQueueSize: 3 });
    await manager.initialize();

    for (let i = 1; i <= 4; i++) {
      await manager.enqueue(`session-entry-${i}`, 'emergency', {
        latitude: -12.0 + i * 0.01,
        longitude: -77.0,
        accuracy: 10,
        timestamp: Date.now() + i,
      });
    }

    assert.strictEqual(manager.getQueueLength(), 3);
    const queue = manager.getQueue();
    // 1st entry should have been evicted; entries 2, 3, 4 remain
    assert.strictEqual(queue[0]?.sessionId, 'session-entry-2');
    assert.strictEqual(queue[2]?.sessionId, 'session-entry-4');
  });
});
