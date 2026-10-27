import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EmergencyGestureMachine } from './gesture-machine.js';

describe('Emergency Gesture State Machine Suite', () => {
  it('starts in IDLE state', () => {
    const machine = new EmergencyGestureMachine();
    assert.equal(machine.getState(), 'IDLE');
    assert.equal(machine.isCancelZoneHovered(), false);
  });

  it('transitions to PREPARING on press-in', () => {
    const machine = new EmergencyGestureMachine();
    machine.handlePressIn();
    assert.equal(machine.getState(), 'PREPARING');
  });

  it('transitions to CANCELLING when dragged upwards past threshold', () => {
    const machine = new EmergencyGestureMachine({ cancelZoneThresholdY: -90 });
    machine.handlePressIn();
    assert.equal(machine.getState(), 'PREPARING');

    // Slight movement downwards or small up
    machine.handleMove(-30);
    assert.equal(machine.getState(), 'PREPARING');
    assert.equal(machine.isCancelZoneHovered(), false);

    // Dragged all the way up to cancel zone
    machine.handleMove(-100);
    assert.equal(machine.getState(), 'CANCELLING');
    assert.equal(machine.isCancelZoneHovered(), true);

    // Dragged back down
    machine.handleMove(-50);
    assert.equal(machine.getState(), 'PREPARING');
    assert.equal(machine.isCancelZoneHovered(), false);
  });

  it('tracks 2D spatial coordinates towards top-right circular cancel target', () => {
    const machine = new EmergencyGestureMachine({
      cancelZoneTargetX: 110,
      cancelZoneTargetY: -190,
      cancelZoneRadius: 50,
      cancelZoneThresholdY: -300 // ensure only circular test triggers
    });
    machine.handlePressIn();
    assert.equal(machine.getState(), 'PREPARING');

    // Finger moves towards top right but outside circle
    machine.handleMove(-100, 50);
    assert.equal(machine.getState(), 'PREPARING');
    assert.equal(machine.isCancelZoneHovered(), false);
    assert.ok(machine.getDistanceToCancel() > 50);

    // Finger enters top-right circular cancel zone (dx=105, dy=-185)
    machine.handleMove(-185, 105);
    assert.equal(machine.getState(), 'CANCELLING');
    assert.equal(machine.isCancelZoneHovered(), true);
    assert.ok(machine.getDistanceToCancel() <= 50);

    // Releasing inside top-right circle cancels
    const outcome = machine.handlePressOut();
    assert.equal(outcome, 'CANCELLED');
    assert.equal(machine.getState(), 'IDLE');
  });

  it('cancels emergency without triggering if released inside cancel zone', () => {
    const machine = new EmergencyGestureMachine({ cancelZoneThresholdY: -90 });
    machine.handlePressIn();
    machine.handleMove(-120);

    const outcome = machine.handlePressOut();
    assert.equal(outcome, 'CANCELLED');
    assert.equal(machine.getState(), 'IDLE');
  });

  it('activates emergency if released normally outside cancel zone', () => {
    const machine = new EmergencyGestureMachine();
    machine.handlePressIn();
    machine.handleMove(-20); // within safe zone

    const outcome = machine.handlePressOut();
    assert.equal(outcome, 'ACTIVATED');
    assert.equal(machine.getState(), 'ACTIVATING');

    // Backend confirms
    machine.confirmActive();
    assert.equal(machine.getState(), 'ACTIVE');
  });

  it('protects against double activation / repeat spam while activating', () => {
    const machine = new EmergencyGestureMachine();
    machine.handlePressIn();
    const outcome1 = machine.handlePressOut();
    assert.equal(outcome1, 'ACTIVATED');

    // Try tapping again while processing
    machine.handlePressIn();
    assert.equal(machine.getState(), 'ACTIVATING'); // doesn't regress
    const outcome2 = machine.handlePressOut();
    assert.equal(outcome2, 'IGNORED');
  });

  it('resets cleanly to IDLE on system interruption (incoming call / screen lock)', () => {
    const machine = new EmergencyGestureMachine();
    machine.handlePressIn();
    assert.equal(machine.getState(), 'PREPARING');

    machine.handleSystemInterrupt();
    assert.equal(machine.getState(), 'IDLE');
    assert.equal(machine.isCancelZoneHovered(), false);
  });

  it('handles backend error or offline failure gracefully', () => {
    const machine = new EmergencyGestureMachine();
    machine.handlePressIn();
    machine.handlePressOut();
    assert.equal(machine.getState(), 'ACTIVATING');

    machine.setOfflineOrError();
    assert.equal(machine.getState(), 'ERROR_OFFLINE');

    machine.reset();
    assert.equal(machine.getState(), 'IDLE');
  });
});
