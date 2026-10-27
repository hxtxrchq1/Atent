/**
 * System-wide thresholds, limits, and defaults.
 */
export const SYSTEM_LIMITS = {
  MAX_EMERGENCY_CONTACTS: 10,
  MIN_EMERGENCY_CONTACTS: 1,
  DEFAULT_EMERGENCY_LINK_TTL_MINUTES: 60,
  MAX_EMERGENCY_LINK_TTL_MINUTES: 1440, // 24 hours
  LOCATION_INTERVAL_ACTIVE_ALERT_MS: 5000, // 5 seconds during active alert
  LOCATION_INTERVAL_PASSIVE_MS: 60000, // 1 minute in standard mode
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
  MAX_COORDINATE_ACCURACY_METERS: 2000,
} as const;

/**
 * Honest platform limitation disclaimers (Rule 8).
 * In no circumstance does Atent guarantee third-party assistance or override Android OS limits.
 */
export const PLATFORM_DISCLAIMERS = {
  NO_GUARANTEE_OF_HELP:
    'Atent es una herramienta complementaria de comunicación y no garantiza la llegada de auxilio ni sustituye a los servicios de emergencia oficiales (911/112).',
  OS_LIMITS_ANDROID:
    'El sistema operativo Android puede suspender tareas en segundo plano por políticas de ahorro de batería (Doze mode) o silenciar alertas según el modo No Molestar (DND).',
  NETWORK_DEPENDENCY:
    'La transmisión de alertas y geolocalización depende de la cobertura móvil y disponibilidad de datos móviles o Wi-Fi.',
} as const;

/**
 * Privacy protection mask tokens (Rule 9).
 */
export const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'accessToken',
  'refreshToken',
  'phoneNumber',
  'phone_number',
  'latitude',
  'longitude',
] as const;
