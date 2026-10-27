# Atent v1.3.0

## Actualización GPS, onboarding y actualización desde GitHub

Esta versión mejora la actualización de ubicación, incorpora una guía de uso dentro de la aplicación y permite avisar al usuario cuando existe una nueva versión publicada en GitHub Releases.

## Novedades

- Refresco manual de ubicación mediante el botón **Actualizar ubicación**.
- Actualización automática de ubicación cada 10 segundos mientras el panel de ubicación está activo.
- Lectura inmediata al abrir el panel de ubicación.
- Protección contra solicitudes GPS duplicadas o superpuestas.
- Descarte de respuestas antiguas para evitar mostrar una ubicación obsoleta.
- Mapa basado en MapLibre y OpenStreetMap, sin API key.
- Modal explicativo después de conceder los permisos del dispositivo.
- Redirección al panel de Inicio después de confirmar el modal de permisos.
- Guía rápida dentro de la aplicación, disponible desde **Ajustes**.
- Identificación visible de la aplicación como `AtentV1.3 · v1.3.0`.
- Comprobación automática de nuevas versiones publicadas en GitHub Releases.
- Botón manual **Buscar actualizaciones** desde Ajustes.

## Correcciones

- Corregido el problema por el que la hora de ubicación permanecía igual aunque se pulsara actualizar.
- Corregido el uso de ubicaciones almacenadas en caché para las lecturas manuales de Android.
- Corregida la actualización del punto del mapa después de recibir una nueva lectura GPS.
- Corregida la lectura de la última ubicación registrada en las alertas recibidas.

## Instalación

1. Descarga `AtentV1.3.apk` desde los assets de esta release.
2. Abre el archivo APK en tu dispositivo Android.
3. Si Android lo solicita, permite temporalmente la instalación desde esta fuente.
4. Confirma la instalación o actualización de Atent.

## Actualizaciones futuras

Atent consulta periódicamente la última release del repositorio oficial:

`https://github.com/hxtxrchq/Atent/releases`

Cuando detecta una versión superior con un archivo `.apk`, muestra un aviso dentro de la aplicación y permite abrir la descarga directamente. Android siempre solicita confirmación antes de instalar; Atent no realiza instalaciones silenciosas.

Para que el aviso funcione en próximas versiones:

- Publica cada nueva versión como una GitHub Release.
- Adjunta el APK como asset de la release.
- Usa etiquetas semánticas como `v1.4.0`, `v1.5.0`, etc.

## Verificación

- Build web y TypeScript completado correctamente.
- Suite monorepo: 75 pruebas aprobadas, 0 fallos.
- APK Android debug generado correctamente.
- `versionName`: `1.3.0`.
- `versionCode`: `4`.

## Limitaciones conocidas

- La actualización requiere conexión a Internet para consultar GitHub.
- La instalación depende de la confirmación y configuración de seguridad de Android.
- La precisión y frescura del GPS dependen de señal, permisos, batería y configuración del dispositivo.
- No se garantiza disponibilidad de auxilio en caso de falta de cobertura o restricciones del sistema operativo.
