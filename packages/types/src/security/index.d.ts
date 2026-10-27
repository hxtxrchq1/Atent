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
//# sourceMappingURL=index.d.ts.map