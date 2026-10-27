import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createApiServer } from './main.js';
import { EmergencyDomainService, TripDomainService } from '@atent/shared';

describe('Trip Mode (Modo Viaje) API Integration Test Suite', () => {
  it('manages full lifecycle of travel monitoring via HTTP endpoints', async () => {
    const emergencyService = new EmergencyDomainService();
    const tripService = new TripDomainService();
    const server = createApiServer(emergencyService, tripService);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const baseUrl = `http://localhost:${port}`;

    // 1. Start Trip
    const startRes = await fetch(`${baseUrl}/api/trip/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_trip_api',
        destinationName: 'Centro Financiero',
        expectedDurationMinutes: 25,
        initialLocation: {
          latitude: -12.0463,
          longitude: -77.0427,
        },
      }),
    });
    assert.equal(startRes.status, 201);
    const startData = (await startRes.json()) as any;
    assert.equal(startData.trip.status, 'IN_TRANSIT');
    assert.equal(startData.trip.destinationName, 'Centro Financiero');
    const token = startData.trip.trackingToken;
    const tripId = startData.trip.id;

    // 2. Continuous location telemetry along route
    const locRes = await fetch(`${baseUrl}/api/trip/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        userId: 'usr_trip_api',
        latitude: -12.0490,
        longitude: -77.0450,
      }),
    });
    assert.equal(locRes.status, 200);

    // 3. Contact accesses Live Safety Link
    const linkRes = await fetch(`${baseUrl}/api/trip/safety-link?token=${token}`);
    assert.equal(linkRes.status, 200);
    const linkData = (await linkRes.json()) as any;
    assert.equal(linkData.status, 'IN_TRANSIT');
    assert.equal(linkData.destinationName, 'Centro Financiero');
    assert.equal(linkData.pointsRecorded, 2);

    // 4. Safe check-in
    const checkinRes = await fetch(`${baseUrl}/api/trip/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        userId: 'usr_trip_api',
        intervalMinutes: 10,
      }),
    });
    assert.equal(checkinRes.status, 200);

    // 5. Complete trip safely
    const completeRes = await fetch(`${baseUrl}/api/trip/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId,
        userId: 'usr_trip_api',
      }),
    });
    assert.equal(completeRes.status, 200);
    const completeData = (await completeRes.json()) as any;
    assert.equal(completeData.status, 'COMPLETED_SAFE');

    // 6. Token is revoked after trip completion
    const revokedRes = await fetch(`${baseUrl}/api/trip/safety-link?token=${token}`);
    const revokedData = (await revokedRes.json()) as any;
    assert.equal(revokedData.status, 'INVALID_OR_REVOKED');

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
