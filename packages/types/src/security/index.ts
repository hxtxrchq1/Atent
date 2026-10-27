export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: 'USER' | 'ADMIN';
  sessionId: string;
  iat: number;
  exp: number;
}

export interface AuthSession {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  deviceInfo?: string;
  ipAddress?: string;
  createdAt: number;
  expiresAt: number;
  revokedAt?: number | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface EmergencyAccessSession {
  token: string;
  alertId: string;
  userId: string;
  expiresAt: string;
  revokedAt?: string | null;
  scope: 'EMERGENCY_VIEW' | 'CHECKIN_VIEW';
}

export interface SanitizedAuditLog {
  eventId: string;
  timestamp: string;
  action: string;
  actorType: 'USER' | 'SYSTEM' | 'EXTERNAL_SERVICE';
  actorIdMasked: string;
  status: 'SUCCESS' | 'FAILURE' | 'RATE_LIMITED';
  metadataMasked: Record<string, unknown>;
}

