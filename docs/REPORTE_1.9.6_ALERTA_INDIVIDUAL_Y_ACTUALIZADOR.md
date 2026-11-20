# Atent 1.9.6 — Reporte de cambios

## Funciones
- Botón **Notificar** en cada contacto de confianza: envía una alerta individual sin notificar al resto.
- El SOS principal sigue notificando a toda la red de confianza.
- La RPC valida que el contacto sea una relación de confianza mutua.
- Alertas directas se almacenan en emergency_alerts con recipient_user_id; get_trusted_alerts entrega alertas de SOS a la red y alertas directas solo al destinatario.
- FCM: envío dirigido a un token del destinatario para alertas individuales; distribución a la red para SOS general.
- Comprobador de versiones sincronizado con 1.9.6, consulta primero el manifiesto JSON en Raw GitHub (evita límites de la API), con fallback a GitHub Releases API.

## Limitaciones y seguridad
- Notificar es una alerta puntual y no inicia GPS en vivo ni crea registros de ubicación.
- FCM depende de token registrado, permiso de notificaciones y conexión. Android/los fabricantes pueden limitar procesos.
- El bypass de No molestar requiere que el usuario haya otorgado permiso de acceso a la política de notificaciones y que el canal esté configurado correctamente.
- El envío se valida con relación mutua de confianza, pero la aplicación usa IDs de perfil propios; la RPC no reemplaza una futura autenticación server-side completa.
- No se hizo prueba real entre dos teléfonos ni se generó un SOS de prueba.

## Actualizador
- El manifiesto inicial refleja el APK público actual (1.9.1). Esta APK 1.9.6 no se publica automáticamente en GitHub Releases; por ello, el actualizador solo ofrecerá un APK cuando exista una versión superior publicada y con asset APK. No se debe confundir el artifact de Actions con un asset público de Releases.

## Verificación
- CI Android: compilación y test automatizado pendiente.
- Supabase: migración y despliegue Edge Function pendientes de aplicar/verificar.
- Prueba real: pendiente de dispositivos y tokens FCM.

## Cómo publicar una actualización futura
1. Publicar un GitHub Release con tag de versión, por ejemplo v1.9.7, y adjuntar el APK.
2. Actualizar update.json con la versión, notas y enlaces directos del release.
3. Instalar una versión previa y comprobar que el botón Buscar actualizaciones detecta el release y abre el APK.
