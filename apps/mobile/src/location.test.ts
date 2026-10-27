import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AndroidLocationService } from './location.js';

describe('Android Location Service Lifecycle & Permissions Suite', () => {
  it('requests foreground and background permissions in appropriate context', async () => {
    const service = new AndroidLocationService();
    const fg = await service.requestForegroundPermission();
    assert.equal(fg, 'GRANTED');

    const bg = await service.requestBackgroundPermission();
    assert.equal(bg, 'GRANTED');
  });

  it('throws PERMISSION_DENIED if location is requested without granting permission', async () => {
    const service = new AndroidLocationService({
      requestPermissions: async () => 'denied',
      getCurrentLocation: async () => ({ latitude: 0, longitude: 0, accuracy: 1 }),
      watchLocation: () => () => {},
    });

    await service.requestForegroundPermission();
    await assert.rejects(
      async () => await service.getCurrentPosition(),
      /PERMISSION_DENIED/
    );
  });

  it('throws GPS_DISABLED when hardware GPS switch is disabled', async () => {
    const service = new AndroidLocationService();
    await service.requestForegroundPermission();
    service.setGpsProviderEnabled(false);

    await assert.rejects(
      async () => await service.getCurrentPosition(),
      /GPS_DISABLED/
    );
  });

  it('streams location updates when permissions are granted and GPS is enabled', async () => {
    const service = new AndroidLocationService();
    await service.requestForegroundPermission();

    const received: any[] = [];
    const unsubscribe = service.startWatchingPosition(
      (loc) => received.push(loc),
      (err) => { throw err; },
      { intervalMs: 50 }
    );

    await new Promise((resolve) => setTimeout(resolve, 150));
    unsubscribe();

    assert.ok(received.length >= 1);
    assert.equal(typeof received[0].latitude, 'number');
    assert.equal(typeof received[0].longitude, 'number');
  });
});
