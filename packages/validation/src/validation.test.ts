import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidGeoPoint, isValidPhoneNumber, isValidEmergencyToken } from './index.js';

describe('Validation Package Test Suite', () => {
  it('validates GeoPoints correctly', () => {
    assert.equal(isValidGeoPoint({ latitude: -12.0463, longitude: -77.0427, timestamp: Date.now() }), true);
    assert.equal(isValidGeoPoint({ latitude: 95, longitude: 0, timestamp: Date.now() }), false);
    assert.equal(isValidGeoPoint(null), false);
  });

  it('validates E.164 phone numbers correctly', () => {
    assert.equal(isValidPhoneNumber('+51987654321'), true);
    assert.equal(isValidPhoneNumber('+15005550006'), true);
    assert.equal(isValidPhoneNumber('12345'), false);
    assert.equal(isValidPhoneNumber('abc'), false);
  });

  it('validates high-entropy emergency tokens', () => {
    assert.equal(isValidEmergencyToken('c9b4d9a1-7711-4bcc-8fa1-688a0ac9b4d9'), true);
    assert.equal(isValidEmergencyToken('invalid-short-token'), false);
  });
});
