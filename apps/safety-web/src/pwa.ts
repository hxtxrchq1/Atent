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

export async function enableWebPush(userId: string, password: string): Promise<void> {
  const support = getPushSupport();
  if (!support.supported) throw new Error(support.reason);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('No se concedió permiso para las notificaciones. Puedes cambiarlo en Ajustes del dispositivo.');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeBase64Url(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  });
  const { error } = await supabase.rpc('register_web_push_subscription', {
    p_user_id: userId,
    p_password: password,
    p_endpoint: subscription.endpoint,
    p_subscription: subscription.toJSON(),
    p_platform: getClientPlatform(),
  });
  if (error) {
    await subscription.unsubscribe().catch(() => false);
    throw new Error('No fue posible registrar las notificaciones en tu cuenta. Inténtalo de nuevo más tarde.');
  }
  localStorage.setItem(`atent_web_push_enabled_${userId}`, 'true');
}

export async function disableWebPush(userId: string, password: string): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const { error } = await supabase.rpc('revoke_web_push_subscription', {
    p_user_id: userId,
    p_password: password,
    p_endpoint: subscription.endpoint,
  });
  if (error) throw new Error('No se pudo revocar el registro de notificaciones del servidor.');
  await subscription.unsubscribe();
}

export function isIosInstallableBrowser(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) && getClientPlatform() === 'ios-safari';
}
