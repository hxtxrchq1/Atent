import http from 'node:http';
import { EmergencyDomainService, TripDomainService, AuthService } from '@atent/shared';
export interface HealthCheckResponse {
    status: 'ok' | 'degraded';
    timestamp: string;
    service: 'atent-api';
    version: string;
    uptime: number;
}
export declare class SimpleRateLimiter {
    private readonly windowMs;
    private readonly maxRequests;
    private requests;
    constructor(windowMs?: number, // 1 minute
    maxRequests?: number);
    isAllowed(clientKey: string, customLimit?: number): boolean;
}
export declare function createApiServer(emergencyService?: EmergencyDomainService, tripService?: TripDomainService, authService?: AuthService, rateLimiter?: SimpleRateLimiter): http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
//# sourceMappingURL=main.d.ts.map