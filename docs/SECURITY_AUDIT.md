# SECURITY_AUDIT.md — Informe de Auditoría Técnica y de Seguridad de Atent

Este documento registra los hallazgos de seguridad, análisis de superficie de ataque, clasificación de severidad y las medidas de mitigación y hardening aplicadas en el código de **Atent**.

---

## 1. Resumen Ejecutivo de Seguridad

- **Fecha de Auditoría**: 2026-10-22
- **Alcance Auditado**: Backend (`apps/api`), Lógica de Dominio (`packages/shared`), Mobile Core (`apps/mobile`), Validaciones (`packages/validation`) y Dependencias de Node (`npm audit`).
- **Estado de Dependencias**: 0 vulnerabilidades conocidas detectadas (`npm audit`).
- **Cero Secretos (Regla 10)**: Confirmado en todo el árbol de Git (`.env.example` sanitizado).

---

## 2. Hallazgos Identificados y Clasificación

| ID Hallazgo | Componente | Severidad | Descripción del Riesgo | Impacto | Estado de Mitigación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SEC-001` | `apps/api/src/main.ts` | **ALTA** | CORS configurado con comodín permisivo `Access-Control-Allow-Origin: *`. | Permite a cualquier dominio web de terceros realizar peticiones cruzadas contra endpoints de la API. | **CORREGIDO** (Restringido a orígenes autorizados e inspección de headers). |
| `SEC-002` | `apps/api/src/main.ts` | **ALTA** | Ausencia de Rate Limiting en endpoints sensibles (`/api/emergency/initiate`, `/telemetry`). | Riesgo de denegación de servicio (DoS) o saturación maliciosa de despachos SMS/red. | **CORREGIDO** (Implementado `RateLimiter` por IP con ventana deslizante de peticiones). |
| `SEC-003` | `apps/api/src/main.ts` | **MEDIA** | Límite de tamaño de payload no configurado en lectura de body JSON. | Riesgo de ataque por agotamiento de memoria si se envía un JSON gigantesco. | **CORREGIDO** (Límite estricto de 64 KB en `readBody`). |
| `SEC-004` | `packages/shared/src/domain/emergency.ts` | **ALTA** | Falta de control de idempotencia ante reintentos de red durante el inicio de alerta. | Posible duplicación de eventos de emergencia y múltiples SMS enviados si el cliente reintenta por mala cobertura. | **CORREGIDO** (Soporte de `idempotencyKey` para devolver el mismo agregado activo sin redisparar notificaciones). |
| `SEC-005` | `packages/shared/src/domain/emergency.ts` | **MEDIA** | Ingesta de telemetría sin validación de marcas de tiempo futuras o pasadas extremas (device clock skew). | Un reloj de dispositivo desfasado podría distorsionar la línea de tiempo forense de la emergencia. | **CORREGIDO** (Validación de deriva temporal de timestamp máximo ±10 minutos). |
| `SEC-006` | Android Native / OS Limits | **INFORMATIVO** | Restricciones de Doze Mode, App Standby y DND en Android. | Límites inherentes del SO documentados en cumplimiento de la Regla 8. | **DOCUMENTADO / MITIGADO** (Foreground Service y advertencias). |

---

## 3. Matriz de Correcciones Implementadas

### Mitigación SEC-001 & SEC-002 & SEC-003: Hardening de API Server
- Implementación de `InMemoryRateLimiter` (máximo 30 peticiones por minuto para endpoints de emergencia, 5 para inicio de alertas).
- Protección de tamaño de payload: `MAX_BODY_BYTES = 65536` (64 KB). Retorna `413 Payload Too Large` ante excesos.
- CORS seguro: validación de origen contra lista blanca (`API_CORS_ORIGIN` y localhost).

### Mitigación SEC-004: Idempotencia en Inicio de Emergencia
- Soporte para `idempotencyKey` en `CreateAlertDto`.
- Si la app móvil reintenta el envío de la misma emergencia por caída temporal de conectividad, el orquestador detecta la clave y no duplica los SMS a los contactos de confianza.

### Mitigación SEC-005: Control de Timestamp y Deriva de Reloj
- Se valida que las coordenadas contengan un `timestamp` coherente con UTC del servidor (máximo 10 minutos en el pasado o 2 minutos en el futuro por jitter de red).
