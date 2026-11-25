# Atent 1.9.9 — Descarga de actualizaciones Android

## Cambios

- El botón **Descargar APK** en Android inicia la descarga nativa con DownloadManager y muestra su progreso en las notificaciones del sistema.
- Al finalizar, el usuario puede tocar el aviso de descarga para abrir el instalador de Android y confirmar la actualización.
- Se corrigió la validación del enlace de releases de GitHub en `AndroidBridge`.
- Versión Android: `1.9.9` (`versionCode 15`).

## Distribución

- APK: `Atent-v1.9.9-debug.apk` (se adjuntará a GitHub Release `v1.9.9`).
- Compilación mediante GitHub Actions con `assembleDebug` y el mismo keystore versionado que las versiones anteriores.
