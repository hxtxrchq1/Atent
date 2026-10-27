# INTEGRATION_AUDIT.md — Auditoría Forense de Integraciones Reales vs. Mocks

Este documento audita exhaustivamente el estado real de todas las integraciones del sistema **Atent**, distinguiendo de forma rigurosa entre integraciones productivas conectadas, sandboxes/adaptadores de prueba, y simulaciones en memoria.

---

## 1. Firebase Cloud Messaging (FCM) — Push Notifications

- **Estado Actual**: **SIMULADO MEDIANTE ADAPTADOR DE PRUEBAS (`MockPushAdapter`)**.
- **Evidencia en Código**: `packages/shared/src/domain/emergency.ts#L90-L108`.
- **Implementación Técnica**:
  - `NotificationOrchestrator` implementa despacho desacoplado mediante la interfaz `NotificationAdapter`.
  - El backend cuenta con el endpoint REST `/api/emergency/push-token` (`apps/api/src/main.ts#L159-L165`) que asocia tokens FCM al usuario y los almacena en memoria.
  - Al dispararse la alerta, `NotificationOrchestrator.dispatchAlert()` genera los payloads dirigidos a los tokens asociados al contacto (`apps/api/src/acknowledge.test.ts`).
  - **Límite Forense**: NO existe conexión activa a las credenciales `FIREBASE_SERVER_KEY` o cuenta de servicio de Google Cloud (`google-services.json`). En producción se requiere inyectar un adaptador `FcmPushAdapter` que consuma `firebase-admin`.

---

## 2. Proveedor SMS (Twilio / AWS SNS / Sinch)

- **Estado Actual**: **SIMULADO MEDIANTE SANDBOX LOCAL (`MockSmsAdapter`)**.
- **Evidencia en Código**: `packages/shared/src/domain/emergency.ts#L72-L88`.
- **Implementación Técnica**:
  - El adaptador valida el formato de número internacional según el estándar E.164 (`isValidPhoneNumber`). Si el número es inválido, rechaza con código de error `ERR_INVALID_PHONE` y registra el fallo en el historial del despacho.
  - Genera IDs de entrega trazables (`sandbox_${UUID}`) y almacena el mensaje formateado con el Live Safety Link.
  - **Límite Forense**: Ningún SMS real es transmitido por red de telecomunicaciones. Cumple con la **Regla 7 de AGENTS.md** (prohibición de acciones de producción sin autorización ni incurrir en costes).

---

## 3. Persistencia de Datos (PostgreSQL vs. In-Memory)

- **Estado Actual**: **MODELADO COMPLETO Y LISTO; SERVICIOS CORRIENDO EN MEMORIA / CACHÉ LOCAL**.
- **Evidencia en Código**:
  - Esquema SQL: `infrastructure/init.sql` (define tablas `users`, `emergency_contacts`, `alert_sessions`, `telemetry_points`, `offline_sync_queue`, índices espaciales y triggers).
  - Entorno Docker: `docker-compose.yml` (servicios `postgres:16-alpine` y `redis:7-alpine`).
  - Servicios de Dominio: `AuthService`, `EmergencyDomainService`, `TripDomainService` utilizan estructuras `Map<string, T>` concurrentes para permitir ejecución local autónoma, determinista y suites de pruebas sin requerir un demonio Docker activo obligatorio.
  - Cliente Móvil: `OfflineTelemetrySyncManager` implementa persistencia local en cola persistente simulada mediante almacenamiento síncrono/asíncrono desacoplado (`apps/mobile/src/offline-sync.ts`).

---

## 4. Captura de Ubicación GPS (Nativa vs. Ingesta)

- **Estado Actual**: **VALIDADOR Y CONTROLADOR COMPLETOS; INGESTA DE PRUEBAS/EMULADA**.
- **Evidencia en Código**:
  - Capa Móvil: `MobileAlertController.updateCoordinates()` (`apps/mobile/src/index.ts#L36`) valida rangos geodésicos terrestres (-90 a 90 latitud, -180 a 180 longitud) y rechaza lecturas inválidas.
  - Cola Offline: `OfflineTelemetrySyncManager` (`apps/mobile/src/offline-sync.ts`) persiste coordenadas cuando se pierde conectividad y las vacía en bloque con reintentos exponenciales y política FIFO al restablecerse la red.
  - Backend: `EmergencyDomainService.ingestTelemetry()` (`packages/shared/src/domain/emergency.ts#L271`) verifica consistencia temporal (descarte de timestamps con deriva > 10 min o futuro > 2 min para mitigar ataques de repetición).
  - **Límite Forense**: En ausencia de APK nativo corriendo en hardware físico, las lecturas provienen de eventos inyectados programáticamente, no del chipset GNSS del dispositivo.

---

## 5. Pruebas End-to-End (E2E) Frontend/Backend

- **Estado Actual**: **INTEGRACIÓN HTTP COMPLETA A NIVEL API Y SHOWCASE REACT RESPONSIVO**.
- **Evidencia**:
  - API HTTP: `apps/api/src/api.test.ts` y `apps/api/src/acknowledge.test.ts` prueban flujos reales completos sobre socket HTTP (`node:http` con payloads JSON reales, códigos HTTP 201, 200, 400, 401, 413, 429).
  - Portal Web: `apps/safety-web/src/DesignShowcaseApp.tsx` compila a producción vía Vite (`dist/index.html` y bundles JS/CSS optimizados) implementando los 8 flujos visuales (Onboarding, Permisos, SOS, Contactos, Live Safety Link, Modo Viaje, Errores).
