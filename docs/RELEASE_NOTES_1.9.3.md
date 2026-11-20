# Atent v1.9.3 — Entrega de alertas SOS en segundo plano

**Android versionCode:** 9  
**Android versionName:** 1.9.3

## Correcciones

- Conecta la inserción de una emergencia activa a un trigger PostgreSQL que encola la invocación de la Edge Function de push mediante pg_net.
- El trigger consulta la autorización de Edge Function desde Supabase Vault. Si el secreto aún no está configurado o el envío no puede encolarse, la creación de la emergencia no se bloquea.
- Firebase ahora envía un mensaje **data-only** de prioridad alta (no payload de notificación estándar). Esto permite que AtentFirebaseMessagingService reciba el evento cuando la Activity/WebView está cerrada y active el servicio nativo de alarma persistente.
- La función Push devuelve métricas de intento, entregas aceptadas por FCM y errores HTTP, y envía el nombre del contacto que activó SOS.
- Se incrementa la versión Android para regenerar el APK.

## Configuración necesaria en Supabase (una sola vez)

1. Desplegar la función: `supabase functions deploy send-emergency-push`.
2. Configurar los secretos de la Edge Function: `SUPABASE_SERVICE_ROLE_KEY` y `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON completo de la cuenta de servicio Firebase).
3. Aplicar `infrastructure/supabase_migration_v5_push_dispatch.sql` en SQL Editor de Supabase.
4. Guardar el JWT Service Role de Supabase en Vault para que el trigger invoque la Edge Function:

```sql
select vault.create_secret(
  'PEGAR_SERVICE_ROLE_JWT_DE_SUPABASE',
  'atent_edge_function_service_role_key',
  'Autorización del trigger PostgreSQL para invocar la Edge Function de Atent'
);
```

No guardar la clave Service Role ni el JSON de Firebase en el código del APK. Para que el workflow incluya Firebase en el APK, guardar el contenido de `google-services.json` como secreto de repositorio `GOOGLE_SERVICES_JSON`. Si no está configurado, el APK compilará sin registro FCM y las notificaciones Push no funcionarán.

## Comprobaciones para prueba real

- El dispositivo receptor debe haber iniciado sesión al menos una vez en Atent para registrar su token FCM.
- Android debe tener permitido mostrar notificaciones (Android 13+).
- Desactivar batería restringida para Atent en dispositivos con gestión agresiva de segundo plano.
- La prueba debe hacerse con Atent cerrada/segundo plano en el receptor. La entrega Push no puede garantizarse tras **Forzar detención** (Android bloquea FCM hasta volver a abrir la app), sin conexión, o si el sistema/OEM restringe el dispositivo.
- En Supabase, revisar la cola pg_net y logs de la Edge Function; en FCM, un HTTP 200 significa aceptado por FCM, no garantiza que el dispositivo lo haya mostrado.

## Archivos

- `supabase/functions/send-emergency-push/index.ts`
- `infrastructure/supabase_migration_v5_push_dispatch.sql`
- `apps/mobile/android/app/build.gradle`
- `.github/workflows/android-release.yml`
