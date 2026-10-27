/**
 * System-wide thresholds, limits, and defaults.
 */
export declare const SYSTEM_LIMITS: {
    readonly MAX_EMERGENCY_CONTACTS: 10;
    readonly MIN_EMERGENCY_CONTACTS: 1;
    readonly DEFAULT_EMERGENCY_LINK_TTL_MINUTES: 60;
    readonly MAX_EMERGENCY_LINK_TTL_MINUTES: 1440;
    readonly LOCATION_INTERVAL_ACTIVE_ALERT_MS: 5000;
    readonly LOCATION_INTERVAL_PASSIVE_MS: 60000;
    readonly MIN_LATITUDE: -90;
    readonly MAX_LATITUDE: 90;
    readonly MIN_LONGITUDE: -180;
    readonly MAX_LONGITUDE: 180;
    readonly MAX_COORDINATE_ACCURACY_METERS: 2000;
};
/**
 * Honest platform limitation disclaimers (Rule 8).
 * In no circumstance does Atent guarantee third-party assistance or override Android OS limits.
 */
export declare const PLATFORM_DISCLAIMERS: {
    readonly NO_GUARANTEE_OF_HELP: "Atent es una herramienta complementaria de comunicación y no garantiza la llegada de auxilio ni sustituye a los servicios de emergencia oficiales (911/112).";
    readonly OS_LIMITS_ANDROID: "El sistema operativo Android puede suspender tareas en segundo plano por políticas de ahorro de batería (Doze mode) o silenciar alertas según el modo No Molestar (DND).";
    readonly NETWORK_DEPENDENCY: "La transmisión de alertas y geolocalización depende de la cobertura móvil y disponibilidad de datos móviles o Wi-Fi.";
};
/**
 * Privacy protection mask tokens (Rule 9).
 */
export declare const SENSITIVE_KEYS: readonly ["password", "token", "secret", "authorization", "apikey", "api_key", "accessToken", "refreshToken", "phoneNumber", "phone_number", "latitude", "longitude"];
//# sourceMappingURL=index.d.ts.map