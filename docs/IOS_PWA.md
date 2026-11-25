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
- El viewport usa el alto dinámico del iPhone, respeta el área segura y reduce el SOS/contenido en pantallas compactas para mantener visible la navegación.
- El sonido interno usa una copia byte por byte de `apps/mobile/android/app/src/main/res/raw/alert_sound.mp3`, reproducida en bucle mientras la PWA atiende la alerta y detenida al abrir Alertas. El backend repite las notificaciones iOS al minuto durante los primeros cinco reintentos y luego cada cinco minutos hasta que la persona abre Alertas o se resuelve la emergencia. El Service Worker no puede iniciar el MP3 al recibir Push con la página cerrada: iOS decide si cada notificación repetida reproduce su sonido estándar, sujeto a los ajustes del iPhone. No hay permiso de Safari que habilite el tono Android personalizado en segundo plano.
- iOS no ofrece a una PWA una API pública para abrir directamente Enfoque o agregarse a su lista permitida. Atent muestra pasos breves dentro de Ajustes.
- Ubicación: se etiqueta como última ubicación conocida con precisión y hora; no hay promesa de seguimiento continuo cuando iOS suspende la app.

## Web Push: estado de implementación

El cliente contiene el flujo de permiso iniciado por botón, suscripción VAPID, alta y revocación por RPC. El login telefónico existente no usa Supabase Auth, así que la migración `infrastructure/supabase_migration_v13_pwa_sessions.sql` emite un token opaco de 30 días al iniciar sesión. La base de datos guarda solo su hash; los RPC Push verifican el token, sin volver a pedir la contraseña al activar el permiso.

Las migraciones de suscripción, permisos, prueba, sesión PWA y recordatorios Push iOS ya se aplicaron en el proyecto Supabase `atent-production`. El emisor existente despacha FCM y Web Push a los mismos contactos; Android conserva el envío FCM existente y se eliminan endpoints Web Push 404/410. Los reintentos periódicos se limitan a suscripciones `ios-pwa`; abrir Alertas registra el acuse con la sesión PWA y cancela la cola de ese usuario/emergencia. La prueba Push confirma aceptación del proveedor, no que el iPhone haya emitido sonido. Vercel necesita `VITE_VAPID_PUBLIC_KEY` para compilar; Supabase Edge Functions necesita la privada y el subject. No debe usarse la clave `service_role` en el navegador. El cliente por sí solo no envía alertas.

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
