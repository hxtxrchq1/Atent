# Corrección de ubicación en vivo — 2026-10-25

## Hallazgo

El botón de actualización invocaba Android `getRealLocation`, pero el puente
devolvía primero `lastLocation`. Esa ubicación es una caché del sistema y podía
tener minutos de antigüedad. El receptor también usaba `emergency_alerts.updated_at`
como si fuera la hora de captura GPS.

## Corrección

- Android usa `CurrentLocationRequest` de alta precisión con
  `maxUpdateAgeMillis=0` y una ventana de 15 segundos.
- Cada inserción de `emergency_locations` conserva `recorded_at` del dispositivo.
- El receptor usa `last_recorded_at`, calculado por la migración
  `supabase_migration_v3_live_location.sql` desde la última coordenada.
- El bundle web corregido fue regenerado y copiado a los assets Android.

## Verificación

- `npm.cmd --workspace=@atent/safety-web run build`: OK.
- `git diff --check`: OK; solo avisos de normalización CRLF.
- La compilación Kotlin requiere completar la descarga de Gradle en el entorno.
- Falta ejecutar `infrastructure/supabase_migration_v3_live_location.sql` en
  Supabase sandbox y validar con dos cuentas/dispositivos reales de prueba.

La tarea permanece `IMPLEMENTED`, no `VERIFIED`, hasta completar esas dos
validaciones externas.
