# Atent 2.0 — Ajustes Android más claros

## Cambios

- Se ocultó en Android el panel de configuración de Web Push, que corresponde al registro web/iOS y no al sistema nativo del APK.
- Se ocultó en Android la nota sobre repetición de notificaciones cuando la PWA de iOS está suspendida.
- Se conserva esa información en iPhone y navegadores compatibles.
- Las solicitudes recibidas muestran el nombre y número registrado del remitente, verificados con la sesión de Atent.
- Eliminar un contacto revoca las dos direcciones de la relación de confianza.
- Versión Android visible: `2.0` (`versionCode 18`).

## Distribución

- APK: `Atent-v2.0-debug.apk`.
- Compilación mediante GitHub Actions con `assembleDebug` y el mismo keystore versionado de las versiones anteriores.
