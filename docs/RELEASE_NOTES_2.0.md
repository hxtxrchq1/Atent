# Atent 2.0 — Ajustes Android más claros

## Cambios

- Se ocultó en Android el panel de configuración de Web Push, que corresponde al registro web/iOS y no al sistema nativo del APK.
- Se ocultó en Android la nota sobre repetición de notificaciones cuando la PWA de iOS está suspendida.
- Se conserva esa información en iPhone y navegadores compatibles.
- Versión Android visible: `2.0` (`versionCode 16`).

## Distribución

- APK: `Atent-v2.0-debug.apk`.
- Compilación mediante GitHub Actions con `assembleDebug` y el mismo keystore versionado de las versiones anteriores.
