const CACHE_NAME = 'atent-shell-v5';
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/sounds/alert_sound.mp3'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('atent-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone()));
      return response;
    }).catch(() => caches.match('/')));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || '' }; }
  const data = payload.data || {};
  const options = {
    body: payload.body || 'Un contacto de confianza necesita tu atención.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    silent: false,
    tag: data.alertId
      ? `atent-emergency-${data.alertId}${data.repeat ? `-${data.repeatCount || Date.now()}` : ''}`
      : undefined,
    renotify: Boolean(data.alertId),
    data: {
      alertId: data.alertId || null,
      url: data.url || (data.alertId ? `/?alert=${encodeURIComponent(data.alertId)}` : '/'),
    },
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'Alerta de Atent', options));
});

self.addEventListener('notificationclick', (event) => {
  const alertId = event.notification.data?.alertId;
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    if (alertId && typeof self.registration.getNotifications === 'function') {
      const notifications = await self.registration.getNotifications();
      notifications.filter((notification) => notification.data?.alertId === alertId)
        .forEach((notification) => notification.close());
    }
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    return existing ? existing.navigate(target).then(() => existing.focus()) : self.clients.openWindow(target);
  })());
});
