# Atent V1 — Documento público de lanzamiento

## 1. Presentación

Atent es una aplicación móvil Android orientada a la seguridad personal y al acompañamiento entre personas de confianza. Su primera versión pública es **Atent V1**, versión visible **1.0.0**, distribuida como `AtentV1.apk`.

Atent nace de una problemática cotidiana: muchas personas, especialmente al trasladarse en microbuses, taxis o trayectos solitarios, pueden sentirse inseguras, acosadas o sin una forma rápida de avisar a quienes confían. La aplicación busca reducir el tiempo entre una situación de riesgo y la comunicación con la red personal de apoyo.

> Atent es una herramienta de comunicación y acompañamiento. No reemplaza a los servicios de emergencia, a la policía, a los servicios médicos ni garantiza que una persona reciba ayuda.

## 2. Estado de la versión

- Producto: Atent
- Release: Atent V1
- Versión visible: 1.0.0
- Plataforma: Android
- Tipo de distribución actual: APK de prueba/beta instalable manualmente
- Nombre del archivo: `AtentV1.apk`
- Mapa: MapLibre GL con teselas raster de OpenStreetMap
- API key de mapas: no requerida por esta implementación
- Backend: Supabase para autenticación telefónica, perfiles, contactos, alertas y ubicación
- Estado: primera versión pública en validación beta

El APK conserva un código interno Android superior al de APK beta anteriores para permitir la actualización de instalaciones existentes. La etiqueta que ve el usuario en Ajustes continúa siendo `AtentV1 · v1.0.0`.

## 3. Funciones incluidas

### Cuenta y acceso

- Registro con nombres, apellidos, país y número telefónico.
- Inicio de sesión con número telefónico y contraseña.
- Cambio de contraseña desde Ajustes.
- Validación de formato y límites de entrada en el cliente.
- Registro y acceso mediante funciones RPC parametrizadas en Supabase.
- Contraseñas almacenadas como hash bcrypt en la base de datos; la contraseña no se devuelve al cliente.

### Configuración inicial y permisos

- Solicitud contextual de ubicación precisa y en segundo plano.
- Solicitud de lectura de contactos y notificaciones.
- Solicitud de acceso especial de interrupciones/No molestar cuando el flujo lo requiere.
- Explicación breve del uso de los permisos antes de entrar al inicio.
- Tutorial in-app de uso básico accesible desde Ajustes.
- Tras completar todos los permisos, se muestra un modal informativo y el botón **Ir al inicio** lleva al panel principal.

Atent no puede aceptar permisos por el usuario, eliminar las restricciones del sistema, ignorar permanentemente No molestar ni garantizar ejecución continua en todos los modelos de teléfono.

### Inicio y modo viaje

- Panel principal con acceso a alerta, ubicación, contactos, alertas y Ajustes.
- Modo viaje para acompañar un trayecto y registrar telemetría según conectividad y políticas del dispositivo.
- Estado de batería cuando Android puede entregarlo.

### Ubicación y mapa

- Mapa con marcador de la ubicación actual.
- Lectura inmediata al abrir Ubicación.
- Botón **Actualizar ubicación** para solicitar una lectura nueva.
- Refresco automático cada 10 segundos en los contextos habilitados.
- Protección contra solicitudes GPS superpuestas y respuestas obsoletas.
- Hora asociada a la lectura GPS más reciente.

La precisión depende del GPS, interiores, batería, permisos, conectividad y configuración del fabricante.

### Red de confianza

- Búsqueda controlada de perfiles por teléfono.
- Envío, recepción y aceptación de solicitudes.
- Creación de relación bidireccional.
- Selección de contactos de confianza desde la agenda cuando Android concede el permiso.

### Alertas de emergencia

- Activación mediante interacción deliberada para reducir toques accidentales.
- Estados de preparación, alerta activa, cancelación y resolución.
- Registro de ubicación y telemetría cuando existe permiso y conectividad.
- Visualización de alertas de contactos relacionados.
- Notificación Android de alta importancia con vibración y sonido configurado por el sistema.

La alerta depende de red, permisos, batería y disponibilidad del backend. El sistema operativo o el fabricante pueden retrasar servicios en segundo plano.

### Enlaces de seguridad

- Enlaces web temporales para compartir información de seguimiento.
- Acceso limitado al contexto autorizado por el backend.
- Expiración y revocación según el flujo correspondiente.

No se debe publicar un enlace de seguimiento en redes abiertas: puede incluir información sensible mientras esté vigente.

## 4. Seguridad y privacidad

### Control de inyección SQL

El login y el registro no concatenan texto de usuario en sentencias SQL. El cliente llama funciones RPC con parámetros tipados y `infrastructure/supabase_migration_v4_auth_hardening.sql` agrega:

- Límites de longitud para nombres y contraseñas.
- Validación de formato telefónico E.164.
- Rechazo de caracteres de control.
- `LIMIT 1` en la búsqueda de login.
- Manejo de carreras de unicidad mediante índice único y `unique_violation`.
- `SECURITY DEFINER` con `search_path` explícito.
- Revocación de ejecución pública y concesión explícita a `anon` y `authenticated`.
- Mensajes de autenticación genéricos para no revelar detalles internos.

Esta mitigación debe aplicarse en el proyecto Supabase de la release. Tener el archivo SQL en Git no ejecuta la migración remotamente.

### Datos sensibles

- Los números telefónicos son datos personales y deben tratarse con acceso mínimo.
- No incluir números, contraseñas, tokens ni coordenadas exactas en logs o capturas públicas.
- La clave pública de Supabase usada por el cliente no sustituye las políticas RLS.
- Las credenciales administrativas de Supabase nunca deben incorporarse al APK.

## 5. Requisitos

- Teléfono Android compatible con la versión mínima configurada.
- Servicios de ubicación habilitados.
- Internet para autenticación, sincronización y alertas remotas.
- Permisos concedidos según las funciones deseadas.
- Batería suficiente y configuración que no fuerce el cierre de servicios.
- Proyecto Supabase configurado con las migraciones base y la de autenticación.

## 6. Instalación por APK

1. Descargar `AtentV1.apk` desde el release oficial.
2. Abrir el archivo en Android.
3. Si se solicita, permitir temporalmente la instalación desde esa fuente.
4. Confirmar la instalación.
5. Registrarse o iniciar sesión.
6. Leer el motivo de cada permiso y conceder los necesarios.
7. Confirmar el modal de permisos para entrar al inicio.

Android exige confirmación de instalación. Atent no instala una actualización silenciosamente. Las releases futuras deben publicar un asset Android estable `AtentV<entero>.apk`, por ejemplo `AtentV2.apk`; los assets beta como `AtentV1.3.apk` se ignoran.

Para actualizar directamente una beta antigua cuyo código compara `1.3` contra `1.0`, la release de GitHub de Atent V1 debe usar una etiqueta técnica superior a `1.3`, por ejemplo `android-v1.3.1`, aunque el nombre público siga siendo Atent V1 / 1.0.0. El asset que descargará el usuario continúa siendo `AtentV1.apk`.

## 7. Configuración de Supabase

Aplicar en orden:

1. `infrastructure/supabase_migration_v1.sql`.
2. Migraciones de alertas y contactos requeridas por el entorno.
3. `infrastructure/supabase_migration_v3_live_location.sql`.
4. `infrastructure/supabase_migration_v4_auth_hardening.sql`.
5. Verificar RLS, grants y funciones en Supabase sandbox.
6. Configurar variables de entorno sin guardar secretos en Git.
7. Probar con cuentas y teléfonos de prueba.

## 8. Arquitectura del proyecto

```text
Atent/
├─ apps/api/          Backend HTTP y dominio en TypeScript
├─ apps/mobile/       Contenedor Android Kotlin/WebView y puente nativo
├─ apps/safety-web/   Interfaz React/Vite embebida dentro de Android
├─ packages/          Tipos, contratos, validaciones y configuración compartida
├─ infrastructure/    Migraciones SQL y configuración de infraestructura
├─ scripts/           Verificaciones y utilidades de QA
└─ docs/              Arquitectura, decisiones, pruebas, backlog y releases
```

La interfaz web usa `AndroidBridge` para ubicación, contactos, batería, permisos, ajustes del sistema, notificaciones y apertura controlada de releases.

## 9. Actualizaciones

La actualización OTA silenciosa no está disponible para un APK Android convencional. Atent puede consultar GitHub Releases, avisar y abrir la descarga, pero Android exige que la persona confirme la instalación.

La estrategia es independiente por plataforma:

- Android: assets estables `AtentV<entero>.apk` en releases Android.
- iOS: distribución separada por App Store/TestFlight cuando exista una versión iOS.
- Android no interpreta un asset iOS como actualización.
- Cada nueva versión debe incrementar el código interno Android.

## 10. Limitaciones conocidas de la beta

- No se certifica cobertura de todos los fabricantes Android.
- GPS y segundo plano pueden verse afectados por Doze, ahorro de energía, señal o cierre forzado.
- Las notificaciones dependen del sistema, canal y permisos.
- No se garantiza que el sonido atraviese todas las configuraciones de silencio o No molestar.
- No se reemplaza una central de emergencias.
- La migración Supabase debe verificarse en un entorno real antes de usar datos públicos.

## 11. Validación de la release

Antes de entregar el APK se ejecutan build del monorepo, suite automatizada, build Gradle con el bundle web actualizado y verificación de existencia, tamaño y hash del APK. La validación con Supabase remoto y un dispositivo Android físico debe realizarse en sandbox antes de producción.

## 12. Soporte

Para reportar un problema incluir modelo de teléfono, versión Android, versión de Atent, pantalla afectada y pasos para reproducirlo. No enviar contraseñas, claves privadas, tokens, enlaces activos de seguimiento ni coordenadas exactas en un issue público.
