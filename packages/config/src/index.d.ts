export declare const ENV_DEFAULTS: {
    readonly API_PORT: 3000;
    readonly WEB_PORT: 3001;
    readonly POSTGRES_PORT: 5432;
    readonly REDIS_PORT: 6379;
    readonly JWT_TTL_MINUTES: 15;
    readonly REFRESH_TOKEN_TTL_DAYS: 7;
    readonly EMERGENCY_LINK_TTL_MINUTES: 60;
    readonly GPS_INTERVAL_EMERGENCY_MS: 5000;
    readonly GPS_INTERVAL_PASSIVE_MS: 60000;
};
export declare function getEnvVariable(key: string, fallback?: string): string;
//# sourceMappingURL=index.d.ts.map