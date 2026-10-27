import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from './main.js';
import { EmergencyDomainService } from '@atent/shared';

describe('Atent Full Emergency API Integration Test Suite', () => {
  it('executes full end-to-end emergency lifecycle via HTTP', async () => {
    const domainService = new EmergencyDomainService();
    const server = createApiServer(domainService);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to get server address');
    }
    const baseUrl = `http://localhost:${address.port}`;

    // 1. Register Trusted Contacts
    const contactsRes = await fetch(`${baseUrl}/api/emergency/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_api_test',
        contacts: [
          {
            id: 'cnt_1',
            userId: 'usr_api_test',
            name: 'Contacto 1',
            phoneNumber: '+51987654321',
            relationship: 'FAMILY',
            priorityOrder: 1,
            isNotified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    });
    assert.equal(contactsRes.status, 200);

    // 2. Initiate Emergency
    const initRes = await fetch(`${baseUrl}/api/emergency/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_api_test',
        triggerSource: 'MANUAL_BUTTON',
        userFullName: 'Usuario API Test',
        initialCoordinates: {
          latitude: -12.0463,
          longitude: -77.0427,
          accuracy: 5,
        },
      }),
    });
    assert.equal(initRes.status, 201);
    const initData = (await initRes.json()) as any;
    assert.equal(initData.alert.status, 'ACTIVE');
    assert.ok(initData.publicAccessSession.token);
    assert.equal(initData.notificationDispatches.length, 1);
    assert.equal(initData.notificationDispatches[0].status, 'DELIVERED');

    const token = initData.publicAccessSession.token;
    const alertId = initData.alert.id;

    // 3. Ingest continuous telemetry point
    const teleRes = await fetch(`${baseUrl}/api/emergency/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId,
        userId: 'usr_api_test',
        latitude: -12.0470,
        longitude: -77.0430,
        accuracy: 4,
      }),
    });
    assert.equal(teleRes.status, 200);

    // 4. Contact fetches Live Safety Link without auth credentials
    const linkRes = await fetch(`${baseUrl}/api/emergency/safety-link?token=${token}`);
    assert.equal(linkRes.status, 200);
    const linkData = (await linkRes.json()) as any;
    assert.equal(linkData.status, 'ACTIVE');
    assert.equal(linkData.latestLocation.latitude, -12.0470);
    assert.equal(linkData.telemetryCount, 2);

    // 5. User resolves emergency and token becomes revoked
    const resolveRes = await fetch(`${baseUrl}/api/emergency/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alertId,
        userId: 'usr_api_test',
        reason: 'SAFE_AT_HOME',
      }),
    });
    assert.equal(resolveRes.status, 200);

    const revokedRes = await fetch(`${baseUrl}/api/emergency/safety-link?token=${token}`);
    const revokedData = (await revokedRes.json()) as any;
    assert.equal(revokedData.status, 'REVOKED');

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
