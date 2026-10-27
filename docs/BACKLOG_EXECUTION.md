# BACKLOG_EXECUTION.md — Estado de Ejecución del Backlog Maestro

Este documento es el registro vivo del progreso y estado de todas las tareas del proyecto **Atent**.
Conforme a las reglas:
- Se conserva cada tarea e identificador original (incluyendo duplicados si existiesen en la fuente).
- Se asigna un identificador estable propio (`ATENT-TASK-xxx`) para trazabilidad inmutable.
- Cada tarea registra: descripción original, MVP/fase, dependencias, criterios de aceptación, subtareas técnicas, pruebas, estado real, evidencia y bloqueos.
- Ninguna tarea se marca como `VERIFIED` sin pruebas automatizadas ejecutadas y documentadas en `docs/TEST_REPORT.md`.

---

## Release 1.3.0 — Refresco GPS y guía in-app

## Release Atent V1 — seguridad de autenticación y paquete público

### ATENT-TASK-016 — Release pública Atent V1 y hardening de autenticación
- Estado: `IMPLEMENTED`
- La primera release visible se identifica como `AtentV1 · v1.0.0`; el APK se genera en la raíz como `AtentV1.apk`.
- Registro/login: límites de entrada, rechazo de caracteres de control, mensajes genéricos, RPC parametrizadas y migración `infrastructure/supabase_migration_v4_auth_hardening.sql`.
- Permisos: el callback Android ya no usa estado React obsoleto; al completar todos los permisos muestra el motivo de activación y permite ir al Inicio.
- Actualizaciones: consulta únicamente assets Android `AtentV*.apk`.
- Evidencia: build, suite global, diagnóstico sin errores y APK SHA-256 registrado en `docs/TEST_REPORT.md`.
- Pendiente para `VERIFIED`: aplicar la migración en Supabase sandbox y ejecutar prueba física de login, permisos y actualización en Android.

### ATENT-TASK-015 — Ubicación refrescable y onboarding de permisos
- Estado: `IMPLEMENTED`
- Refresco manual y automático sin solicitudes GPS superpuestas, con descarte de respuestas obsoletas y lectura inmediata al abrir Ubicación; el sondeo continúa cada 10 segundos.
- Guía in-app de cuatro pasos accesible desde Ajustes y modal de consentimiento antes de redirigir al Inicio tras conceder permisos.
- Identificación visible: `AtentV1.3 · v1.3.0`.
- Mapa sin cambios: MapLibre + OpenStreetMap, sin API key.
- Comprobador de versiones: consulta `https://api.github.com/repos/hxtxrchq/Atent/releases/latest` al iniciar y cada 6 horas; si existe una release superior con asset `.apk`, muestra un aviso y abre la descarga directa.
- La instalación no es silenciosa: Android requiere confirmación del usuario y puede requerir habilitar instalaciones desde esa fuente.
- Evidencia: build web/TypeScript, suite monorepo 75 pruebas y APK `AtentV1.3.apk` en la raíz.
- Pendiente para `VERIFIED`: migración v3 en Supabase sandbox y prueba GPS con dispositivo Android real; Chromium no está instalado en este entorno para E2E Playwright.

## 1. Convención de Estados y Definición de Hecho (DoD)

- `NOT_STARTED`: Tarea en cola, sin iniciar.
- `IN_PROGRESS`: Actualmente en implementación por el equipo.
- `BLOCKED`: Bloqueada por dependencia técnica o falta de insumo externo (documentado en `docs/BLOCKERS.md`).
- `IMPLEMENTED`: Código implementado y componentes integrados, pendiente de validación completa.
- `VERIFIED`: Pruebas ejecutadas con éxito, criterios de aceptación comprobados y evidencia registrada en `docs/TEST_REPORT.md`.

---

## 2. Métricas de Ejecución del Backlog

| Métrica | Valor |
| :--- | :--- |
| **Total de Tareas Registradas** | 11 |
| **Tareas VERIFIED (Respaldadas con Evidencia)** | 10 |
| **Tareas IMPLEMENTED (Pendientes de Test)** | 0 |
| **Tareas IN_PROGRESS** | 0 |
| **Tareas BLOCKED (Pendiente Notion Ingestion)** | 1 |
| **Tareas NOT_STARTED** | 0 |
| **Porcentaje Real VERIFIED** | **90.91%** (de tareas base registradas) |

---

## 3. Fase 0: Inicialización, Gobernanza y Contratos Base

### [ATENT-TASK-001] (ID Original: SETUP-001) Verificación de Entorno y Creación del Marco de Gobernanza
- **ID Estable**: `ATENT-TASK-001`
- **ID Original**: `SETUP-001`
- **MVP / Fase**: Fase 0 / Setup Inicial
- **Estado**: `VERIFIED`
- **Dependencias**: Ninguna
- **Descripción Original**: Verificación de herramientas instaladas, creación de protocolos del equipo multidisciplinario, configuración de reglas de confidencialidad y gobernanza del proyecto.
- **Criterios de Aceptación Originales**:
  - [x] Inspección exhaustiva del workspace local.
  - [x] Verificación de versiones instaladas del stack técnico (Node, npm, git, java, docker).
  - [x] Creación de `AGENTS.md` con las 10 reglas obligatorias y roles del equipo.
  - [x] Creación de los artefactos en `docs/`: `MASTER_PLAN.md`, `BACKLOG_EXECUTION.md`, `DECISIONS.md`, `ARCHITECTURE.md`, `INTEGRATIONS.md`, `TEST_REPORT.md`, `BLOCKERS.md`.
  - [x] Identificación y registro formal del estado de los requisitos funcionales de Notion.
- **Subtareas Técnicas**:
  - [x] Ejecutar comandos de entorno en Windows PowerShell.
  - [x] Escribir y versionar `AGENTS.md` y documentos base en `docs/`.
  - [x] Crear e inicializar repositorio Git local.
- **Pruebas y Comandos**:
  - `node -v` (v24.13.0)
  - `npm -v` (11.6.2)
  - `git --version` (2.53.0.windows.1)
  - `java -version` (OpenJDK 21.0.12.1)
- **Evidencia Registrada**: Registrado en [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md).
- **Bloqueos**: Ninguno.

---

### [ATENT-TASK-002] (ID Original: SETUP-002) Andamiaje Base del Monorepo `safe-app` y Paquete Compartido
- **ID Estable**: `ATENT-TASK-002`
- **ID Original**: `SETUP-002`
- **MVP / Fase**: Fase 0 / Setup Inicial
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-001`
- **Descripción Original**: Configuración de arquitectura monorepo `safe-app` con npm workspaces (`apps/*`, `packages/*`), tipado estricto TypeScript y paquete de contratos compartidos `@atent/shared`.
- **Criterios de Aceptación Originales**:
  - [x] Archivo `package.json` raíz configurado con `workspaces: ["apps/*", "packages/*"]`.
  - [x] Estructura de directorios `apps/api`, `apps/mobile`, `apps/safety-web`, `packages/shared`.
  - [x] Configuración compartida de TypeScript (`tsconfig.base.json`).
  - [x] Scripts raíz para compilación, linting y ejecución de pruebas en todos los paquetes.
  - [x] Implementación y compilación exitosa del paquete `@atent/shared` con contratos de dominio, utilidades de validación y sanitización de datos (Regla 8 y 9).
  - [x] Ejecución exitosa de suite de pruebas unitarias (`utils.test.ts`) con 0 fallos.
- **Subtareas Técnicas**:
  - [x] Configurar workspaces en `package.json`.
  - [x] Crear `tsconfig.base.json` y `packages/shared/tsconfig.json`.
  - [x] Implementar contratos en `packages/shared/src/types/index.ts`.
  - [x] Implementar constantes y disclaimers en `packages/shared/src/constants/index.ts`.
  - [x] Implementar sanitizador y validadores en `packages/shared/src/utils/index.ts`.
  - [x] Escribir y ejecutar suite de pruebas automatizadas.
- **Pruebas y Comandos**:
  - `npm --workspace=@atent/shared run build`: Código de salida 0.
  - `npm --workspace=@atent/shared test`: 5 pruebas pasadas (187ms).
  - `npm test`: Suite de monorepo ejecutada con éxito.
- **Evidencia Registrada**: Registrado en [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md).
- **Bloqueos**: Ninguno.

---

### [ATENT-TASK-003] (ID Original: AUDIT-001) Auditoría de Fuentes e Inventario de Acceso Físico
- **ID Estable**: `ATENT-TASK-003`
- **ID Original**: `AUDIT-001`
- **MVP / Fase**: Fase 1 / Definición y Requisitos
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-001`
- **Descripción Original**: Auditoría exhaustiva de acceso a las 8 fuentes documentales requeridas (página principal, metodología, contexto e identidad, arquitectura, recursos, MVPs, diseños, backlog maestro) y creación de matriz de trazabilidad inicial.
- **Criterios de Aceptación Originales**:
  - [x] Inspección física directa de los archivos en el disco local sin asumir contenidos por títulos.
  - [x] Creación de `docs/SOURCE_INVENTORY.md` con el estado real de cada fuente.
  - [x] Creación de la matriz de trazabilidad requisito → tarea → módulo → prueba → evidencia en `docs/TRACEABILITY_MATRIX.md`.
  - [x] Registro formal de propuesta y resolución de ambigüedades en `docs/DECISIONS.md`.
  - [x] Registro activo de impedimento en `docs/BLOCKERS.md`.
- **Subtareas Técnicas**:
  - [x] Búsqueda recursiva en workspace y rutas locales.
  - [x] Generar `docs/SOURCE_INVENTORY.md`.
  - [x] Generar `docs/TRACEABILITY_MATRIX.md`.
- **Pruebas y Comandos**:
  - Verificación de consistencia y existencia de archivos generados.
- **Evidencia Registrada**: [SOURCE_INVENTORY.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/SOURCE_INVENTORY.md), [TRACEABILITY_MATRIX.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TRACEABILITY_MATRIX.md).
- **Bloqueos**: Ninguno para la tarea de auditoría en sí.

---

### [ATENT-TASK-004] (ID Original: UI-001) Diseño Visual e Implementación Ejecutable de Flujos del MVP
- **ID Estable**: `ATENT-TASK-004`
- **ID Original**: `UI-001`
- **MVP / Fase**: MVP 1 / Experiencia de Usuario & Accesibilidad
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-002`
- **Descripción Original**: Diseño e implementación de la experiencia visual de todos los flujos del MVP actual (onboarding, permisos contextuales, contactos confiables, dashboard seguro, preparación y cancelación de alerta, emergencia activa con telemetría en vivo, finalización segura, Live Safety Link web y estados de error/degradación).
- **Criterios de Aceptación Originales**:
  - [x] Documentación de decisiones visuales y flujos en `docs/DESIGN_SYSTEM.md`.
  - [x] Tokens semánticos de diseño tipados y exportados en `@atent/shared/tokens` (WCAG 2.1 AA/AAA).
  - [x] Acción de emergencia inequívoca con prevención de toques accidentales (*Hold-to-activate* de 3s y cancelación de 5s).
  - [x] Diferenciación visual no dependiente únicamente del color para preparación, activo, cancelación y offline.
  - [x] Implementación real interactiva en `apps/safety-web/src/DesignShowcaseApp.tsx`.
  - [x] Verificación visual automatizada de todas las pantallas con Playwright (`scripts/verify_design.py`) con captura de evidencias en `docs/screenshots/`.
- **Subtareas Técnicas**:
  - [x] Crear tokens en `packages/shared/src/tokens/index.ts`.
  - [x] Redactar `docs/DESIGN_SYSTEM.md`.
  - [x] Implementar prototipo interactivo con React + Vite.
  - [x] Script de prueba E2E de Playwright y captura de 8 capturas completas.
- **Pruebas y Comandos**:
  - `npm --workspace=@atent/safety-web run build`: Éxito (1.67s).
  - `python .agents/skills/webapp-testing/scripts/with_server.py --server "npm --workspace=@atent/safety-web run preview" --port 3001 -- python scripts/verify_design.py`: 8/8 pantallas capturadas sin errores.
- **Evidencia Registrada**: [01_dashboard.png](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/screenshots/01_dashboard.png), [02_preparing_sos.png](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/screenshots/02_preparing_sos.png), [03_active_sos.png](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/screenshots/03_active_sos.png), [05_contacts.png](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/screenshots/05_contacts.png), [07_live_safety_link.png](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/screenshots/07_live_safety_link.png), [08_error_states.png](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/screenshots/08_error_states.png).
- **Bloqueos**: Ninguno.

---

### [ATENT-TASK-005] (ID Original: ARCH-002) Implementación de Arquitectura Completa Monorepo `safe-app`
- **ID Estable**: `ATENT-TASK-005`
- **ID Original**: `ARCH-002`
- **MVP / Fase**: Fase 0 & 2 / Infraestructura & Monorepo
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-002`
- **Descripción Original**: Implementación integral de la arquitectura del monorepo con `packages/types`, `packages/validation`, `packages/config`, `packages/shared`, `apps/api` (con endpoint de health check), `apps/mobile` (con controlador y Foreground Service logic), `apps/safety-web` (con visor y prototipo), `infrastructure/` (docker-compose, init.sql con migraciones e inserciones deterministas) y pipeline CI en `.github/workflows/ci.yml`.
- **Criterios de Aceptación Originales**:
  - [x] Configuración de workspaces con `@atent/types`, `@atent/validation`, `@atent/config`, `@atent/shared`, `@atent/api`, `@atent/mobile`, `@atent/safety-web`.
  - [x] `apps/api` arranca y responde a `GET /health` con status 200 y JSON estructurado.
  - [x] `apps/mobile` implementa lógica de control de telemetría y Foreground Service para seguimiento.
  - [x] Paquetes desacoplados y compilados en orden estricto de dependencias con `tsc -b`.
  - [x] Configuración de PostgreSQL y Redis en `infrastructure/docker-compose.yml` con healthchecks.
  - [x] Esquema inicial, índices y seeds deterministas en `infrastructure/init.sql`.
  - [x] Pipeline automatizado de integración continua en `.github/workflows/ci.yml`.
  - [x] Documentación de puesta en marcha local reproducible en `docs/LOCAL_SETUP.md`.
  - [x] Ejecución de suite de pruebas con 0 fallos (18/18 pruebas aprobadas).
- **Subtareas Técnicas**:
  - [x] Crear paquetes `packages/types`, `packages/validation`, `packages/config`.
  - [x] Configurar servidor HTTP y health check en `apps/api`.
  - [x] Configurar controlador móvil en `apps/mobile`.
  - [x] Redactar `infrastructure/docker-compose.yml` y `infrastructure/init.sql`.
  - [x] Configurar `.github/workflows/ci.yml`.
  - [x] Ejecutar build y test en todos los workspaces.
- **Pruebas y Comandos**:
  - `npm run build`: Éxito en todos los paquetes.
  - `npm test`: 18 pruebas unitarias e integración aprobadas.
- **Evidencia Registrada**: Registrado en [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md).
- **Bloqueos**: `BLK-002` (Docker local ausente en host) y `BLK-003` (Android SDK ausente en host), ambos mitigados sin bloquear la ejecución.

---

### [ATENT-TASK-006] (ID Original: CORE-001) Bloque Vertical de Emergencia, Telemetría y Live Safety Link
- **ID Estable**: `ATENT-TASK-006`
- **ID Original**: `CORE-001`
- **MVP / Fase**: MVP 1 / Flujo de Emergencia & Notificaciones
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-004`, `ATENT-TASK-005`
- **Descripción Original**: Implementación integral del ciclo de vida de la emergencia: inicio con telemetría real (latitud, longitud, precisión, timestamp), Notification Orchestrator desacoplado (con `MockSmsAdapter` y soporte de proveedores reales), Live Safety Link con token criptográfico impredecible de 48 caracteres, ingesta de telemetría continua cada 5s, resolución de emergencia con revocación inmediata del enlace y endpoints REST HTTP en `apps/api`.
- **Criterios de Aceptación Originales**:
  - [x] Registro y validación estricta de contactos confiables con formato E.164.
  - [x] Creación de sesión de emergencia activa con fuente de activación registrada.
  - [x] Generación de token criptográfico impredecible (`crypto.randomBytes(24).toString('hex')`) con caducidad estricta (TTL 60 min).
  - [x] Despacho de notificaciones a través de `NotificationOrchestrator` ordenado por prioridad de contacto.
  - [x] Acceso público al Live Safety Link sin credenciales para el receptor del enlace.
  - [x] Ingesta continua de coordenadas con validación de límites físicos terrestres y rechazo de suplantación de usuario.
  - [x] Resolución de emergencia con actualización de estado y revocación inmediata del token de acceso web.
  - [x] Endpoints API REST implementados: `/api/emergency/contacts`, `/initiate`, `/telemetry`, `/resolve`, `/safety-link`.
  - [x] Pruebas unitarias y de integración HTTP ejecutadas y aprobadas.
- **Subtareas Técnicas**:
  - [x] Implementar `EmergencyDomainService` y `NotificationOrchestrator` en `packages/shared/src/domain/emergency.ts`.
  - [x] Implementar rutas HTTP en `apps/api/src/main.ts`.
  - [x] Escribir pruebas unitarias (`emergency.test.ts`) y de integración API (`api.test.ts`).
  - [x] Compilar y verificar suite completa con `npm test`.
- **Pruebas y Comandos**:
  - `npm --workspace=@atent/shared test`: 3/3 tests aprobados.
  - `npm --workspace=@atent/api test`: 1/1 tests de ciclo de vida HTTP aprobados (156ms).
  - `npm test`: Suite completa de monorepo aprobada sin fallos.
- **Evidencia Registrada**: Registrado en [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md).
- **Bloqueos**: Ninguno para esta vertical funcional.

---

### [ATENT-TASK-007] (ID Original: SEC-001) Auditoría de Seguridad, Hardening de API y Pruebas de Regresión
- **ID Estable**: `ATENT-TASK-007`
- **ID Original**: `SEC-001`
- **MVP / Fase**: MVP 1 / Seguridad, Resiliencia & Hardening
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-005`, `ATENT-TASK-006`
- **Descripción Original**: Auditoría integral de seguridad y análisis estático. Mitigación de 5 hallazgos de seguridad: corrección de CORS permisivo con whitelist, implementación de Rate Limiting por IP (`SimpleRateLimiter`), límite estricto de payload (64 KB / 413), soporte de idempotencia ante reintentos de red (`idempotencyKey`) y control de deriva de reloj / replay attacks (rechazo de marcas temporales desfasadas).
- **Criterios de Aceptación Originales**:
  - [x] Ejecución de auditoría de dependencias (`npm audit`) con 0 vulnerabilidades conocidas.
  - [x] Redacción del informe detallado en `docs/SECURITY_AUDIT.md` clasificando hallazgos por severidad e impacto.
  - [x] CORS restringido a orígenes autorizados locales/móviles.
  - [x] Rate Limiter activo en todos los endpoints HTTP (retorno 429 ante abuso).
  - [x] Protección contra Body Flooding (rechazo inmediato con 413 Payload Too Large ante payloads > 64KB).
  - [x] Idempotencia verificada: reintentos de inicio de alerta con la misma clave devuelven el mismo agregado sin duplicar alertas ni SMS.
  - [x] Control de reloj: rechazo de telemetría con más de 10 minutos en el pasado o 2 en el futuro.
  - [x] Suite de regresión automatizada (`apps/api/src/security.test.ts`) ejecutada y aprobada (4/4 tests).
- **Subtareas Técnicas**:
  - [x] Implementar `SimpleRateLimiter` en `apps/api/src/main.ts`.
  - [x] Agregar control de tamaño de stream en `readBody`.
  - [x] Implementar cache de idempotencia en `EmergencyDomainService`.
  - [x] Implementar validación de clock skew en `ingestTelemetry`.
  - [x] Crear suite `security.test.ts` y validar contra backend.
- **Pruebas y Comandos**:
  - `node --test apps/api/dist/security.test.js`: 4/4 tests aprobados.
  - `npm test`: 24/24 tests aprobados en todo el monorepo.
- **Evidencia Registrada**: Registrado en [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md) y [docs/SECURITY_AUDIT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/SECURITY_AUDIT.md).
- **Bloqueos**: Ninguno.

---

### [ATENT-TASK-008] (ID Original: TRIP-001) Bloque Vertical de Modo Viaje (Trip Mode), Monitoreo y Check-in Seguro
- **ID Estable**: `ATENT-TASK-008`
- **ID Original**: `TRIP-001`
- **MVP / Fase**: MVP 2 / Modo Viaje & Monitoreo Preventivo
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-006`, `ATENT-TASK-007`
- **Descripción Original**: Implementación integral del servicio de dominio de Modo Viaje (`TripDomainService`) y endpoints API REST correspondientes en `apps/api`: inicio de viaje con origen, destino y hora estimada de llegada (ETA), generación de token criptográfico impredecible para seguimiento de ruta, captura de puntos de ruta, check-in seguro con extensión de tiempo estimado, evaluación automática de retraso (overdue), escalado a emergencia si el viaje se retrasa sin check-in y finalización segura con revocación inmediata del enlace.
- **Criterios de Aceptación Originales**:
  - [x] Inicio de viaje con validación de coordenadas de origen, destino y hora estimada de llegada en el futuro.
  - [x] Generación de token criptográfico de alta entropía (`crypto.randomBytes(24).toString('hex')`) para Live Safety Link del viaje.
  - [x] Ingesta de telemetría de ruta continua con validación física de coordenadas terrestres.
  - [x] Consulta pública del viaje vía token (`/api/trip/safety-link/:token`) con sanitización de PII y coordenadas seguras.
  - [x] Check-in seguro (`/api/trip/checkin`) que actualiza la última interacción y opcionalmente extiende el ETA.
  - [x] Detección de retraso (`isOverdue` / `/api/trip/evaluate-overdue`) ante falta de check-in superada la hora de llegada prevista.
  - [x] Finalización segura (`/api/trip/complete`) con revocación inmediata del token de acceso web.
  - [x] Endpoints API REST `/api/trip/start`, `/api/trip/location`, `/api/trip/checkin`, `/api/trip/complete`, `/api/trip/safety-link/:token`, `/api/trip/evaluate-overdue`.
  - [x] Suite de pruebas de dominio y suite de integración HTTP ejecutadas y aprobadas (100% verde).
- **Subtareas Técnicas**:
  - [x] Implementar contratos y lógica de negocio en `packages/shared/src/domain/trip.ts`.
  - [x] Integrar endpoints en `apps/api/src/main.ts`.
  - [x] Escribir pruebas unitarias en `packages/shared/src/domain/trip.test.ts`.
  - [x] Escribir pruebas de integración HTTP en `apps/api/src/trip.test.ts`.
  - [x] Ejecutar suite de pruebas con `npm test`.
- **Pruebas y Comandos**:
  - `npm --workspace=@atent/shared test`: 4/4 pruebas de Trip Mode aprobadas.
  - `node --test apps/api/dist/trip.test.js`: Suite HTTP aprobada (125ms).
  - `npm test`: 29 tests aprobados con 0 fallos en todo el monorepo.
- **Evidencia Registrada**: Registrado en [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md).
- **Bloqueos**: Ninguno.

---

### [ATENT-TASK-009] (ID Original: MOB-002) Cola de Telemetría Offline y Sincronización Automática con Reintentos
- **ID Estable**: `ATENT-TASK-009`
- **ID Original**: `MOB-002`
- **MVP / Fase**: MVP 1 & 2 / Resiliencia Móvil & Conectividad Intermitente
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-005`, `ATENT-TASK-006`
- **Descripción Original**: Implementación de la capa de almacenamiento en cola local y sincronizador de telemetría offline para la aplicación móvil (`OfflineTelemetrySyncManager` y `OfflineStorageAdapter`). Garantiza que durante caídas de cobertura móvil o túneles, las coordenadas de emergencia y de modo viaje se almacenen de forma persistente y se envíen automáticamente en orden secuencial una vez restablecida la red, con protección contra desbordamiento de búfer (límite configurable de 200 puntos, desalojo FIFO del más antiguo) y política de reintentos finitos (`maxRetries`).
- **Criterios de Aceptación Originales**:
  - [x] Adaptador de almacenamiento persistente (`OfflineStorageAdapter` / `InMemoryStorageAdapter`) para desacoplar el motor de persistencia (AsyncStorage / SQLite / Memoria).
  - [x] Validación física de coordenadas antes de encolar; rechazo de puntos fuera de límites terrestres.
  - [x] Persistencia de la cola entre reinicios de la aplicación / ciclo de vida del proceso móvil.
  - [x] Vaciado (`flush`) secuencial que envía los puntos pendientes y purga inmediatamente los confirmados.
  - [x] Manejo de reintentos con límite finito (`maxRetries` por punto); descarte de puntos corruptos o persistentemente fallidos tras agotar reintentos.
  - [x] Límite de tamaño de cola (`maxQueueSize`) con desalojo del punto más antiguo ante saturación de memoria.
  - [x] Suite de pruebas automatizadas en `apps/mobile/src/offline-sync.test.ts` ejecutadas y aprobadas (5/5 tests).
- **Subtareas Técnicas**:
  - [x] Implementar contratos y lógica en `apps/mobile/src/offline-sync.ts`.
  - [x] Exportar componentes desde `apps/mobile/src/index.ts`.
  - [x] Escribir suite de pruebas unitarias en `apps/mobile/src/offline-sync.test.ts`.
  - [x] Compilar paquetes con `tsc -b` y ejecutar suite con `npm test`.
- **Pruebas y Comandos**:
  - `npm --workspace=@atent/mobile test`: 9/9 tests aprobados (4 controller + 5 offline sync).
  - `npm test`: 34 tests aprobados en todo el monorepo sin fallos.
- **Evidencia Registrada**: Registrado en [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md).
- **Bloqueos**: Ninguno.

---

### [ATENT-TASK-010] (ID Original: AUTH-001) Servicio de Autenticación, Sesiones Criptográficas y Endpoints de Identidad
- **ID Estable**: `ATENT-TASK-010`
- **ID Original**: `AUTH-001`
- **MVP / Fase**: MVP 1 / Autenticación, Cuentas & Aislamiento de Usuarios
- **Estado**: `VERIFIED`
- **Dependencias**: `ATENT-TASK-005`, `ATENT-TASK-007`
- **Descripción Original**: Implementación integral del servicio de autenticación (`AuthService`) en `@atent/shared` y endpoints HTTP en `apps/api`: registro seguro de usuarios con derivación criptográfica de contraseñas (`scrypt` con sal única de 16 bytes), emisión de access tokens JWT (`HS256`, 15 min TTL) y refresh tokens criptográficos de alta entropía (`rft_` con 7 días TTL), almacenamiento seguro de hashes SHA-256 de refresh tokens, rotación atómica de refresh tokens (prevención de robo de sesión), revocación de sesiones, cierre de sesión (`/api/auth/logout`), consulta de perfil autenticado (`/api/auth/me`) y aislamiento estricto de usuarios (prohibición terminante de que un usuario revoque o acceda a sesiones de otro).
- **Criterios de Aceptación Originales**:
  - [x] Registro de usuario con hash seguro `scrypt`, nunca almacenando contraseñas en texto plano ni exponiendo el hash/sal en respuestas.
  - [x] Rechazo de emails duplicados con respuesta controlada 409 Conflict.
  - [x] Login con verificación en tiempo constante (`crypto.timingSafeEqual`) contra ataques de temporización.
  - [x] Emisión de pares de tokens (`accessToken` y `refreshToken`) con tipos definidos en `@atent/types`.
  - [x] Rotación obligatoria de refresh tokens: cada invocación a `/api/auth/refresh` genera un nuevo par y revoca de inmediato el refresh token utilizado.
  - [x] Detección y rechazo inmediato de tokens con firma inválida, expirados o con sesión subyacente revocada (401 Unauthorized).
  - [x] Control estricto de aislamiento: un usuario no puede revocar sesiones que no le pertenezcan (`UNAUTHORIZED_SESSION_ACCESS`).
  - [x] Endpoints API REST `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`, `/api/auth/logout`.
  - [x] Suite de pruebas unitarias (`auth.test.ts`) e integración HTTP (`apps/api/src/auth.test.ts`) ejecutadas y aprobadas (100% verde).
- **Subtareas Técnicas**:
  - [x] Definir contratos de sesión en `packages/types/src/security/index.ts`.
  - [x] Implementar `AuthService` en `packages/shared/src/domain/auth.ts`.
  - [x] Escribir suite unitaria criptográfica en `packages/shared/src/domain/auth.test.ts`.
  - [x] Implementar endpoints REST en `apps/api/src/main.ts`.
  - [x] Escribir suite de integración HTTP en `apps/api/src/auth.test.ts`.
  - [x] Ejecutar suite en todo el monorepo y registrar evidencia.
- **Pruebas y Comandos**:
  - `npm --workspace=@atent/shared test`: 6/6 tests de autenticación aprobados.
  - `node --test apps/api/dist/auth.test.js`: 1/1 suite de integración HTTP aprobada (319ms).
  - `npm test`: 41 tests aprobados con 0 fallos en todo el monorepo.
- **Evidencia Registrada**: Registrado en [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md).
- **Bloqueos**: Ninguno.

---

## 4. Backlog Funcional de Productos (Notion — Pendiente de Ingestión)

> [!CAUTION]
> **BLOQUEADO POR [BLK-001]**:
> El volcado de las filas completas del backlog maestro de Notion, con sus descripciones literales, notas, plataformas y criterios de aceptación originales, se realizará en esta sección en cuanto se provea el archivo o texto fuente. Cada una recibirá su ID estable manteniendo intacto el identificador numérico de Notion.
## Release 1.1.0 — Red de Confianza
### ATENT-TASK-012 — Solicitudes por teléfono e importación de agenda
- Estado: `VERIFIED`
- RPC `find_profile_by_phone`, autocompletado desde agenda Android, avisos Realtime y confirmación mutua.
- Verificación: build web OK, 32 pruebas OK, APK debug 1.1.0 compilado.

### ATENT-TASK-013 — Alertas privadas con telemetría en vivo y notificación nativa
- Estado: `IMPLEMENTED`
- Corrección del error `recipient_user_id = null` al enviar solicitudes: `find_profile_by_phone` se consume como arreglo PostgREST.
- Funciones SQL `get_trusted_alerts` y `get_trusted_alert_locations` limitan la lectura a contactos aceptados.
- Alertas del remitente registran ubicación, batería, carga y modo viaje/vehículo; el panel receptor presenta mapa y estado actualizado por Realtime/sondeo.
- Android incorpora notificación de alta prioridad con tono de alarma y vibración, respetando la autorización explícita del sistema para DND.
- Verificación ejecutada: `npm run build`, `npm test` (75 pruebas), `:app:assembleDebug` exitosos.
- Pendiente para `VERIFIED`: ejecutar `infrastructure/supabase_migration_v2_alerts.sql` en el proyecto Supabase de sandbox y validar con dos dispositivos/cuentas reales de prueba.

## Release 1.2.0 — Alerta audible persistente

### ATENT-TASK-017 — Recepción de alertas con app retirada de recientes
- Estado: `IMPLEMENTED`
- El receptor de alertas ya no depende del WebView activo: Android inicia `TrustedAlertPollingService` al autenticarse, conserva el usuario en almacenamiento privado y consulta `get_trusted_alerts` cada 5 segundos.
- Cuando detecta una alerta activa nueva, inicia `IncomingEmergencyAlertService` para notificación persistente, sonido en bucle y vibración. Cerrar sesión detiene y limpia el receptor.
- Se mantiene la limitación de plataforma: Android puede detener servicios tras “Forzar detención”, restricciones OEM o ahorro extremo de batería; una app no puede evadir esas políticas.
- Verificación: bundle web compilado correctamente; `:app:assembleDebug` compilado correctamente después de agregar el servicio nativo.
- Pendiente para `VERIFIED`: prueba física con dos dispositivos, app retirada de recientes y permisos de notificación concedidos.

### ATENT-TASK-014 — Sonido personalizado y vibración hasta abrir Alertas
- Estado: `IMPLEMENTED`
- Se incorpora `sonido/alerta sonido.mp3` como recurso nativo `alert_sound.mp3`.
- La detección por polling también inicia `IncomingEmergencyAlertService`, aunque Realtime no entregue el evento al WebView.
- El servicio reproduce el sonido en bucle y vibra hasta que Atent entra al panel de Alertas o el usuario abre la app.
- Se añade acceso explícito a los ajustes de acceso de No molestar; Android no permite concederlo ni modificar el volumen silenciosamente.
- Versión Android: `versionName 1.2.0`, `versionCode 3`.

### ATENT-TASK-015 — Ubicación refrescable y onboarding de permisos
- Estado: `IMPLEMENTED`
- Botón `Actualizar ubicación` para solicitar una lectura GPS nueva y refrescar el punto del mapa.
- Actualización automática de ubicación cada 10 segundos en la pantalla Ubicación, durante SOS y durante Modo viaje.
- Onboarding bloqueante para ubicación foreground/background, agenda, notificaciones y acceso especial de No molestar.
- Tutorial posterior de tres pasos antes de marcar la configuración inicial como completa.
- Estilo de mapa actual: MapLibre GL + OpenStreetMap, sin API key; el bundle web y el bundle Android usan la misma configuración.
- Corrección 2026-10-25: Android solicita `CurrentLocationRequest` con `maxUpdateAgeMillis=0`; ya no usa `lastLocation` como respuesta al botón.
- Corrección 2026-10-25: el receptor usa `last_recorded_at` de la última fila de `emergency_locations`; requiere ejecutar `infrastructure/supabase_migration_v3_live_location.sql`.
