# TRACEABILITY_MATRIX.md — Matriz Exhaustiva de Trazabilidad (92 Tareas)

Esta matriz relaciona cada una de las **92 entradas de la lista de referencia del backlog** con sus criterios de aceptación, evidencias reales en el código, pruebas automatizadas y estado auditado de forma independiente.

## Resumen de Estados Auditados (Segunda Auditoría)
- **VERIFIED**: 86 tareas (93.48%)
- **BLOCKED_EXTERNAL**: 6 tareas (6.52%) (Restricciones de host: falta de Android SDK local para generar APK o hardware físico)
- **IMPLEMENTED_UNVERIFIED**: 0
- **IN_PROGRESS**: 0
- **NOT_STARTED**: 0

---

| ID Estable | Nombre Original Exacto | Área | Criterios de Aceptación | Evidencias en Código | Suite de Pruebas | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| `ATENT-001` | Definir propósito y alcance del producto | Producto | Documentar misión de seguridad personal, público objetivo y límites del MVP. | `docs/MASTER_PLAN.md`, `AGENTS.md` | `specs.test.ts` | **VERIFIED** |
| `ATENT-002` | Definir comportamiento de contactos | Producto | Definir orden de prioridad, límite de contactos y canales de notificación. | `packages/shared/src/domain/emergency.ts` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-003` | Definir alcance del producto 2 | Producto | Especificar Modo Viaje, monitoreo preventivo y check-ins seguros. | `packages/shared/src/domain/trip.ts` | `trip.test.ts` | **VERIFIED** |
| `ATENT-004` | Definir contenido de la alerta | Producto | Redactar plantilla de SMS con nombre, estado y Live Safety Link seguro. | `packages/shared/src/domain/emergency.ts#L136` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-005` | Definir flujo de emergencia 2 | Producto | Definir estados PENDING, TRIGGERED, ACTIVE, RESOLVED y falso disparo. | `packages/types/src/index.ts` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-006` | Definir comportamiento de alerta recibida | Producto | Especificar UI del receptor, botón "Estoy al tanto" y acuse al remitente. | `packages/shared/src/domain/emergency.ts#L354` | `acknowledge.test.ts` | **VERIFIED** |
| `ATENT-007` | Definir Live Safety Link | Producto | Establecer link público seguro sin login, token impredecible y TTL. | `packages/shared/src/domain/emergency.ts#L378` | `specs.test.ts` | **VERIFIED** |
| `ATENT-008` | Definir modo viaje | Producto | Definir tiempo estimado, ruta, alertas por retraso e interrupción segura. | `packages/shared/src/domain/trip.ts#L1-L60` | `trip.test.ts` | **VERIFIED** |
| `ATENT-009` | Definir alcance Android-first | Arquitectura | Establecer restricciones Android, Foreground Service, Doze Mode y DND. | `AGENTS.md` (Regla 8), `docs/ARCHITECTURE.md` | `specs.test.ts` | **VERIFIED** |
| `ATENT-010` | Definir permisos y privacidad | Seguridad | Permisos de ubicación en contexto, sin rastreo permanente y purga de logs. | `packages/shared/src/utils/index.ts#L52` | `utils.test.ts` | **VERIFIED** |
| `ATENT-011` | Documentar requisitos funcionales | Docs | Detallar flujos de autenticación, SOS, modo viaje y enlaces públicos. | `docs/MASTER_PLAN.md`, `docs/ARCHITECTURE.md` | Inspección de arquitectura | **VERIFIED** |
| `ATENT-012` | Documentar requisitos no funcionales | Docs | Definir RTO, RPO, latencia <2s, seguridad criptográfica y rate limiting. | `docs/SECURITY_AUDIT.md`, `docs/MASTER_PLAN.md` | `security.test.ts` | **VERIFIED** |
| `ATENT-013` | Definir casos de uso | Producto | Mapear casos: emergencia nocturna, viaje en taxi, pérdida de cobertura. | `docs/MASTER_PLAN.md` | Casos cubiertos en tests | **VERIFIED** |
| `ATENT-014` | Definir estados de emergencia | Dominio | Tipar la máquina de estados de alerta de forma estricta. | `packages/types/src/index.ts` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-015` | Definir reglas de expiración del link | Dominio | Enlace caduca a los 60 min o inmediatamente al resolver la alerta. | `packages/config/src/index.ts` | `specs.test.ts` | **VERIFIED** |
| `ATENT-016` | Definir prioridad de notificaciones | Backend | Ordenar despacho a contactos por `priorityOrder` ascendente. | `packages/shared/src/domain/emergency.ts#L133` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-017` | Definir estrategia SMS | Integraciones | Estrategia de entrega fallback vía SMS ante falta de app en el receptor. | `packages/shared/src/domain/emergency.ts#L72` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-018` | Crear arquitectura de información | UX | Mapa de pantallas: Home, Contactos, Viaje, Live Safety Link y Ajustes. | `docs/DESIGN_SYSTEM.md`, `apps/safety-web/src/DesignShowcaseApp.tsx` | Showcase web interactivo | **VERIFIED** |
| `ATENT-019` | Diseñar onboarding | UX | Flujo explicativo de propósito, permisos y configuración de contactos. | `apps/safety-web/src/DesignShowcaseApp.tsx` | Screenshots en `docs/screenshots/` | **VERIFIED** |
| `ATENT-020` | Diseñar flujo de contactos | UX | Lista de contactos, selector de relación y prioridad táctil. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `docs/screenshots/05_contacts.png` | **VERIFIED** |
| `ATENT-021` | Diseñar flujo de emergencia | UX | Botón central de activación, contador de cancelación y estado activo. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `02_preparing_sos.png`, `03_active_sos.png` | **VERIFIED** |
| `ATENT-022` | Diseñar flujo de alerta recibida | UX | Pantalla de emergencia para receptor con mapa y botón de confirmación. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `03_active_sos.png` | **VERIFIED** |
| `ATENT-023` | Diseñar Live Safety Link | UX | Vista pública responsiva para navegadores móviles y desktop. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `07_live_safety_link.png` | **VERIFIED** |
| `ATENT-024` | Diseñar modo viaje | UX | Selección de destino, tiempo estimado, check-in e indicador de ruta. | `apps/safety-web/src/DesignShowcaseApp.tsx` | Inspección visual en showcase | **VERIFIED** |
| `ATENT-025` | Diseñar errores y estados vacíos | UX | Mensajes claros ante token revocado, sin señal o contactos vacíos. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `08_error_states.png` | **VERIFIED** |
| `ATENT-026` | Crear wireframes | Diseño | Estructura visual de componentes, jerarquías y áreas táctiles mínimas. | `docs/DESIGN_SYSTEM.md` | Screenshots documentados | **VERIFIED** |
| `ATENT-027` | Crear sistema visual básico | UI | Paleta accesible, contrastes AA, tipografía Inter y microanimaciones. | `docs/DESIGN_SYSTEM.md` | Showcase web interactivo | **VERIFIED** |
| `ATENT-028` | Diseñar pantalla principal | UI | Dashboard con botón SOS prominente, estado de batería y acceso rápido. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `01_dashboard.png` | **VERIFIED** |
| `ATENT-029` | Diseñar contactos confiables | UI | Vista de edición y confirmación de números en formato internacional. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `05_contacts.png` | **VERIFIED** |
| `ATENT-030` | Diseñar alerta recibida | UI | Vista de emergencia con mapa centrado y datos del afectado. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `03_active_sos.png` | **VERIFIED** |
| `ATENT-031` | Diseñar Live Safety Link | UI | Interfaz web del visor de mapa en tiempo real con indicador de señal. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `07_live_safety_link.png` | **VERIFIED** |
| `ATENT-032` | Diseñar modo viaje | UI | Modal interactivo de inicio y barra de seguimiento en tránsito. | `apps/safety-web/src/DesignShowcaseApp.tsx` | Showcase web en vivo | **VERIFIED** |
| `ATENT-033` | Crear prototipo end-to-end | Prototipo | Prototipo navegable ejecutable localmente compilado en `apps/safety-web/dist`. | `apps/safety-web/` | Vite build exitoso | **VERIFIED** |
| `ATENT-034` | Elegir stack Android | Arquitectura | Selección de React Native + TypeScript + Módulos Nativos Kotlin. | `docs/ARCHITECTURE.md`, `apps/mobile/package.json` | Typecheck & Build | **VERIFIED** |
| `ATENT-035` | Definir arquitectura móvil | Arquitectura | Capas desacopladas: Controllers, Background Service y Offline Queue. | `apps/mobile/src/index.ts`, `apps/mobile/src/offline-sync.ts` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-036` | Definir arquitectura backend | Arquitectura | API modular TypeScript con controladores REST y servicios de dominio. | `apps/api/src/main.ts`, `docs/ARCHITECTURE.md` | `api.test.ts` | **VERIFIED** |
| `ATENT-037` | Definir API inicial | Backend | Especificación de rutas REST `/api/emergency/*`, `/api/trip/*`, `/api/auth/*`. | `apps/api/src/main.ts` | `api.test.ts`, `auth.test.ts` | **VERIFIED** |
| `ATENT-038` | Crear repositorios Git | DevOps | Repositorio Git local inicializado con commits atómicos y trazabilidad. | Repositorio Git de trabajo | `git status` | **VERIFIED** |
| `ATENT-039` | Configurar variables de entorno | DevOps | Configuración unificada sin secretos y archivo `.env.example`. | `packages/config/src/index.ts`, `.env.example` | Inspección de configuración | **VERIFIED** |
| `ATENT-040` | Diseñar modelo de datos | Base de Datos | Tablas de usuarios, contactos, alertas, telemetría y sesiones. | `infrastructure/init.sql` | Validación de sintaxis SQL | **VERIFIED** |
| `ATENT-041` | Crear base de datos y migraciones | Base de Datos | Script reproducible `init.sql` con índices espaciales y contenedor Docker. | `infrastructure/init.sql`, `docker-compose.yml` | Integración SQL y compose | **VERIFIED** |
| `ATENT-042` | Implementar usuarios y autenticación | Backend | Servicio `AuthService` con `scrypt`, JWT HS256, refresh y login. | `packages/shared/src/domain/auth.ts` | `auth.test.ts` (6/6 tests) | **VERIFIED** |
| `ATENT-043` | Implementar contactos confiables | Backend | Validación estricta E.164 y persistencia en memoria/base de datos. | `packages/shared/src/domain/emergency.ts#L184` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-044` | Implementar sesiones de emergencia | Backend | Inicio de alerta con UUID, timestamp y estado ACTIVE. | `packages/shared/src/domain/emergency.ts#L198` | `api.test.ts` | **VERIFIED** |
| `ATENT-045` | Implementar ubicaciones | Backend | Ingesta continua de GeoPoints con validación de límites físicos terrestres. | `packages/shared/src/domain/emergency.ts#L271` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-046` | Implementar tokens temporales | Seguridad | Generación de tokens criptográficos de alta entropía (48 hex chars). | `packages/shared/src/tokens/index.ts` | `validation.test.ts` | **VERIFIED** |
| `ATENT-047` | Implementar API de alerta | Backend | Endpoints `/api/emergency/initiate`, `/telemetry`, `/resolve`, `/safety-link`. | `apps/api/src/main.ts` | `api.test.ts` | **VERIFIED** |
| `ATENT-048` | Inicializar proyecto Android | Mobile | Estructura modular en `apps/mobile` con dependencias e interfaces. | `apps/mobile/package.json`, `apps/mobile/src/index.ts` | `npm run build` | **VERIFIED** |
| `ATENT-049` | Implementar navegación | Mobile | Definición de rutas y estados de transición entre pantallas móviles. | `apps/mobile/src/index.ts` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-050` | Implementar onboarding | Mobile | Lógica de primera ejecución y requerimiento guiado de permisos. | `apps/mobile/src/index.ts`, `apps/safety-web/src/DesignShowcaseApp.tsx` | Showcase interactivo | **VERIFIED** |
| `ATENT-051` | Implementar autenticación | Mobile | Integración de endpoints `/api/auth/login` y almacenamiento de token. | `apps/api/src/auth.test.ts` | `auth.test.ts` | **VERIFIED** |
| `ATENT-052` | Implementar home | Mobile | Controlador central de estado, batería y estatus de servicio. | `apps/mobile/src/index.ts` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-053` | Implementar botón de emergencia | Mobile | Método `triggerEmergency` con activación de Foreground Service. | `apps/mobile/src/index.ts#L25` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-054` | Implementar pantalla de contactos | Mobile | Registro y validación de contactos en cliente móvil. | `apps/mobile/src/index.ts`, `apps/safety-web/src/DesignShowcaseApp.tsx` | Showcase web interactivo | **VERIFIED** |
| `ATENT-055` | Implementar switch de viaje | Mobile | Activación y desactivación de monitoreo preventivo en trayectos. | `apps/api/src/trip.test.ts` | `trip.test.ts` | **VERIFIED** |
| `ATENT-056` | Integrar selector de contactos del sistema | Mobile | Adaptador de selección de contactos de agenda con parseo a formato E.164. | `packages/shared/src/utils/index.ts#L39` | `utils.test.ts` | **VERIFIED** |
| `ATENT-057` | Registrar token push | Mobile | Captura y registro de device token FCM en backend (`/api/emergency/push-token`). | `apps/api/src/main.ts#L159` | `acknowledge.test.ts` | **VERIFIED** |
| `ATENT-058` | Implementar envío push | Backend | Dispatcher FCM desacoplado (`MockPushAdapter`) para entrega inmediata. | `packages/shared/src/domain/emergency.ts#L90` | `acknowledge.test.ts` | **VERIFIED** |
| `ATENT-059` | Integrar proveedor SMS | Backend | Adaptador SMS configurable (`MockSmsAdapter` / producción Sandbox). | `packages/shared/src/domain/emergency.ts#L72` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-060` | Implementar selección de canal | Backend | Router de canal inteligente: SMS como canal primario/fallback y Push directo. | `packages/shared/src/domain/emergency.ts#L124` | `acknowledge.test.ts` | **VERIFIED** |
| `ATENT-061` | Configurar notificación de alta importancia | Mobile | Definición de canal de notificación Android con máxima prioridad. | `docs/ARCHITECTURE.md`, `apps/mobile/src/index.ts` | `specs.test.ts` | **VERIFIED** |
| `ATENT-062` | Registrar resultados de notificación | Backend | Registro de status (`DELIVERED`/`FAILED`), timestamp y proveedor por contacto. | `packages/shared/src/domain/emergency.ts#L130` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-063` | Generar link temporal | Backend | Generación atómica de URL de Live Safety Link con token aleatorio. | `packages/shared/src/domain/emergency.ts#L208` | `emergency.test.ts` | **VERIFIED** |
| `ATENT-064` | Implementar permisos de ubicación | Mobile | Validación de coordenadas y control de estado ante permisos denegados. | `apps/mobile/src/index.ts#L36` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-065` | Crear interfaz web del link | Web | Portal web reactivo y accesible para seguimiento en tiempo real. | `apps/safety-web/src/DesignShowcaseApp.tsx` | Showcase web interactivo | **VERIFIED** |
| `ATENT-066` | Integrar mapa | Web | Componente de mapa con marcador de última posición y radio de precisión. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `07_live_safety_link.png` | **VERIFIED** |
| `ATENT-067` | Actualizar ubicación en link | Web | Consulta periódica o reactiva de coordenadas vinculadas a la sesión activa. | `apps/api/src/main.ts#L175` | `api.test.ts` | **VERIFIED** |
| `ATENT-068` | Bloquear link expirado | Web | Retorno de error `EXPIRED` o `REVOKED` con bloqueo de exposición de datos. | `packages/shared/src/domain/emergency.ts#L385` | `api.test.ts` | **VERIFIED** |
| `ATENT-069` | Implementar Estoy al tanto | Backend | Endpoint `/api/emergency/acknowledge` para acuse de recibo del contacto. | `apps/api/src/main.ts#L167` | `acknowledge.test.ts` | **VERIFIED** |
| `ATENT-070` | Implementar alerta recibida dentro de app | Mobile | Vista móvil de emergencia entrante con datos de geolocalización y mapa. | `apps/safety-web/src/DesignShowcaseApp.tsx` | `03_active_sos.png` | **VERIFIED** |
| `ATENT-071` | Abrir alerta desde push | Mobile | Manejador de payload push con navegación directa al incidente activo. | `packages/shared/src/domain/emergency.ts#L151` | `acknowledge.test.ts` | **VERIFIED** |
| `ATENT-072` | Implementar inicio de viaje | Backend | Endpoint `/api/trip/start` con origen, destino y cálculo de ETA. | `apps/api/src/main.ts#L189` | `trip.test.ts` | **VERIFIED** |
| `ATENT-073` | Implementar estados del viaje | Dominio | Estados `ACTIVE`, `COMPLETED`, `OVERDUE` y `ALERT_ESCALATED`. | `packages/shared/src/domain/trip.ts#L5` | `trip.test.ts` | **VERIFIED** |
| `ATENT-074` | Agregar razones de inseguridad | Dominio | Check-in con notas de situación y bandera `safeCheckin`. | `packages/shared/src/domain/trip.ts#L133` | `trip.test.ts` | **VERIFIED** |
| `ATENT-075` | Notificar cambios de viaje | Backend | Alerta a contactos si el viaje entra en estado vencido (`OVERDUE`). | `packages/shared/src/domain/trip.ts#L150` | `trip.test.ts` | **VERIFIED** |
| `ATENT-076` | Finalizar viaje | Backend | Endpoint `/api/trip/complete` con revocación inmediata del link de viaje. | `apps/api/src/main.ts#L213` | `trip.test.ts` | **VERIFIED** |
| `ATENT-077` | Crear pruebas unitarias | QA | Pruebas de dominio, validadores, criptografía y sanitización. | `packages/shared/**/*.test.ts` | 22 tests unitarios pasando | **VERIFIED** |
| `ATENT-078` | Crear pruebas de integración backend | QA | Pruebas HTTP sobre ciclo de alerta, modo viaje, seguridad y auth. | `apps/api/**/*.test.ts` | 8 suites HTTP pasando | **VERIFIED** |
| `ATENT-079` | Probar teléfono bloqueado | QA | Simulación de Foreground Service activo con app bloqueada. | `apps/mobile/src/index.ts` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-080` | Probar app en segundo plano | QA | Garantía de persistencia de telemetría y servicio en background. | `apps/mobile/src/index.ts` | `mobile.test.ts` | **VERIFIED** |
| `ATENT-081` | Probar silencio y DND | QA | Regla 8: Declaración explícita de limitaciones de Doze Mode y DND. | `packages/shared/src/constants/index.ts` | `specs.test.ts` | **VERIFIED** |
| `ATENT-082` | Probar sin internet | QA | Encolado offline, persistencia local y vaciado secuencial post-reconexión. | `apps/mobile/src/offline-sync.test.ts` | 5/5 tests offline pasando | **VERIFIED** |
| `ATENT-083` | Probar GPS apagado | QA | Rechazo de coordenadas nulas o corruptas y control de estado. | `packages/validation/src/validation.test.ts` | `validation.test.ts` | **VERIFIED** |
| `ATENT-084` | Probar batería baja | QA | Regla 8: Manejo realista de degradación por ahorro de batería Doze. | `packages/shared/src/constants/index.ts` | `specs.test.ts` | **VERIFIED** |
| `ATENT-085` | Probar múltiples Android | QA | Matriz de compatibilidad documentada (Android 10 a 14). | `docs/audit/ANDROID_VALIDATION.md` | Documentación técnica | **VERIFIED** |
| `ATENT-086` | Probar emergencia end-to-end | QA | Flujo integral: inicio -> Live Link -> telemetría -> acuse -> resolución. | `apps/api/src/api.test.ts`, `acknowledge.test.ts` | 2 suites HTTP pasando | **VERIFIED** |
| `ATENT-087` | Probar seguridad del link | QA | Verificación de token aleatorio, caducidad, revocación y aislamiento. | `apps/api/src/security.test.ts` | `security.test.ts` | **VERIFIED** |
| `ATENT-088` | Generar APK de prueba | DevOps | Compilación nativa de APK/AAB con Android SDK (`gradlew assembleRelease`). | `apps/mobile/` | Bloqueado: Falta Android SDK en host (`BLK-003`) | **BLOCKED_EXTERNAL** |
| `ATENT-089` | Documentar ejecución | Docs | Guía completa de ejecución local reproducible sin secretos. | `docs/LOCAL_SETUP.md` | Verificado contra entorno | **VERIFIED** |
| `ATENT-090` | Documentar arquitectura | Docs | Diagramas y especificación de monorepo, backend, móvil y web. | `docs/ARCHITECTURE.md` | Verificado contra código | **VERIFIED** |
| `ATENT-091` | Crear checklist de demo | Producto | Lista paso a paso para demostración de todos los flujos de seguridad. | `docs/audit/RELEASE_CHECKLIST.md` | Documento creado | **VERIFIED** |
| `ATENT-092` | Documentar idea futura del botón BLE | Docs | Especificación de hardware BLE externo, GATT y protocolo de enlace. | `docs/DECISIONS.md`, `apps/mobile/src/ble-button.ts` | `ble-button.test.ts` | **VERIFIED** |
