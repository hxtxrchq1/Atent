import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { createApiServer } from './main.js';
import { EmergencyDomainService, TripDomainService, AuthService } from '@atent/shared';

describe('Emergency Ingest & Receiver Acknowledge HTTP Suite', () => {
  function makeRequest(
    server: http.Server,
    path: string,
    method = 'GET',
    body?: any
  ): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const port = (server.address() as any).port;
      const payload = body ? JSON.stringify(body) : undefined;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (payload) headers['Content-Length'] = Buffer.byteLength(payload).toString();

      const req = http.request(
        { hostname: '127.0.0.1', port, path, method, headers },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode ?? 0, body: data ? JSON.parse(data) : null });
            } catch {
              resolve({ status: res.statusCode ?? 0, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  it('registers push tokens, acknowledges emergency receipt (Estoy al tanto), and surfaces in Live Safety Link', async () => {
    const emergencyService = new EmergencyDomainService();
    const server = createApiServer(emergencyService, new TripDomainService(), new AuthService());
    await new Promise<void>((resolve) => server.listen(0, resolve));

    try {
      // 1. Register push token for user
      const pushRes = await makeRequest(server, '/api/emergency/push-token', 'POST', {
        userId: 'usr_receiver_1',
        deviceToken: 'fcm_device_token_xyz_888',
      });
      assert.strictEqual(pushRes.status, 200);
      assert.strictEqual(pushRes.body.success, true);
      assert.deepStrictEqual(emergencyService.getPushTokens('usr_receiver_1'), ['fcm_device_token_xyz_888']);

      // 2. Initiate alert
      const alertAggregate = await emergencyService.initiateEmergency({
        userId: 'usr_sender_1',
        triggerSource: 'MANUAL_BUTTON',
      });
      const alertId = alertAggregate.alert.id;
      const token = alertAggregate.publicAccessSession.token;

      // 3. Acknowledge alert receipt: "Estoy al tanto"
      const ackRes = await makeRequest(server, '/api/emergency/acknowledge', 'POST', {
        alertId,
        contactId: 'ct_guardian_1',
        contactName: 'Carlos Guardian',
        note: 'Voy en camino hacia tu ubicacion',
      });
      assert.strictEqual(ackRes.status, 200);
      assert.strictEqual(ackRes.body.success, true);
      assert.strictEqual(ackRes.body.acknowledgement.contactName, 'Carlos Guardian');

      // 4. Query public live safety link and verify acknowledgement is surfaced
      const linkRes = await makeRequest(server, `/api/emergency/safety-link?token=${token}`, 'GET');
      assert.strictEqual(linkRes.status, 200);
      assert.strictEqual(linkRes.body.status, 'ACTIVE');
      assert.strictEqual(linkRes.body.acknowledgements.length, 1);
      assert.strictEqual(linkRes.body.acknowledgements[0].contactName, 'Carlos Guardian');
      assert.strictEqual(linkRes.body.acknowledgements[0].note, 'Voy en camino hacia tu ubicacion');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
