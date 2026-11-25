# Atent en iPhone mediante PWA

## Instalar

1. Abre `https://atent.chiqo.cc.cd` en Safari en iOS 16.4 o posterior.
2. Toca **Compartir → Añadir a pantalla de inicio**.
3. Abre Atent desde el icono y entra con la cuenta que ya utilizas.
4. En **Ajustes → Dispositivo y privacidad**, toca **Activar notificaciones** y acepta el permiso de iOS.

La instalación y la recepción de Web Push en iPhone requieren abrir la PWA desde la pantalla de inicio. Esta guía no confirma que el dominio ya apunte al hosting.

## Capacidades y límites

| Capacidad | Android APK / WebView | iPhone PWA |
| --- | --- | --- |
| Cuenta y datos | Supabase actual | Supabase actual |
| Acceso a AndroidBridge | Sí, en el APK existente | No |
| Ubicación | Servicio nativo y controles del sistema | Geolocation API al usar la app y con permiso; Safari puede suspenderla en segundo plano |
| Push | FCM/flujo nativo existente | Web Push API, iOS 16.4+ y app añadida a pantalla de inicio |
| Agenda nativa | Selector Android existente | No disponible mediante esta PWA; permite añadir el contacto manualmente |
| No molestar / Enfoque | Puede abrir ajustes especiales existentes; depende de permisos del sistema | El usuario puede permitir Atent en modos Enfoque; la PWA no puede cambiar esos ajustes |
| Alertas críticas | Depende de la configuración nativa existente | Critical Alerts no están disponibles para una PWA |
| SMS | Flujo/backend existente | Solo el flujo backend existente; no se envían SMS silenciosamente desde Safari |

## Arquitectura y despliegue

- Cliente: `apps/safety-web`, React y Vite. Mantiene `supabaseClient.ts`, sesión persistente y tablas actuales.
- PWA: `public/manifest.webmanifest`, `public/service-worker.js`, iconos y metadatos Apple en `index.html`.
- Vercel: usar `apps/safety-web` como raíz del proyecto, comando `npm run build`, output `dist`; el `vercel.json` local configura fallback SPA, MIME/caché del Service Worker y cabeceras.
- El Service Worker usa ámbito `/`, mantiene solo shell/archivos estáticos en caché y excluye API y respuestas autenticadas.
- Ubicación: se etiqueta como última ubicación conocida con precisión y hora; no hay promesa de seguimiento continuo cuando iOS suspende la app.

## Web Push: estado de implementación

El cliente contiene el flujo de permiso iniciado por botón, suscripción VAPID, alta y revocación por RPC. La app existente autentica con teléfono y contraseña mediante funciones Postgres personalizadas, no con una sesión Supabase Auth; por eso el alta y la revocación vuelven a comprobar la contraseña en Postgres, sin guardarla. `infrastructure/supabase_migration_v5_web_push.sql` añade almacenamiento por usuario sin lecturas directas y RPCs limitadas.

Las migraciones de suscripción y permisos ya se aplicaron en el proyecto Supabase `atent-production`. El emisor existente despacha FCM y Web Push a los mismos contactos; Android conserva el envío FCM existente y se eliminan endpoints Web Push 404/410. La versión 7 incluye una ruta de prueba de sonido limitada a la suscripción del usuario que vuelve a autenticarse. Vercel necesita `VITE_VAPID_PUBLIC_KEY` para compilar; Supabase Edge Functions necesita la privada y el subject. No debe usarse la clave `service_role` en el navegador. El cliente por sí solo no envía alertas.

La clave pública está en la configuración de Vercel y la privada solo en los secretos de Supabase. La clave privada nunca va al frontend.

## Verificación y pendientes

- Compilar `apps/safety-web` localmente antes de desplegar.
- Debe activarse Push desde la PWA instalada en un iPhone; hasta que se registre al menos un dispositivo, el backend no tendrá destinatarios Web Push.
- Validar envío mediante **Ajustes → Probar notificación** y luego comprobar una emergencia real Android↔iOS.
- Validar entrega, sonido, pantalla bloqueada, Enfoque y ubicación en el iPhone físico; iOS aplica sus propios modos de silencio y no admite Critical Alerts para PWA.

## Arquitectura de referencia

```text
Atent Android (FCM actual) ─┐
                            ├─ Supabase / evento de emergencia existente
Atent iOS PWA (Web Push) ───┘        ├─ FCM a dispositivos Android
                                     ├─ Web Push a suscripciones web activas
                                     └─ SMS según la regla existente
```
