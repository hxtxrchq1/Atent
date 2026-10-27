import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer, SimpleRateLimiter } from './main.js';
import { EmergencyDomainService } from '@atent/shared';

describe('Security & Resilience Audit Regression Test Suite', () => {
  it('enforces idempotency on alert initiation under duplicate requests / network retry', async () => {
    const domainService = new EmergencyDomainService();
    const server = createApiServer(domainService);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    const idempotencyKey = 'req_idempotent_12345';
    const payload = {
      userId: 'usr_sec_test',
      triggerSource: 'MANUAL_BUTTON',
      idempotencyKey,
      userFullName: 'Usuario Idempotente',
    };

    // First request
    const res1 = await fetch(`${baseUrl}/api/emergency/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(res1.status, 201);
    const data1 = (await res1.json()) as any;

    // Second request (simulating network duplicate / retry)
    const res2 = await fetch(`${baseUrl}/api/emergency/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    assert.equal(res2.status, 201);
    const data2 = (await res2.json()) as any;

    // Both must return the identical session without creating duplicate alerts
    assert.equal(data1.alert.id, data2.alert.id);
    assert.equal(data1.publicAccessSession.token, data2.publicAccessSession.token);

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects telemetry with excessive device clock skew', async () => {
    const domainService = new EmergencyDomainService();
    const server = createApiServer(domainService);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    const initRes = await fetch(`${baseUrl}/api/emergency/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'usr_skew_test', triggerSource: 'HARDWARE_KEY' }),
    });
    const initData = (await initRes.json()) as any;

    // Telemetry with timestamp 1 hour in the past (clock skew / stale replay)
    const staleTime = Date.now() - 3600 * 1000;
    const teleRes = await fetch(`${baseUrl}/api/emergency/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId: initData.alert.id,
        userId: 'usr_skew_test',
        latitude: -12.0463,
        longitude: -77.0427,
        timestamp: staleTime,
      }),
    });

    assert.equal(teleRes.status, 400);
    const errorBody = (await teleRes.json()) as any;
    assert.ok(errorBody.error.includes('clock skew'));

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('enforces rate limiting and returns 429 when threshold exceeded', async () => {
    const domainService = new EmergencyDomainService();
    const rateLimiter = new SimpleRateLimiter(60000, 3); // max 3 requests
    const server = createApiServer(domainService, undefined, undefined, rateLimiter);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    // Perform 3 allowed requests
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${baseUrl}/health`);
      assert.equal(res.status, 200);
    }

    // 4th request must be rate limited
    const blockedRes = await fetch(`${baseUrl}/health`);
    assert.equal(blockedRes.status, 429);
    const blockedBody = (await blockedRes.json()) as any;
    assert.ok(blockedBody.error.includes('Rate limit exceeded'));

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects oversized payloads with 413 Payload Too Large', async () => {
    const domainService = new EmergencyDomainService();
    const server = createApiServer(domainService);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    // 70 KB payload (> 64 KB limit)
    const oversizedString = 'A'.repeat(70000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const res = await fetch(`${baseUrl}/api/emergency/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'usr_big', triggerSource: 'MANUAL_BUTTON', padding: oversizedString }),
        signal: controller.signal,
      });
      assert.equal(res.status, 413);
    } catch (err: any) {
      // Fetch may reject if socket was destroyed by server
      assert.ok(err.name === 'AbortError' || err.message.includes('fetch failed') || err.code === 'ECONNRESET');
    } finally {
      clearTimeout(timeout);
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
