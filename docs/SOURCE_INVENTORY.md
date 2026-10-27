# SOURCE_INVENTORY.md — Inventario y Auditoría de Acceso a Fuentes

Este documento registra la verificación de acceso físico a cada una de las fuentes documentales requeridas para el proyecto **Atent**, conforme a la regla estricta de no asumir que conocer un título equivale a haber accedido a su contenido real.

---

## 1. Verificación de Fuentes Requeridas

| ID Fuente | Nombre / Sección de la Fuente | Ubicación Esperada | Acceso Físico Real | Estado de Inspección | Contenido Extraído / Notas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SRC-001` | Página Principal / Visión General | Notion export / Local workspace | **NO ACCESIBLE** | `PENDING_INGESTION` | No existe archivo local en el workspace ni en subdirectorios. |
| `SRC-002` | Metodología de Trabajo y Roles | Notion export / Local workspace | **NO ACCESIBLE** | `PENDING_INGESTION` | No existe archivo local. Normas operativas sintetizadas en `AGENTS.md`. |
| `SRC-003` | Contexto e Identidad del Producto | Notion export / Local workspace | **NO ACCESIBLE** | `PENDING_INGESTION` | No disponible en disco. |
| `SRC-004` | Tecnología y Arquitectura Oficial | Notion export / Local workspace | **NO ACCESIBLE** | `PENDING_INGESTION` | Especificación original de Notion no presente. Base técnica monorepo `safe-app` documentada en `docs/ARCHITECTURE.md`. |
| `SRC-005` | Recursos / Importaciones / Assets | Notion export / Local workspace | **NO ACCESIBLE** | `PENDING_INGESTION` | No hay assets, SVGs o especificaciones de importaciones en el workspace. |
| `SRC-006` | Documentos de MVP (Alcance y Exclusiones) | Notion export / Local workspace | **NO ACCESIBLE** | `PENDING_INGESTION` | No disponibles en disco. |
| `SRC-007` | Diseños / Wireframes / Guías UI | Notion export / Figma links / Local | **NO ACCESIBLE** | `PENDING_INGESTION` | Diseños visuales detallados ausentes en disco. Skills de diseño disponibles en `.agents/skills/`. |
| `SRC-008` | Backlog Maestro (Filas, Criterios, Dependencias) | Notion Database export / Local | **NO ACCESIBLE** | `PENDING_INGESTION` | Base de datos de tareas de Notion no transferida al workspace. |

---

## 2. Resultado de la Auditoría de Fuentes

- **Total de Fuentes Evaluadas**: 8
- **Fuentes con Acceso Completo Confirmado**: 0 / 8 (0%)
- **Fuentes No Disponibles en Disco**: 8 / 8 (100%)

### Conclusión Técnica y Operativa
En cumplimiento estricto de las directrices:
1. **No se asume el contenido a partir de títulos o nociones genéricas.**
2. No se pueden inventar las filas exactas del backlog, criterios de aceptación específicos, ni dependencias originales sin riesgo de violar la fuente de verdad.
3. Se requiere que el usuario copie, mueva o exporte los archivos de Notion al proyecto (por ejemplo, en `docs/notion/` o directamente en texto/markdown).
