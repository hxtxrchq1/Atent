import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AtentMobileAppController } from './app-controller.js';
import { AndroidLocationService } from './location.js';

describe('End-to-End Real Mobile Controller <-> API Integration Suite', () => {
  let server: http.Server;
  const PORT = 3099;
  const baseUrl = `http://127.0.0.1:${PORT}`;

  before(async () => {
    // Lightweight local mock HTTP server validating mobile client contracts
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/api/emergency/initiate' && req.method === 'POST') {
        res.writeHead(201);
        res.end(JSON.stringify({ alert: { id: `alt_mock_${Date.now()}` } }));
      } else if (req.url === '/api/emergency/telemetry' && req.method === 'POST') {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } else if (req.url === '/api/emergency/resolve' && req.method === 'POST') {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      }
    });
    await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', () => resolve()));
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('executes full mobile authentication and emergency dispatch over real HTTP', async () => {
    const locationService = new AndroidLocationService();
    await locationService.requestForegroundPermission();

    const mobileApp = new AtentMobileAppController(baseUrl, { locationService });

    // 1. Initial State
    assert.equal(mobileApp.getState().currentScreen, 'ONBOARDING');

    // 2. Login
    await mobileApp.login('fake_valid_jwt_token');
    assert.equal(mobileApp.getState().currentScreen, 'HOME');
    assert.equal(mobileApp.getState().isAuthenticated, true);

    // 3. Trigger Emergency
    const alertId = await mobileApp.triggerEmergency('MANUAL_BUTTON');
    assert.ok(alertId.startsWith('alt_'));
    assert.equal(mobileApp.getState().currentScreen, 'EMERGENCY_ACTIVE');
    assert.equal(mobileApp.getState().isForegroundServiceActive, true);
    assert.notEqual(mobileApp.getState().lastKnownLocation, null);

    // 4. Resolve Emergency cleanly
    await mobileApp.resolveEmergency('USER_RESOLVED_TEST');
    assert.equal(mobileApp.getState().currentScreen, 'HOME');
    assert.equal(mobileApp.getState().activeAlertId, null);
    assert.equal(mobileApp.getState().isForegroundServiceActive, false);
  });
});
