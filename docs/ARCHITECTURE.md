# ARCHITECTURE.md — Arquitectura del Sistema Atent

Este documento detalla la arquitectura técnica, componentes, modelos de comunicación y directrices de seguridad de la plataforma **Atent**.

---

## 1. Visión General del Monorepo (`safe-app`)

La solución se organiza como un monorepo modular con workspaces para maximizar la reutilización de código de tipos, contratos y utilidades de validación:

```text
Atent/
├── apps/
│   ├── mobile/         # Aplicación Móvil (React Native + TypeScript + Kotlin nativo)
│   ├── api/            # Backend API (NestJS + TypeScript)
│   └── safety-web/     # Portal Web de Seguridad y Visualización (Next.js / React)
├── packages/
│   ├── shared/         # Tipos compartidos, DTOs, constantes y esquemas de validación
│   └── config/         # Configuraciones compartidas (ESLint, Prettier, TypeScript)
├── docs/               # Documentación y trazabilidad de ingeniería
└── package.json        # Configuración raíz de npm workspaces
```

---

## 2. Componentes y Responsabilidades

### 2.1. `apps/api` (Backend — NestJS + TypeScript)
- **Framework**: NestJS con arquitectura hexagonal / clean architecture por módulos.
- **Base de Datos**: PostgreSQL para almacenamiento persistente y transaccional (usuarios, contactos de emergencia, eventos, auditoría).
- **Caché y Estado Efímero**: Redis utilizado exclusivamente para:
  - Tokens temporales de acceso a sesiones de emergencia.
  - Almacenamiento volátil de telemetría/coordenadas en vivo durante eventos activos.
  - Rate-limiting (protección contra abuso de llamadas de auxilio o endpoints de autenticación).
- **Seguridad**:
  - Autenticación con JWT de corta duración y refresh tokens rotativos.
  - Enlaces de visualización temporal con identificadores criptográficamente aleatorios (high-entropy tokens) y caducidad estricta.
  - Sanitización de logs (exclusión de PII, teléfonos y coordenadas exactas en registros de depuración).

### 2.2. `apps/mobile` (Móvil — React Native + Kotlin)
- **Framework**: React Native con TypeScript.
- **Módulos Nativos (Android / Kotlin)**:
  - Listener para activación física (e.g. patrón de botones si está en el alcance del MVP).
  - Servicio Foreground con notificación persistente para seguimiento continuo cuando un evento de seguridad está en curso.
  - Manejo adaptativo de restricciones de sistema operativo (Doze Mode, App Standby).
- **Diseño**: Aplicación de principios de diseño empático, alto contraste y usabilidad en situaciones de estrés según `frontend-design` y `brand-guidelines`.

### 2.3. `apps/safety-web` (Web — Next.js / React)
- **Framework**: Next.js (App Router) con TypeScript.
- **Propósito**:
  - Visor seguro para contactos de emergencia que reciben un enlace temporal de alerta.
  - Panel de control y configuración del usuario o administradores si el backlog lo contempla.
  - Visualización de mapa en tiempo real durante eventos activos.
- **Estilos**: Vanilla CSS con tokens de diseño armoniosos, modo oscuro y alta legibilidad sin librerías externas innecesarias.

### 2.4. `packages/shared` (Contratos Compartidos)
- Interfaces de dominio comunes (`User`, `EmergencyContact`, `AlertSession`, `GeoPoint`).
- DTOs de solicitud/respuesta validados con `zod` o `class-validator`.
- Constantes de seguridad, códigos de error estandarizados y límites de tiempo.

---

## 3. Modelo de Persistencia y Datos

- **PostgreSQL**:
  - Diseñado con integridad referencial estricta y marcas temporales UTC (`created_at`, `updated_at`).
  - Índices sobre campos de consulta frecuente (identificadores de usuario, estado de alertas).
  - Retención limitada de datos de geolocalización histórica para salvaguardar la privacidad (GDPR / normativas de protección de datos personales).
- **Redis**:
  - Claves con TTL (Time-To-Live) obligatorio.
  - Ningún dato de persistencia a largo plazo depende de Redis.

---

## 4. Principios de Seguridad y Privacidad

1. **Minimización de Datos**: Solo se capturan y transmiten las coordenadas cuando el usuario inicia explícitamente un evento de seguridad o monitoreo activo.
2. **Consentimiento Informado**: La aplicación explica claramente el propósito de los permisos de ubicación en segundo plano y SMS/llamadas antes de solicitarlos al sistema.
3. **Cero Secretos**: Variables de configuración desacopladas mediante `.env` (con plantillas `.env.example`).
4. **Respeto a Restricciones de SO**: Toda la arquitectura asume que la red y el hardware pueden fallar; no se realizan falsas promesas de garantía de auxilio.

> [!NOTE]
> Esta arquitectura está sujeta a confirmación y refinamiento final tan pronto como se incorpore la documentación oficial de Notion del proyecto Atent.
