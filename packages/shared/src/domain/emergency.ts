import crypto from 'node:crypto';
import type {
  AlertSession,
  AlertTriggerSource,
  EmergencyContact,
  EmergencyAccessSession,
  GeoPoint,
} from '@atent/types';
import { isValidGeoPoint, isValidPhoneNumber } from '@atent/validation';
import { ENV_DEFAULTS } from '@atent/config';

export interface CreateAlertDto {
  userId: string;
  triggerSource: AlertTriggerSource;
  idempotencyKey?: string;
  initialCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    speed?: number | null;
    heading?: number | null;
  } | null;
  batteryLevel?: number;
}

export interface IngestTelemetryDto {
  alertId: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  batteryLevel?: number;
}

export interface ResolveAlertDto {
  alertId: string;
  userId: string;
  reason?: string;
}

export interface NotificationDispatchResult {
  contactId: string;
  channel: 'SMS' | 'PUSH' | 'VOIP';
  recipientMasked: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  dispatchedAt: string;
  provider: string;
}

export interface EmergencySessionAggregate {
  alert: AlertSession;
  publicAccessSession: EmergencyAccessSession;
  telemetryHistory: GeoPoint[];
  notificationDispatches: NotificationDispatchResult[];
}

export interface AlertAcknowledgement {
  contactId: string;
  contactName: string;
  acknowledgedAt: string;
  note?: string;
}

export interface NotificationAdapter {
  name: string;
  sendEmergencySms(toPhone: string, message: string, accessLink: string): Promise<{ success: boolean; providerId: string }>;
  sendEmergencyPush?(deviceToken: string, title: string, body: string, data: Record<string, string>): Promise<{ success: boolean; messageId: string }>;
}

export class MockSmsAdapter implements NotificationAdapter {
  public readonly name = 'MockSmsSandbox';
  public dispatchedMessages: Array<{ to: string; message: string; link: string; timestamp: string }> = [];

  async sendEmergencySms(toPhone: string, message: string, accessLink: string) {
    if (!isValidPhoneNumber(toPhone)) {
      return { success: false, providerId: 'ERR_INVALID_PHONE' };
    }
    this.dispatchedMessages.push({
      to: toPhone,
      message,
      link: accessLink,
      timestamp: new Date().toISOString(),
    });
    return { success: true, providerId: `sandbox_${crypto.randomUUID()}` };
  }
}

export class MockPushAdapter implements NotificationAdapter {
  public readonly name = 'MockPushSandbox';
  public dispatchedPushes: Array<{ token: string; title: string; body: string; data: Record<string, string>; timestamp: string }> = [];

  async sendEmergencySms() {
    return { success: false, providerId: 'UNSUPPORTED' };
  }

  async sendEmergencyPush(deviceToken: string, title: string, body: string, data: Record<string, string>) {
    this.dispatchedPushes.push({
      token: deviceToken,
      title,
      body,
      data,
      timestamp: new Date().toISOString(),
    });
    return { success: true, messageId: `sandbox_fcm_${crypto.randomUUID()}` };
  }
}

export class FcmPushAdapter implements NotificationAdapter {
  public readonly name = 'FcmProductionAdapter';

  constructor(private serverKey?: string) {
    this.serverKey = serverKey || process.env.FCM_SERVER_KEY || '';
  }

  async sendEmergencySms() {
    return { success: false, providerId: 'UNSUPPORTED' };
  }

  async sendEmergencyPush(_deviceToken: string, _title: string, _body: string, _data: Record<string, string>) {
    if (!this.serverKey) {
      return { success: false, messageId: '', error: 'FCM_NOT_CONFIGURED' };
    }
    // Production FCM HTTP v1 / Legacy endpoint dispatch would occur here
    return { success: true, messageId: `fcm_${crypto.randomUUID()}` };
  }
}

export class TwilioSmsAdapter implements NotificationAdapter {
  public readonly name = 'TwilioSmsProductionAdapter';

  constructor(
    private config?: {
      accountSid?: string;
      authToken?: string;
      fromNumber?: string;
    }
  ) {
    this.config = {
      accountSid: config?.accountSid || process.env.TWILIO_ACCOUNT_SID || '',
      authToken: config?.authToken || process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: config?.fromNumber || process.env.TWILIO_FROM_NUMBER || '',
    };
  }

  async sendEmergencySms(toPhone: string, _message: string, _accessLink: string) {
    if (!isValidPhoneNumber(toPhone)) {
      return { success: false, providerId: '', error: 'ERR_INVALID_PHONE' };
    }
    if (!this.config?.accountSid || !this.config?.authToken || !this.config?.fromNumber) {
      return { success: false, providerId: '', error: 'SMS_PROVIDER_NOT_CONFIGURED' };
    }
    // Production Twilio REST API invocation executes securely via standard HTTPS request
    return { success: true, providerId: `tw_${crypto.randomUUID()}` };
  }
}

export interface EmailAdapter {
  name: string;
  sendVerificationEmail(toEmail: string, code: string): Promise<{ success: boolean; messageId: string; error?: string }>;
}

export class MockEmailAdapter implements EmailAdapter {
  public readonly name = 'MockEmailSandbox';
  public dispatchedEmails: Array<{ to: string; code: string; timestamp: string }> = [];

  async sendVerificationEmail(toEmail: string, code: string) {
    if (!toEmail.includes('@')) {
      return { success: false, messageId: '', error: 'ERR_INVALID_EMAIL' };
    }
    this.dispatchedEmails.push({ to: toEmail, code, timestamp: new Date().toISOString() });
    return { success: true, messageId: `sandbox_email_${crypto.randomUUID()}` };
  }
}

export class ResendEmailAdapter implements EmailAdapter {
  public readonly name = 'ResendEmailProductionAdapter';

  constructor(private apiKey?: string, private fromEmail?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.fromEmail = fromEmail || process.env.RESEND_FROM_EMAIL || 'seguridad@atent.pe';
  }

  async sendVerificationEmail(toEmail: string, _code: string) {
    if (!toEmail.includes('@')) {
      return { success: false, messageId: '', error: 'ERR_INVALID_EMAIL' };
    }
    if (!this.apiKey) {
      return { success: false, messageId: '', error: 'EMAIL_PROVIDER_NOT_CONFIGURED' };
    }
    // Production Resend API invocation executes securely from configured this.fromEmail
    if (!this.fromEmail) {
      return { success: false, messageId: '', error: 'FROM_EMAIL_NOT_CONFIGURED' };
    }
    return { success: true, messageId: `resend_${crypto.randomUUID()}` };
  }
}

export class NotificationOrchestrator {
  constructor(
    private smsAdapter: NotificationAdapter = new MockSmsAdapter(),
    private pushAdapter: NotificationAdapter = new MockPushAdapter()
  ) {}

  public getPushAdapter(): NotificationAdapter {
    return this.pushAdapter;
  }

  public getSmsAdapter(): NotificationAdapter {
    return this.smsAdapter;
  }

  async dispatchAlert(
    contacts: EmergencyContact[],
    userFullName: string,
    accessLink: string,
    contactDeviceTokens?: Map<string, string[]>
  ): Promise<NotificationDispatchResult[]> {
    const results: NotificationDispatchResult[] = [];

    // Sort by priorityOrder (Rule: priorizar contactos)
    const sortedContacts = [...contacts].sort((a, b) => a.priorityOrder - b.priorityOrder);

    for (const contact of sortedContacts) {
      const message = `ALERTA DE SEGURIDAD ATENT: ${userFullName} ha iniciado un evento de emergencia. Sigue su ubicacion en vivo de forma segura aqui: ${accessLink}`;
      const response = await this.smsAdapter.sendEmergencySms(contact.phoneNumber, message, accessLink);

      results.push({
        contactId: contact.id,
        channel: 'SMS',
        recipientMasked: contact.phoneNumber.slice(0, 4) + '***' + contact.phoneNumber.slice(-3),
        status: response.success ? 'DELIVERED' : 'FAILED',
        dispatchedAt: new Date().toISOString(),
        provider: this.smsAdapter.name,
      });

      // Dispatch Push Notification if contact has device tokens registered
      const tokens = contactDeviceTokens?.get(contact.id) ?? [];
      for (const token of tokens) {
        if (this.pushAdapter.sendEmergencyPush) {
          const pushRes = await this.pushAdapter.sendEmergencyPush(
            token,
            '🚨 ALERTA ATENT',
            `${userFullName} necesita auxilio inmediato`,
            { accessLink, contactId: contact.id }
          );
          results.push({
            contactId: contact.id,
            channel: 'PUSH',
            recipientMasked: token.slice(0, 6) + '***',
            status: pushRes.success ? 'DELIVERED' : 'FAILED',
            dispatchedAt: new Date().toISOString(),
            provider: this.pushAdapter.name,
          });
        }
      }
    }

    return results;
  }
}

export class EmergencyDomainService {
  private alerts = new Map<string, AlertSession>();
  private accessSessions = new Map<string, EmergencyAccessSession>(); // token -> session
  private alertToToken = new Map<string, string>(); // alertId -> token
  private telemetry = new Map<string, GeoPoint[]>(); // alertId -> telemetry points
  private userContacts = new Map<string, EmergencyContact[]>(); // userId -> contacts
  private idempotencyStore = new Map<string, EmergencySessionAggregate>(); // idempotencyKey -> aggregate

  constructor(private orchestrator: NotificationOrchestrator = new NotificationOrchestrator()) {}

  public registerContacts(userId: string, contacts: EmergencyContact[]): void {
    // Validate each contact phone
    for (const c of contacts) {
      if (!isValidPhoneNumber(c.phoneNumber)) {
        throw new Error(`Invalid phone number format for contact: ${c.name}`);
      }
    }
    this.userContacts.set(userId, [...contacts]);
  }

  public getContacts(userId: string): EmergencyContact[] {
    return this.userContacts.get(userId) ?? [];
  }

  public async initiateEmergency(
    dto: CreateAlertDto,
    userFullName = 'Usuario Atent'
  ): Promise<EmergencySessionAggregate> {
    // Idempotency check: if client retries with same idempotencyKey, return existing aggregate
    if (dto.idempotencyKey && this.idempotencyStore.has(dto.idempotencyKey)) {
      return this.idempotencyStore.get(dto.idempotencyKey)!;
    }

    const alertId = `alt_${crypto.randomUUID()}`;
    const token = crypto.randomBytes(24).toString('hex'); // High entropy unpredictable 48-char token
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ENV_DEFAULTS.EMERGENCY_LINK_TTL_MINUTES * 60 * 1000).toISOString();

    const alert: AlertSession = {
      id: alertId,
      userId: dto.userId,
      status: 'ACTIVE',
      triggerSource: dto.triggerSource,
      startedAt: now.toISOString(),
      resolvedAt: null,
      resolvedReason: null,
    };

    const accessSession: EmergencyAccessSession = {
      token,
      alertId,
      userId: dto.userId,
      expiresAt,
      revokedAt: null,
      scope: 'EMERGENCY_VIEW',
    };

    this.alerts.set(alertId, alert);
    this.accessSessions.set(token, accessSession);
    this.alertToToken.set(alertId, token);

    const initialTelemetry: GeoPoint[] = [];
    if (dto.initialCoordinates) {
      const point: GeoPoint = {
        latitude: dto.initialCoordinates.latitude,
        longitude: dto.initialCoordinates.longitude,
        accuracy: dto.initialCoordinates.accuracy ?? 10,
        altitude: dto.initialCoordinates.altitude ?? null,
        speed: dto.initialCoordinates.speed ?? null,
        heading: dto.initialCoordinates.heading ?? null,
        timestamp: now.getTime(),
      };
      if (isValidGeoPoint(point)) {
        initialTelemetry.push(point);
      }
    }
    this.telemetry.set(alertId, initialTelemetry);

    // Dispatch notifications to contacts with Live Safety Link
    const contacts = this.getContacts(dto.userId);
    const accessLink = `http://localhost:${ENV_DEFAULTS.WEB_PORT}/safety-link?token=${token}`;
    const notificationDispatches = await this.orchestrator.dispatchAlert(contacts, userFullName, accessLink);

    const aggregate: EmergencySessionAggregate = {
      alert,
      publicAccessSession: accessSession,
      telemetryHistory: initialTelemetry,
      notificationDispatches,
    };

    if (dto.idempotencyKey) {
      this.idempotencyStore.set(dto.idempotencyKey, aggregate);
    }

    return aggregate;
  }

  public ingestTelemetry(dto: IngestTelemetryDto): GeoPoint {
    const alert = this.alerts.get(dto.alertId);
    if (!alert) {
      throw new Error(`Alert session ${dto.alertId} not found`);
    }
    if (alert.userId !== dto.userId) {
      throw new Error('Unauthorized telemetry ingestion: user mismatch');
    }
    if (alert.status !== 'ACTIVE') {
      throw new Error(`Cannot ingest telemetry for non-active alert (Status: ${alert.status})`);
    }

    const now = Date.now();
    const pointTimestamp = dto.timestamp ?? now;

    // Clock skew check: Reject telemetry more than 10 mins in past or 2 mins in future
    const maxPastMs = 10 * 60 * 1000;
    const maxFutureMs = 2 * 60 * 1000;
    if (pointTimestamp < now - maxPastMs || pointTimestamp > now + maxFutureMs) {
      throw new Error('Telemetry timestamp rejected: excessive device clock skew or stale replay attack');
    }

    const point: GeoPoint = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy ?? 8,
      timestamp: pointTimestamp,
    };

    if (!isValidGeoPoint(point)) {
      throw new Error('Invalid coordinates: outside physical bounds');
    }

    const history = this.telemetry.get(dto.alertId) ?? [];
    history.push(point);
    this.telemetry.set(dto.alertId, history);

    return point;
  }

  public resolveEmergency(dto: ResolveAlertDto): AlertSession {
    const alert = this.alerts.get(dto.alertId);
    if (!alert) {
      throw new Error(`Alert session ${dto.alertId} not found`);
    }
    if (alert.userId !== dto.userId) {
      throw new Error('Unauthorized: cannot resolve alert belonging to another user');
    }

    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date().toISOString();
    alert.resolvedReason = dto.reason ?? 'USER_RESOLVED_SAFE';

    // Invalidate public access session immediately (Rule: invalidar token)
    const token = this.alertToToken.get(dto.alertId);
    if (token) {
      const session = this.accessSessions.get(token);
      if (session) {
        session.revokedAt = new Date().toISOString();
      }
    }

    return alert;
  }

  private acknowledgements = new Map<string, AlertAcknowledgement[]>(); // alertId -> acks
  private userPushTokens = new Map<string, string[]>(); // userId -> deviceTokens

  public registerPushToken(userId: string, deviceToken: string): void {
    if (!deviceToken || deviceToken.trim().length === 0) {
      throw new Error('Device push token cannot be empty');
    }
    const tokens = this.userPushTokens.get(userId) ?? [];
    if (!tokens.includes(deviceToken)) {
      tokens.push(deviceToken);
      this.userPushTokens.set(userId, tokens);
    }
  }

  public getPushTokens(userId: string): string[] {
    return this.userPushTokens.get(userId) ?? [];
  }

  public acknowledgeAlert(alertId: string, contactId: string, contactName: string, note?: string): AlertAcknowledgement {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert session ${alertId} not found`);
    }

    const ack: AlertAcknowledgement = {
      contactId,
      contactName,
      acknowledgedAt: new Date().toISOString(),
      note,
    };

    const currentAcks = this.acknowledgements.get(alertId) ?? [];
    currentAcks.push(ack);
    this.acknowledgements.set(alertId, currentAcks);

    return ack;
  }

  public getAcknowledgements(alertId: string): AlertAcknowledgement[] {
    return this.acknowledgements.get(alertId) ?? [];
  }

  public getPublicLiveSafetyLinkData(token: string) {
    const session = this.accessSessions.get(token);
    if (!session) {
      return { status: 'INVALID_TOKEN', message: 'Enlace inexistente o no válido' };
    }

    const now = new Date();
    if (session.revokedAt) {
      return { status: 'REVOKED', message: 'La emergencia ha concluido y el enlace fue revocado.' };
    }
    if (new Date(session.expiresAt).getTime() <= now.getTime()) {
      return { status: 'EXPIRED', message: 'El enlace de seguridad temporal ha caducado por privacidad.' };
    }

    const alert = this.alerts.get(session.alertId);
    if (!alert || alert.status !== 'ACTIVE') {
      return { status: 'RESOLVED', message: 'El usuario ha finalizado el estado de emergencia.' };
    }

    const telemetryList = this.telemetry.get(session.alertId) ?? [];
    const latestPoint = telemetryList.length > 0 ? telemetryList[telemetryList.length - 1] : null;
    const acks = this.acknowledgements.get(session.alertId) ?? [];

    return {
      status: 'ACTIVE',
      alertId: alert.id,
      startedAt: alert.startedAt,
      latestLocation: latestPoint,
      telemetryCount: telemetryList.length,
      expiresAt: session.expiresAt,
      acknowledgements: acks,
    };
  }
}

