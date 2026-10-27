# TRACEABILITY_MATRIX.md — Matriz de Trazabilidad de Ingeniería

Esta matriz establece la trazabilidad bidireccional estricta:
**Requisito / Fuente → Tarea → Módulo/Código Afectado → Prueba Automatizada → Evidencia de Certificación**

---

## 1. Matriz de Trazabilidad

| ID Requisito | Descripción del Requisito | Tarea ID Estable | Tarea ID Original | Módulo / Código Afectado | Prueba Automatizada | Evidencia / Resultado | Estado DoD |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `REQ-GOV-001` | Establecer protocolo de ingeniería multidisciplinario y normas de gobernanza | `ATENT-TASK-001` | `SETUP-001` | `AGENTS.md`, `docs/*` | Inspección de entorno (`node`, `npm`, `git`, `java`) | [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md) | `VERIFIED` |
| `REQ-ARCH-001` | Estructurar monorepo `safe-app` con workspaces y tipado estricto | `ATENT-TASK-002` | `SETUP-002` | `package.json`, `tsconfig.base.json`, `apps/*`, `packages/*` | `npm run build --workspaces`, `npm test` | [TEST_REPORT.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/TEST_REPORT.md) (0 fallos) | `VERIFIED` |
| `REQ-DOM-001` | Contratos compartidos de alertas, contactos y telemetría de geolocalización | `ATENT-TASK-002` | `SETUP-002` | `packages/shared/src/types/index.ts` | `tsc -b` (compilación estricta sin errores) | Build log exitoso | `VERIFIED` |
| `REQ-SEC-001` | Sanitización estricta de logs y protección de PII/coordenadas (Reglas 9 y 10) | `ATENT-TASK-002` | `SETUP-002` | `packages/shared/src/utils/index.ts` | `npm --workspace=@atent/shared test` | 5/5 pruebas unitarias aprobadas | `VERIFIED` |
| `REQ-AUDIT-001` | Inventario y verificación física de acceso a fuentes de Notion sin suposiciones | `ATENT-TASK-003` | `AUDIT-001` | `docs/SOURCE_INVENTORY.md`, `docs/TRACEABILITY_MATRIX.md` | Comprobación física de rutas de archivos | [SOURCE_INVENTORY.md](file:///d:/PROGRAMACION/PROYECTOS/Atent/docs/SOURCE_INVENTORY.md) | `VERIFIED` |

---

## 2. Cobertura de Requisitos

- **Requisitos de Infraestructura y Gobernanza Identificados**: 5
- **Requisitos con Código y Pruebas Implementados**: 5 (100%)
- **Requisitos Funcionales de Producto**: *Pendientes de la carga del Backlog de Notion.*
