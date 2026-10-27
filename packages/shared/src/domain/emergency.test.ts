import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EmergencyDomainService,
  NotificationOrchestrator,
  MockSmsAdapter,
} from './emergency.js';
import type { EmergencyContact } from '@atent/types';

describe('Emergency Domain & Notification Orchestrator Vertical Block', () => {
  it('registers contacts and validates E.164 phone numbers', () => {
    const service = new EmergencyDomainService();
    const validContacts: EmergencyContact[] = [
      {
        id: 'cnt_1',
        userId: 'usr_1',
        name: 'Mamá',
        phoneNumber: '+51987654321',
        relationship: 'FAMILY',
        priorityOrder: 1,
        isNotified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    service.registerContacts('usr_1', validContacts);
    assert.equal(service.getContacts('usr_1').length, 1);

    assert.throws(() => {
      service.registerContacts('usr_1', [
        {
          id: 'cnt_invalid',
          userId: 'usr_1',
          name: 'Invalido',
          phoneNumber: 'invalid_number',
          relationship: 'OTHER',
          priorityOrder: 99,
          isNotified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    });
  });

  it('initiates emergency session, captures telemetry, and dispatches SMS with Live Safety Link', async () => {
    const mockAdapter = new MockSmsAdapter();
    const orchestrator = new NotificationOrchestrator(mockAdapter);
    const service = new EmergencyDomainService(orchestrator);

    service.registerContacts('usr_1', [
      {
        id: 'cnt_1',
        userId: 'usr_1',
        name: 'Carlos',
        phoneNumber: '+51999888777',
        relationship: 'FRIEND',
        priorityOrder: 1,
        isNotified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);

    const aggregate = await service.initiateEmergency({
      userId: 'usr_1',
      triggerSource: 'MANUAL_BUTTON',
      initialCoordinates: {
        latitude: -12.046374,
        longitude: -77.042793,
        accuracy: 8,
      },
      batteryLevel: 85,
    }, 'Alonso Paredes');

    assert.equal(aggregate.alert.status, 'ACTIVE');
    assert.equal(aggregate.telemetryHistory.length, 1);
    assert.equal(aggregate.notificationDispatches.length, 1);
    assert.equal(aggregate.notificationDispatches[0]?.status, 'DELIVERED');
    assert.equal(mockAdapter.dispatchedMessages.length, 1);
    assert.ok(mockAdapter.dispatchedMessages[0]?.link.includes(aggregate.publicAccessSession.token));

    // Ingest subsequent telemetry
    const point2 = service.ingestTelemetry({
      alertId: aggregate.alert.id,
      userId: 'usr_1',
      latitude: -12.0465,
      longitude: -77.0429,
      accuracy: 6,
    });
    assert.equal(point2.latitude, -12.0465);

    // Verify public Live Safety Link access
    const publicData = service.getPublicLiveSafetyLinkData(aggregate.publicAccessSession.token);
    assert.equal(publicData.status, 'ACTIVE');
    assert.equal((publicData as any).telemetryCount, 2);

    // Resolve Emergency and verify immediate revocation of token
    service.resolveEmergency({
      alertId: aggregate.alert.id,
      userId: 'usr_1',
      reason: 'USER_REACHED_SAFE_ZONE',
    });

    const revokedData = service.getPublicLiveSafetyLinkData(aggregate.publicAccessSession.token);
    assert.equal(revokedData.status, 'REVOKED');
  });

  it('rejects unauthorized telemetry and invalid coordinates', async () => {
    const service = new EmergencyDomainService();
    const aggregate = await service.initiateEmergency({
      userId: 'usr_100',
      triggerSource: 'FALL_DETECTION',
    });

    // Mismatched user
    assert.throws(() => {
      service.ingestTelemetry({
        alertId: aggregate.alert.id,
        userId: 'usr_imposter',
        latitude: 10,
        longitude: 10,
      });
    });

    // Invalid coordinates outside Earth
    assert.throws(() => {
      service.ingestTelemetry({
        alertId: aggregate.alert.id,
        userId: 'usr_100',
        latitude: 95,
        longitude: 190,
      });
    });
  });
});
