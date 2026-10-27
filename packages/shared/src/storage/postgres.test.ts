import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPostgresPool,
  PostgresUserRepository,
  PostgresEmergencyRepository,
} from './postgres.js';
import type { AlertSession, EmergencyContact, GeoPoint } from '@atent/types';
import type { StoredUserRecord } from '../domain/auth.js';

describe('PostgreSQL Real Database Integration Suite', () => {
  let pool: any;
  let userRepo: PostgresUserRepository;
  let emergencyRepo: PostgresEmergencyRepository;
  let dbAvailable = false;

  before(async () => {
    try {
      pool = createPostgresPool();
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      dbAvailable = true;
      userRepo = new PostgresUserRepository(pool);
      emergencyRepo = new PostgresEmergencyRepository(pool);
    } catch (err) {
      console.warn('[Postgres Integration] Local database not reachable, skipping live DB tests:', (err as any).message);
    }
  });

  after(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('persists and retrieves user record with scrypt hash and salt', async () => {
    if (!dbAvailable) return;

    const testId = `usr_test_${Date.now()}`;
    const testUser: StoredUserRecord = {
      id: testId,
      email: `test_${Date.now()}@atent.pe`,
      fullName: 'Usuario Prueba Postgres',
      phoneNumber: '+51987654321',
      passwordHash: 'deadbeefcafe1234',
      passwordSalt: 'abcdef1234567890',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userRepo.save(testUser);
    const retrieved = await userRepo.findById(testId);
    assert.notEqual(retrieved, null);
    assert.equal(retrieved?.email, testUser.email);
    assert.equal(retrieved?.passwordHash, testUser.passwordHash);
    assert.equal(retrieved?.passwordSalt, testUser.passwordSalt);

    const byEmail = await userRepo.findByEmail(testUser.email);
    assert.equal(byEmail?.id, testId);
  });

  it('persists alert session, appends telemetry points, and updates resolved status', async () => {
    if (!dbAvailable) return;

    // First ensure user exists to satisfy foreign key constraint
    const ownerId = `usr_alert_owner_${Date.now()}`;
    const owner: StoredUserRecord = {
      id: ownerId,
      email: `owner_${Date.now()}@atent.pe`,
      fullName: 'Dueño de Alerta',
      phoneNumber: '+51955443322',
      passwordHash: 'hash',
      passwordSalt: 'salt',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await userRepo.save(owner);

    const alertId = `alt_test_${Date.now()}`;
    const alert: AlertSession = {
      id: alertId,
      userId: ownerId,
      status: 'ACTIVE',
      triggerSource: 'MANUAL_BUTTON',
      startedAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedReason: null,
    };

    await emergencyRepo.saveAlert(alert);
    const fetched = await emergencyRepo.getAlertById(alertId);
    assert.equal(fetched?.id, alertId);
    assert.equal(fetched?.status, 'ACTIVE');

    // Ingest telemetry points
    const p1: GeoPoint = { latitude: -12.046374, longitude: -77.042793, accuracy: 8, timestamp: Date.now() };
    const p2: GeoPoint = { latitude: -12.047000, longitude: -77.043000, accuracy: 5, timestamp: Date.now() + 5000 };

    await emergencyRepo.saveTelemetryPoint(alertId, p1);
    await emergencyRepo.saveTelemetryPoint(alertId, p2);

    const history = await emergencyRepo.getTelemetryHistory(alertId);
    assert.equal(history.length, 2);
    assert.equal(history[0]?.latitude, -12.046374);

    // Resolve alert
    const resolvedTime = new Date().toISOString();
    await emergencyRepo.updateAlertStatus(alertId, 'RESOLVED', resolvedTime, 'USER_SAFE');

    const updated = await emergencyRepo.getAlertById(alertId);
    assert.equal(updated?.status, 'RESOLVED');
    assert.equal(updated?.resolvedReason, 'USER_SAFE');
  });

  it('persists and retrieves emergency contacts transactionally', async () => {
    if (!dbAvailable) return;

    const userId = `usr_contacts_${Date.now()}`;
    const user: StoredUserRecord = {
      id: userId,
      email: `contacts_${Date.now()}@atent.pe`,
      fullName: 'Usuario Contactos',
      phoneNumber: '+51911223344',
      passwordHash: 'hash',
      passwordSalt: 'salt',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await userRepo.save(user);

    const now = new Date().toISOString();
    const contacts: EmergencyContact[] = [
      {
        id: `c1_${Date.now()}`,
        userId,
        name: 'Mamá',
        phoneNumber: '+51999111222',
        relationship: 'FAMILY',
        priorityOrder: 1,
        isNotified: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `c2_${Date.now()}`,
        userId,
        name: 'Hermano',
        phoneNumber: '+51999333444',
        relationship: 'FAMILY',
        priorityOrder: 2,
        isNotified: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await emergencyRepo.saveContacts(userId, contacts);
    const fetched = await emergencyRepo.getContacts(userId);
    assert.equal(fetched.length, 2);
    assert.equal(fetched[0]?.name, 'Mamá');
    assert.equal(fetched[1]?.name, 'Hermano');
  });
});
