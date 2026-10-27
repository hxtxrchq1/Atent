import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BleButtonManager, MockBleAdapter } from './ble-button.js';

describe('BLE Emergency Hardware Button Integration Suite', () => {
  it('connects to paired BLE hardware button and reports status', async () => {
    const adapter = new MockBleAdapter();
    const manager = new BleButtonManager(adapter);

    const available = await manager.initialize();
    assert.equal(available, true);
    assert.equal(manager.getConnectionState(), 'DISCONNECTED');

    const connected = await manager.connectButton('BLE_BTN_TEST_01');
    assert.equal(connected, true);
    assert.equal(manager.getConnectionState(), 'CONNECTED');
    assert.equal(manager.getConnectedDeviceId(), 'BLE_BTN_TEST_01');
  });

  it('triggers emergency when receiving DOUBLE click or LONG_PRESS from button', async () => {
    const adapter = new MockBleAdapter();
    let emergencyTriggered = false;
    let triggerSource = '';

    const manager = new BleButtonManager(adapter, {
      onEmergencyTrigger: (source) => {
        emergencyTriggered = true;
        triggerSource = source;
      },
    });

    await manager.connectButton('BLE_BTN_TEST_01');

    // Single click should not trigger emergency (could be ping or accidental)
    adapter.simulateButtonPress({
      deviceId: 'BLE_BTN_TEST_01',
      pressType: 'SINGLE',
      timestamp: Date.now(),
    });
    assert.equal(emergencyTriggered, false);

    // Double click triggers SOS
    adapter.simulateButtonPress({
      deviceId: 'BLE_BTN_TEST_01',
      pressType: 'DOUBLE',
      timestamp: Date.now(),
    });
    assert.equal(emergencyTriggered, true);
    assert.equal(triggerSource, 'HARDWARE_KEY');
  });

  it('CRITICAL SAFETY RULE: Accidental BLE disconnection MUST NOT trigger false alarms', async () => {
    const adapter = new MockBleAdapter();
    let emergencyTriggered = false;

    const manager = new BleButtonManager(adapter, {
      onEmergencyTrigger: () => {
        emergencyTriggered = true;
      },
    });

    await manager.connectButton('BLE_BTN_TEST_01');
    assert.equal(manager.getConnectionState(), 'CONNECTED');

    // Accidental link loss / out of range
    adapter.simulateDisconnect('BLE_BTN_TEST_01');

    assert.equal(manager.getConnectionState(), 'DISCONNECTED');
    assert.equal(manager.getConnectedDeviceId(), null);
    assert.equal(emergencyTriggered, false, 'Link loss MUST NOT cause false emergency alarms');
  });

  it('ignores button presses from unverified/unpaired foreign BLE devices', async () => {
    const adapter = new MockBleAdapter();
    let emergencyTriggered = false;

    const manager = new BleButtonManager(adapter, {
      onEmergencyTrigger: () => {
        emergencyTriggered = true;
      },
    });

    await manager.connectButton('BLE_BTN_TEST_01');

    // Foreign device sends button press event
    adapter.simulateButtonPress({
      deviceId: 'FOREIGN_ROGUE_DEVICE',
      pressType: 'DOUBLE',
      timestamp: Date.now(),
    });

    assert.equal(emergencyTriggered, false);
  });
});
