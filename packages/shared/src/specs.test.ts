import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLATFORM_DISCLAIMERS,
  SYSTEM_LIMITS,
} from './constants/index.js';
import {
  sanitizeObjectForLogging,
} from './utils/index.js';

describe('Atent Specifications and Requirements Compliance Suite', () => {
  describe('Rule 8: Platform Disclaimers and Realism Constraints', () => {
    it('must explicitly disclaim emergency guarantees', () => {
      assert.ok(
        PLATFORM_DISCLAIMERS.NO_GUARANTEE_OF_HELP.includes('no garantiza la llegada de auxilio')
      );
    });

    it('must document Android OS limits (Doze mode & DND)', () => {
      assert.ok(
        PLATFORM_DISCLAIMERS.OS_LIMITS_ANDROID.includes('Doze mode')
      );
      assert.ok(
        PLATFORM_DISCLAIMERS.OS_LIMITS_ANDROID.includes('No Molestar (DND)')
      );
    });
  });

  describe('Rule 9 & 10: Security and Privacy Constraints', () => {
    it('must enforce TTL boundary limits for emergency access sessions', () => {
      assert.ok(SYSTEM_LIMITS.DEFAULT_EMERGENCY_LINK_TTL_MINUTES <= 1440);
      assert.ok(SYSTEM_LIMITS.DEFAULT_EMERGENCY_LINK_TTL_MINUTES > 0);
    });

    it('must redact sensitive keys from logging structures', () => {
      const sensitivePayload = {
        password: 'cleartext_password',
        token: 'high_entropy_token_1234',
        phoneNumber: '+51987654321',
        latitude: -12.0463,
        longitude: -77.0427,
      };

      const result = sanitizeObjectForLogging(sensitivePayload) as any;
      assert.equal(result.password, '[REDACTED]');
      assert.equal(result.token, '[REDACTED]');
      assert.equal(result.phoneNumber, '[REDACTED]');
      assert.equal(result.latitude, '[REDACTED]');
      assert.equal(result.longitude, '[REDACTED]');
    });
  });
});
