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
  SUPABASE_URL: 'https://gxkpiqmuhvpsbmooieod.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_3CR_6m7aMGMjDWH_6C_o8g_kOCqNAxv',
} as const;

export function getEnvVariable(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`[ConfigError] Required environment variable ${key} is not defined.`);
  }
  return value;
}
