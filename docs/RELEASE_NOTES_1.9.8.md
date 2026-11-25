# Atent 1.9.8 — Nuevo sonido de alerta

## Cambios

- Se reemplazó el sonido de emergencia de Android por el audio proporcionado para esta versión.
- Las alertas directas de Android utilizan el mismo sonido mediante un canal de notificación nuevo, para respetar las preferencias guardadas del canal anterior.
- La PWA usa el audio nuevo cuando Atent está abierta y puede reproducir audio.
- Cuando la PWA de iOS está suspendida, iOS reproduce el sonido de notificación del sistema; Safari no permite asignar un MP3 personalizado a una notificación Web Push.
- Versión Android: `1.9.8` (`versionCode 14`).

## Distribución

- APK: `Atent-v1.9.8-debug.apk` (se adjuntará a GitHub Release `v1.9.8`).
- La actualización Android requiere que el APK esté firmado con la misma clave de las versiones distribuidas anteriormente.
- El APK se construye con GitHub Actions usando `assembleDebug` y el keystore versionado del proyecto.
