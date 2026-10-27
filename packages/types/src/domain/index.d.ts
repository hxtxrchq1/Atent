export type AlertStatus = 'PENDING' | 'TRIGGERED' | 'ACTIVE' | 'RESOLVED' | 'CANCELLED' | 'FALSE_ALARM';
export type AlertTriggerSource = 'MANUAL_BUTTON' | 'HARDWARE_KEY' | 'FALL_DETECTION' | 'CHECKIN_TIMEOUT' | 'WEB_PORTAL';
export type ContactRelationship = 'FAMILY' | 'FRIEND' | 'PARTNER' | 'COLLEAGUE' | 'GUARDIAN' | 'NEIGHBOR' | 'OTHER';
export interface User {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    createdAt: string;
    updatedAt: string;
}
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
export interface AlertSession {
    id: string;
    userId: string;
    status: AlertStatus;
    triggerSource: AlertTriggerSource;
    startedAt: string;
    resolvedAt?: string | null;
    resolvedReason?: string | null;
}
//# sourceMappingURL=index.d.ts.map