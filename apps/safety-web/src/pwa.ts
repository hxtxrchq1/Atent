import { supabase } from './supabaseClient';

export type ClientPlatform = 'android-webview' | 'ios-pwa' | 'ios-safari' | 'pwa' | 'web';

export function getClientPlatform(): ClientPlatform {
  const ua = navigator.userAgent;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (/Android/i.test(ua) && Boolean(window.AndroidBridge)) return 'android-webview';
  if (/iPhone|iPad|iPod/i.test(ua)) return isStandalone ? 'ios-pwa' : 'ios-safari';
  return isStandalone ? 'pwa' : 'web';
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function getPushSupport(): { supported: boolean; reason?: string } {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return { supported: false, reason: 'Este navegador no admite Web Push.' };
  }
  if (Notification.permission === 'denied') return { supported: false, reason: 'Las notificaciones están bloqueadas para Atent. Actívalas en Ajustes del dispositivo.' };
  if (getClientPlatform() === 'ios-safari') return { supported: false, reason: 'En iPhone, instala Atent desde Safari con «Añadir a pantalla de inicio» para activar notificaciones.' };
  const iosVersion = /OS (\d+)[_.]/.exec(navigator.userAgent);
  if (getClientPlatform() === 'ios-pwa' && (!iosVersion || Number(iosVersion[1]) < 16)) {
    return { supported: false, reason: 'Web Push en iPhone requiere iOS 16.4 o posterior y Atent instalada en la pantalla de inicio.' };
  }
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) return { supported: false, reason: 'Las notificaciones Push aún no están configuradas en el servidor.' };
  return { supported: true };
}

export async function enableWebPush(userId: string, sessionToken: string): Promise<void> {
  const support = getPushSupport();
  if (!support.supported) throw new Error(support.reason);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('No se concedió permiso para las notificaciones. Puedes cambiarlo en Ajustes del dispositivo.');

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  });
  const { error } = await supabase.rpc('register_web_push_subscription_session', {
    p_session_token: sessionToken,
    p_endpoint: subscription.endpoint,
    p_subscription: subscription.toJSON(),
    p_platform: getClientPlatform(),
  });
  if (error) {
    if (!existingSubscription) await subscription.unsubscribe().catch(() => false);
    throw new Error(error.message.includes('Web session expired')
      ? 'Tu sesión de Atent venció. Cierra sesión e inicia nuevamente para activar notificaciones.'
      : `No fue posible registrar las notificaciones en tu cuenta: ${error.message}`);
  }
  localStorage.setItem(`atent_web_push_enabled_${userId}`, 'true');
}

export async function getWebPushSubscriptionState(): Promise<'enabled' | 'not-enabled' | 'unsupported'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    return await registration?.pushManager.getSubscription() ? 'enabled' : 'not-enabled';
  } catch {
    return 'not-enabled';
  }
}

export async function sendWebPushTest(sessionToken: string, onStatus?: (status: 'queued' | 'sent' | 'failed') => void): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) throw new Error('Este iPhone todavía no tiene una suscripción Push activa.');
  const { data, error } = await supabase.rpc('send_web_push_test_session', {
    p_session_token: sessionToken,
    p_endpoint: subscription.endpoint,
  });
  if (error) throw new Error(`No se pudo enviar la notificación de prueba: ${error.message}`);
  const requestId = Number(data?.request_id || 0);
  if (!requestId) throw new Error('El servidor no devolvió el identificador de la prueba.');
  onStatus?.('queued');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    const { data: status, error: statusError } = await supabase.rpc('get_web_push_test_status_session', {
      p_session_token: sessionToken,
      p_request_id: requestId,
    });
    if (statusError) throw new Error(`No se pudo verificar el resultado de Push: ${statusError.message}`);
    if (status?.status === 'sent') {
      onStatus?.('sent');
      return;
    }
    if (status?.status === 'failed') {
      onStatus?.('failed');
      if (status.http_status === 404 || status.http_status === 410) {
        await subscription.unsubscribe().catch(() => false);
        throw new Error('Apple ya no reconoce esta suscripción Push. Vuelve a permitir las notificaciones en Atent.');
      }
      throw new Error(`El servicio Push rechazó la prueba (HTTP ${status.http_status || 'desconocido'}).`);
    }
  }
  throw new Error('La solicitud se envió, pero no recibimos confirmación del servicio Push en 12 segundos.');
}

export async function disableWebPush(sessionToken: string): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const { error } = await supabase.rpc('revoke_web_push_subscription_session', {
    p_session_token: sessionToken,
    p_endpoint: subscription.endpoint,
  });
  if (error) throw new Error(error.message.includes('Web session expired')
    ? 'Tu sesión de Atent venció. Cierra sesión e inicia nuevamente para cambiar notificaciones.'
    : `No se pudo revocar el registro de notificaciones: ${error.message}`);
  await subscription.unsubscribe();
}

let emergencyAudioContext: AudioContext | null = null;
const SOUND_PREFERENCE = 'atent_emergency_sound_enabled';
const VIBRATION_PREFERENCE = 'atent_emergency_vibration_enabled';

function getEmergencyAudioContext(): AudioContext | null {
  if (!('AudioContext' in window)) return null;
  emergencyAudioContext ??= new AudioContext();
  return emergencyAudioContext;
}

export function isEmergencySoundEnabled(): boolean {
  const savedPreference = localStorage.getItem(SOUND_PREFERENCE);
  return savedPreference === 'true' || (savedPreference === null && getClientPlatform().startsWith('ios-'));
}

export async function setEmergencySoundEnabled(enabled: boolean): Promise<void> {
  localStorage.setItem(SOUND_PREFERENCE, String(enabled));
  if (enabled) await playEmergencySound(true);
}

export function isEmergencyVibrationEnabled(): boolean {
  return localStorage.getItem(VIBRATION_PREFERENCE) !== 'false';
}

export function isEmergencyVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function setEmergencyVibrationEnabled(enabled: boolean): void {
  localStorage.setItem(VIBRATION_PREFERENCE, String(enabled));
}

export async function playEmergencySound(test = false): Promise<void> {
  if (!test && !isEmergencySoundEnabled()) return;
  const context = getEmergencyAudioContext();
  if (!context) return;
  await context.resume().catch(() => undefined);
  if (context.state !== 'running') return;
  const startAt = context.currentTime + 0.03;
  const count = test ? 1 : 4;
  for (let index = 0; index < count; index += 1) {
    const at = startAt + index * 0.42;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(index % 2 === 0 ? 880 : 660, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.16, at + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.24);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.25);
  }
}

export function unlockEmergencyAudio(): void {
  const context = getEmergencyAudioContext();
  if (context?.state === 'suspended') void context.resume().catch(() => undefined);
}

export function vibrateForEmergency(): void {
  if (isEmergencyVibrationEnabled() && isEmergencyVibrationSupported()) navigator.vibrate([250, 120, 250, 120, 350]);
}

export function isIosInstallableBrowser(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && getClientPlatform() === 'ios-safari';
}
