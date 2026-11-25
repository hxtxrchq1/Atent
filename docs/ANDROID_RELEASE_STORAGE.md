# Distribución Android mediante GitHub Releases

La aplicación consulta `update.json` en el repositorio para conocer la última versión y descargar el APK adjunto a GitHub Releases. El manifest debe incluir la etiqueta, notas, URL de la release y URL directa del asset `.apk`.

La distribución activa usa el asset de GitHub Release. La configuración de Supabase Storage documentada para una versión antigua queda como referencia histórica y no es necesaria para publicar actualizaciones actuales.

El bucket solo debe contener artefactos públicos de distribución. No se deben subir secretos, archivos de configuración ni datos de usuarios.

## Futuras versiones

1. Incrementar `versionCode` y `versionName` en Gradle.
2. Actualizar `CURRENT_APP_VERSION` y `update.json`.
3. Compilar `assembleDebug` con GitHub Actions.
4. Adjuntar el APK a una GitHub Release con el nombre indicado en `update.json`.
5. En Android, el botón nativo usa DownloadManager y muestra una notificación al terminar; el usuario confirma la instalación desde Android.

Android seguirá exigiendo confirmación manual y permiso para instalar desde esa fuente; no existe instalación silenciosa para este APK.
