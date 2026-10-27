import pg from 'pg';
import type { EmergencyContact, AlertSession, GeoPoint, ContactRelationship } from '@atent/types';
import type { StoredUserRecord } from '../domain/auth.js';

const { Pool } = pg;

export interface IUserRepository {
  findByEmail(email: string): Promise<StoredUserRecord | null>;
  findById(id: string): Promise<StoredUserRecord | null>;
  save(user: StoredUserRecord): Promise<void>;
}

export interface IEmergencyRepository {
  saveAlert(alert: AlertSession): Promise<void>;
  getAlertById(alertId: string): Promise<AlertSession | null>;
  updateAlertStatus(alertId: string, status: string, resolvedAt: string, resolvedReason: string): Promise<void>;
  saveTelemetryPoint(alertId: string, point: GeoPoint): Promise<void>;
  getTelemetryHistory(alertId: string): Promise<GeoPoint[]>;
  saveContacts(userId: string, contacts: EmergencyContact[]): Promise<void>;
  getContacts(userId: string): Promise<EmergencyContact[]>;
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: pg.Pool) {}

  async findByEmail(email: string): Promise<StoredUserRecord | null> {
    const res = await this.pool.query(
      'SELECT id, email, full_name, phone_number, password_hash, password_salt, created_at, updated_at FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      phoneNumber: r.phone_number,
      passwordHash: r.password_hash ?? '',
      passwordSalt: r.password_salt ?? '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  async findById(id: string): Promise<StoredUserRecord | null> {
    const res = await this.pool.query(
      'SELECT id, email, full_name, phone_number, password_hash, password_salt, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      email: r.email,
      fullName: r.full_name,
      phoneNumber: r.phone_number,
      passwordHash: r.password_hash ?? '',
      passwordSalt: r.password_salt ?? '',
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }

  async save(user: StoredUserRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO users (id, email, full_name, phone_number, password_hash, password_salt, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         phone_number = EXCLUDED.phone_number,
         password_hash = EXCLUDED.password_hash,
         password_salt = EXCLUDED.password_salt,
         updated_at = EXCLUDED.updated_at`,
      [
        user.id,
        user.email.toLowerCase().trim(),
        user.fullName,
        user.phoneNumber,
        user.passwordHash,
        user.passwordSalt,
        user.createdAt,
        user.updatedAt,
      ]
    );
  }
}

export class PostgresEmergencyRepository implements IEmergencyRepository {
  constructor(private pool: pg.Pool) {}

  async saveAlert(alert: AlertSession): Promise<void> {
    await this.pool.query(
      `INSERT INTO alert_sessions (id, user_id, status, trigger_source, started_at, resolved_at, resolved_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         resolved_at = EXCLUDED.resolved_at,
         resolved_reason = EXCLUDED.resolved_reason`,
      [
        alert.id,
        alert.userId,
        alert.status,
        alert.triggerSource,
        alert.startedAt,
        alert.resolvedAt ?? null,
        alert.resolvedReason ?? null,
      ]
    );
  }

  async getAlertById(alertId: string): Promise<AlertSession | null> {
    const res = await this.pool.query(
      'SELECT id, user_id, status, trigger_source, started_at, resolved_at, resolved_reason FROM alert_sessions WHERE id = $1 LIMIT 1',
      [alertId]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      status: r.status,
      triggerSource: r.trigger_source,
      startedAt: r.started_at ? new Date(r.started_at).toISOString() : new Date().toISOString(),
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
      resolvedReason: r.resolved_reason ?? null,
    };
  }

  async updateAlertStatus(alertId: string, status: string, resolvedAt: string, resolvedReason: string): Promise<void> {
    await this.pool.query(
      'UPDATE alert_sessions SET status = $1, resolved_at = $2, resolved_reason = $3 WHERE id = $4',
      [status, resolvedAt, resolvedReason, alertId]
    );
  }

  async saveTelemetryPoint(alertId: string, point: GeoPoint): Promise<void> {
    await this.pool.query(
      `INSERT INTO telemetry_points (alert_id, latitude, longitude, accuracy_meters, recorded_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        alertId,
        point.latitude,
        point.longitude,
        point.accuracy ?? 10,
        new Date(point.timestamp ?? Date.now()).toISOString(),
      ]
    );
  }

  async getTelemetryHistory(alertId: string): Promise<GeoPoint[]> {
    const res = await this.pool.query(
      'SELECT latitude, longitude, accuracy_meters, recorded_at FROM telemetry_points WHERE alert_id = $1 ORDER BY recorded_at ASC',
      [alertId]
    );
    return res.rows.map((r: any) => ({
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      accuracy: Number(r.accuracy_meters),
      timestamp: new Date(r.recorded_at).getTime(),
    }));
  }

  async saveContacts(userId: string, contacts: EmergencyContact[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM emergency_contacts WHERE user_id = $1', [userId]);
      for (const c of contacts) {
        await client.query(
          `INSERT INTO emergency_contacts (id, user_id, name, phone_number, relationship, priority_order, is_notified)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [c.id, userId, c.name, c.phoneNumber, c.relationship, c.priorityOrder, c.isNotified ?? false]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getContacts(userId: string): Promise<EmergencyContact[]> {
    const res = await this.pool.query(
      'SELECT id, user_id, name, phone_number, relationship, priority_order, is_notified, created_at, updated_at FROM emergency_contacts WHERE user_id = $1 ORDER BY priority_order ASC',
      [userId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      phoneNumber: r.phone_number,
      relationship: r.relationship as ContactRelationship,
      priorityOrder: Number(r.priority_order),
      isNotified: Boolean(r.is_notified),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    }));
  }
}

export function createPostgresPool(connectionString?: string): pg.Pool {
  return new Pool({
    connectionString:
      connectionString ||
      process.env.DATABASE_URL ||
      'postgresql://postgres@localhost:5432/atent_dev',
    max: 10,
    idleTimeoutMillis: 30000,
  });
}
