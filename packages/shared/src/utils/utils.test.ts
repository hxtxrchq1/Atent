import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCoordinates,
  isTokenExpired,
  maskPhoneNumber,
  sanitizeObjectForLogging,
} from './index.js';

describe('Shared Utilities Test Suite', () => {
  describe('isValidCoordinates', () => {
    it('should validate valid coordinates', () => {
      assert.equal(isValidCoordinates(0, 0), true);
      assert.equal(isValidCoordinates(-12.046374, -77.042793), true); // Lima, Peru
      assert.equal(isValidCoordinates(90, 180), true);
      assert.equal(isValidCoordinates(-90, -180), true);
    });

    it('should reject coordinates outside earthly bounds or non-numbers', () => {
      assert.equal(isValidCoordinates(91, 0), false);
      assert.equal(isValidCoordinates(-91, 0), false);
      assert.equal(isValidCoordinates(0, 181), false);
      assert.equal(isValidCoordinates(0, -181), false);
      assert.equal(isValidCoordinates(NaN, 0), false);
      assert.equal(isValidCoordinates('10' as unknown as number, 20), false);
    });
  });

  describe('isTokenExpired', () => {
    it('should identify expired and non-expired timestamps correctly', () => {
      const now = new Date('2026-10-22T00:00:00Z');
      const past = new Date('2026-10-21T23:59:59Z').toISOString();
      const future = new Date('2026-10-22T00:05:00Z').toISOString();

      assert.equal(isTokenExpired(past, now), true);
      assert.equal(isTokenExpired(future, now), false);
      assert.equal(isTokenExpired('invalid-date', now), true);
    });
  });

  describe('maskPhoneNumber', () => {
    it('should mask middle digits of phone numbers', () => {
      assert.equal(maskPhoneNumber('+51987654321'), '+519***321');
      assert.equal(maskPhoneNumber('+15005550006'), '+150***006');
      assert.equal(maskPhoneNumber('123'), '***');
    });
  });

  describe('sanitizeObjectForLogging', () => {
    it('should redact sensitive keys such as passwords, tokens, and coordinates', () => {
      const rawPayload = {
        userId: 'usr_123',
        password: 'SuperSecretPassword!',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        phoneNumber: '+51999888777',
        location: {
          latitude: -12.0463,
          longitude: -77.0427,
          accuracy: 10,
        },
        metadata: {
          deviceModel: 'Pixel 8',
          batteryLevel: 85,
        },
      };

      const sanitized = sanitizeObjectForLogging(rawPayload) as any;

      assert.equal(sanitized.userId, 'usr_123');
      assert.equal(sanitized.password, '[REDACTED]');
      assert.equal(sanitized.token, '[REDACTED]');
      assert.equal(sanitized.phoneNumber, '[REDACTED]');
      assert.equal(sanitized.location.latitude, '[REDACTED]');
      assert.equal(sanitized.location.longitude, '[REDACTED]');
      assert.equal(sanitized.location.accuracy, 10);
      assert.equal(sanitized.metadata.deviceModel, 'Pixel 8');
      assert.equal(sanitized.metadata.batteryLevel, 85);
    });
  });
});
