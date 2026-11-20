# Atent 1.9.6 — Reporte de implementación

**Fecha:** 20 de noviembre de 2026  
**APK:** Debug, Android  
**Package:** `pe.atent.app`  
**VersionName:** `1.9.6`  
**VersionCode:** `12`

## Cambios implementados

### Alertas individuales
- Se añadió el botón **Notificar** al lado de cada contacto de la Red de Confianza.
- Envía una alerta solo al destinatario seleccionado.
- El SOS principal sigue enviando a toda la red de confianza.
- El push individual tiene un canal Android separado, con notificación puntual (no la alarma SOS persistente).
- La alerta individual se distingue en la lista y en los detalles.
- Los avisos directos caducan a los 10 minutos.
- Se limita un nuevo aviso al mismo contacto a uno por minuto.
- La RPC verifica que exista una relación de confianza mutua antes de crear la alerta.

### Supabase y FCM
- Migraciones v6, v7, v8 y v9 aplicadas al proyecto `ngsexidmirortoccbatd`.
- La RPC `send_direct_trusted_alert` está desplegada y validada con una llamada negativa (destinatarios sin relación mutua; se rechazó sin crear alerta).
- `get_trusted_alerts` fue recreada con los campos de destinatario, conserva el campo de última ubicación y se probó una consulta de lectura.
- La Edge Function `send-emergency-push` está desplegada en versión 4; el envío individual usa solo el destinatario y el SOS general conserva la distribución a toda la red.
- GitHub Actions confirmó: `Firebase config injected for FCM`. No se muestran valores de secretos.

## Comprobaciones

- **GitHub Actions – Android:** éxito.
- **GitHub Actions – CI, build/lint/test suite:** éxito.
- **ZIP del artefacto:** integridad comprobada.
- **APK:** `AndroidManifest.xml` inspeccionado; package `pe.atent.app`, versionName `1.9.6`, versionCode `12`.
- **SHA-256:** `0dea8e6bab8a6d78ff330b31d2ee57726d89c77da5b02799dddb23d09c1cc8c`.
- **Supabase:** 2 perfiles, 2 filas de relaciones de confianza, 2 tokens push, 0 alertas activas al momento de revisar.
- No se activó SOS ni se enviaron notificaciones de prueba a contactos reales.

## Comprobador de actualizaciones
- Versión de la aplicación sincronizada a `1.9.6`.
- Consulta primero el manifiesto `update.json` de Raw GitHub (evita depender del límite de peticiones de la API).
- Tiene fallback a GitHub Releases API.
- El APK contiene las URLs del manifiesto y del fallback.

**Limitación de publicación:** el manifiesto público todavía indica la versión `1.9.1`. El APK `1.9.6` es un artefacto de Actions, no un asset de GitHub Release. Para que usuarios de versiones antiguas descarguen esta APK desde el actualizador, hace falta publicar `1.9.6` en Releases y actualizar `update.json`. El comportamiento del botón de actualización no se ha probado en un teléfono conectado a Internet.

## Pendientes de prueba real
1. Instalar en dos teléfonos y confirmar que el push individual llega solo al seleccionado.
2. Confirmar que el SOS general llega a todos los contactos aceptados.
3. Comprobar el canal individual con No Molestar: el bypass depende de que Android tenga concedido el acceso a la política de notificaciones.
4. Probar el comprobador de actualizaciones desde la app con conexión real y publicar el APK en Releases.

## Nota de seguridad
Supabase Security Advisors reporta advertencias por funciones `SECURITY DEFINER` accesibles a roles anon/authenticated, incluyendo la nueva RPC. Atent usa autenticación telefónica propia, no una sesión de Supabase Auth que permita validar `auth.uid()` en esta RPC. La validación de confianza mutua y el límite de frecuencia reducen el abuso, pero **no eliminan el riesgo de suplantación del ID de emisor**. Se recomienda endurecer la autenticación del servidor antes de usar alertas reales en producción.

## Enlaces
- Repositorio: https://github.com/hxtxrchq1/Atent
- Commit de la APK: https://github.com/hxtxrchq1/Atent/commit/2f39bd55d0d2877894e8dcf8a275e04432046f29
- Android build: https://github.com/hxtxrchq1/Atent/actions/runs/44811412196
- CI: https://github.com/hxtxrchq1/Atent/actions/runs/44811412616
- GitHub Releases: https://github.com/hxtxrchq1/Atent/releases
