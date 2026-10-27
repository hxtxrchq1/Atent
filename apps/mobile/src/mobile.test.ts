import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MobileAlertController } from './index.js';

describe('Mobile Application Core Controller Suite', () => {
  it('initializes in PENDING state with inactive foreground service', () => {
    const controller = new MobileAlertController();
    const state = controller.getState();
    assert.equal(state.currentStatus, 'PENDING');
    assert.equal(state.foregroundServiceActive, false);
    assert.equal(state.lastKnownCoordinates, null);
  });

  it('triggers emergency and activates foreground service', () => {
    const controller = new MobileAlertController();
    controller.triggerEmergency('MANUAL_BUTTON');
    const state = controller.getState();
    assert.equal(state.currentStatus, 'ACTIVE');
    assert.equal(state.foregroundServiceActive, true);
  });

  it('validates coordinates before updating lastKnownCoordinates', () => {
    const controller = new MobileAlertController();
    assert.equal(controller.updateCoordinates(100, 0), false); // invalid lat
    assert.equal(controller.updateCoordinates(-12.0463, -77.0427), true); // valid Lima coords
    assert.notEqual(controller.getState().lastKnownCoordinates, null);
  });

  it('resolves emergency cleanly and deactivates foreground service', () => {
    const controller = new MobileAlertController();
    controller.triggerEmergency('HARDWARE_KEY');
    controller.resolveEmergency();
    const state = controller.getState();
    assert.equal(state.currentStatus, 'RESOLVED');
    assert.equal(state.foregroundServiceActive, false);
  });
});
