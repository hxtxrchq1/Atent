/**
 * GeoPoint represents geographical coordinates captured during tracking or alert sessions.
 */
export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy?: number; // Accuracy radius in meters
  altitude?: number | null;
  speed?: number | null; // Speed in m/s
  heading?: number | null; // Compass heading in degrees (0-360)
  timestamp: number; // UTC Unix timestamp in milliseconds
}

/**
 * Lifecycle states of a safety alert session.
 */
export type AlertStatus =
  | 'PENDING'
  | 'TRIGGERED'
  | 'ACTIVE'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'FALSE_ALARM';

/**
 * Triggers that can initiate an alert event.
 */
export type AlertTriggerSource =
  | 'MANUAL_BUTTON'
  | 'HARDWARE_KEY'
  | 'FALL_DETECTION'
  | 'CHECKIN_TIMEOUT'
  | 'WEB_PORTAL';

/**
 * Relationship of an emergency contact to the user.
 */
export type ContactRelationship =
  | 'FAMILY'
  | 'FRIEND'
  | 'PARTNER'
  | 'COLLEAGUE'
  | 'GUARDIAN'
  | 'NEIGHBOR'
  | 'OTHER';

/**
 * Emergency contact entity structure.
 */
export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phoneNumber: string;
  relationship: ContactRelationship;
  priorityOrder: number;
  isNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Temporary high-entropy token used for web-based emergency viewing links.
 */
export interface EmergencyAccessSession {
  token: string;
  alertId: string;
  userId: string;
  expiresAt: string; // ISO 8601 string
  revokedAt?: string | null;
  scope: 'EMERGENCY_VIEW' | 'CHECKIN_VIEW';
}

/**
 * Audit log entry structure stripped of sensitive personal data (Rule 9).
 */
export interface SanitizedAuditLog {
  eventId: string;
  timestamp: string;
  action: string;
  actorType: 'USER' | 'SYSTEM' | 'EXTERNAL_SERVICE';
  actorIdMasked: string;
  status: 'SUCCESS' | 'FAILURE' | 'RATE_LIMITED';
  metadataMasked: Record<string, unknown>;
}
