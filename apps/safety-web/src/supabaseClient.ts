import { createClient } from '@supabase/supabase-js';
import { ENV_DEFAULTS } from '@atent/config';

export const SUPABASE_URL = ENV_DEFAULTS.SUPABASE_URL || 'https://ngsexidmirortoccbatd.supabase.co';
export const SUPABASE_ANON_KEY = ENV_DEFAULTS.SUPABASE_ANON_KEY || 'sb_publishable_vL9-w52Kq3HOukXhcbIC_Q_xdWzRCqX';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: window.localStorage,
  },
});

/**
 * Normaliza número telefónico a formato internacional canónico E.164
 * Ejemplo: +51 914754513 -> +51914754513
 */
export function normalizePhoneNumber(dialCode: string, nationalNumber: string): string {
  const cleanDial = dialCode.replace(/[^\d+]/g, '');
  const cleanNational = nationalNumber.replace(/\D/g, '');
  return `${cleanDial}${cleanNational}`;
}

/**
 * Deriva un identificador seguro y canónico de correo para Supabase Auth a partir del teléfono normalizado
 * Garantiza compatibilidad universal sin requerir envío de OTP por SMS ni violar unicidad.
 * Ejemplo: +51914754513 -> phone.51914754513@auth.atent.pe
 */
export function deriveAuthEmailFromPhone(normalizedPhone: string): string {
  const digits = normalizedPhone.replace(/\D/g, '');
  return `phone.${digits}@auth.atent.pe`;
}
