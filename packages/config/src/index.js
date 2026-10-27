export const ENV_DEFAULTS = {
    API_PORT: 3000,
    WEB_PORT: 3001,
    POSTGRES_PORT: 5432,
    REDIS_PORT: 6379,
    JWT_TTL_MINUTES: 15,
    REFRESH_TOKEN_TTL_DAYS: 7,
    EMERGENCY_LINK_TTL_MINUTES: 60,
    GPS_INTERVAL_EMERGENCY_MS: 5000,
    GPS_INTERVAL_PASSIVE_MS: 60000,
};
export function getEnvVariable(key, fallback) {
    const value = process.env[key] ?? fallback;
    if (value === undefined) {
        throw new Error(`[ConfigError] Required environment variable ${key} is not defined.`);
    }
    return value;
}
//# sourceMappingURL=index.js.map