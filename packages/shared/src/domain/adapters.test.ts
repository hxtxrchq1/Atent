import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FcmPushAdapter,
  TwilioSmsAdapter,
  NotificationOrchestrator,
} from './emergency.js';
import type { EmergencyContact } from '@atent/types';

describe('Real External Notification Adapters (FCM & Twilio) & Error Handling Suite', () => {
  it('FcmPushAdapter safely fails with error code when credentials are not configured in test', async () => {
    // Unconfigured server key
    const adapter = new FcmPushAdapter('');
    const res = await adapter.sendEmergencyPush(
      'token_test_123',
      '🚨 ALERTA ATENT',
      'Juan necesita auxilio',
      { accessLink: 'http://localhost:3000/safety-link?token=abc' }
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'FCM_NOT_CONFIGURED');
  });

  it('TwilioSmsAdapter safely fails with error code when credentials are not configured in test', async () => {
    const adapter = new TwilioSmsAdapter({
      accountSid: '',
      authToken: '',
      fromNumber: '',
    });
    const res = await adapter.sendEmergencySms(
      '+51987654321',
      'ALERTA ATENT',
      'http://localhost:3000/safety-link?token=abc'
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'SMS_PROVIDER_NOT_CONFIGURED');
  });

  it('TwilioSmsAdapter rejects invalid phone numbers without invoking network', async () => {
    const adapter = new TwilioSmsAdapter({
      accountSid: 'AC_dummy_sid',
      authToken: 'auth_dummy_token',
      fromNumber: '+1234567890',
    });
    const res = await adapter.sendEmergencySms(
      'invalid_phone_number_format',
      'ALERTA',
      'http://test'
    );
    assert.equal(res.success, false);
    assert.equal(res.error, 'ERR_INVALID_PHONE');
  });

  it('NotificationOrchestrator records failed dispatch status when real adapters lack credentials', async () => {
    const failingSms = new TwilioSmsAdapter({ accountSid: '', authToken: '', fromNumber: '' });
    const failingPush = new FcmPushAdapter('');
    const orchestrator = new NotificationOrchestrator(failingSms, failingPush);

    const contact: EmergencyContact = {
      id: 'cnt_01',
      userId: 'usr_01',
      name: 'Contacto Test',
      phoneNumber: '+51999888777',
      relationship: 'FAMILY',
      priorityOrder: 1,
      isNotified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const tokensMap = new Map<string, string[]>();
    tokensMap.set('cnt_01', ['fcm_device_token_xyz']);

    const results = await orchestrator.dispatchAlert(
      [contact],
      'Usuario Atent',
      'http://localhost:3000/safety-link?token=test',
      tokensMap
    );

    assert.equal(results.length, 2); // 1 SMS + 1 Push
    assert.equal(results[0]?.status, 'FAILED');
    assert.equal(results[1]?.status, 'FAILED');
  });

  it('ResendEmailAdapter safely fails with error code when credentials are not configured', async () => {
    const { ResendEmailAdapter } = await import('./emergency.js');
    const adapter = new ResendEmailAdapter('');
    const res = await adapter.sendVerificationEmail('usuario@atent.pe', '123456');
    assert.equal(res.success, false);
    assert.equal(res.error, 'EMAIL_PROVIDER_NOT_CONFIGURED');
  });

  it('ResendEmailAdapter rejects invalid email format without invoking network', async () => {
    const { ResendEmailAdapter } = await import('./emergency.js');
    const adapter = new ResendEmailAdapter('re_dummy_api_key_123');
    const res = await adapter.sendVerificationEmail('correo_invalido_sin_arroba', '123456');
    assert.equal(res.success, false);
    assert.equal(res.error, 'ERR_INVALID_EMAIL');
  });
});
