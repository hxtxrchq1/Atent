# BLOCKERS.md — Registro de Bloqueos e Impedimentos

Este documento centraliza todos los factores de bloqueo activos y resueltos que impiden el avance de tareas del backlog en el proyecto Atent.

---

## Bloqueos Activos

### [BLK-001] Documentación Funcional de Notion No Disponible en el Workspace Local
- **Fecha de Identificación**: 2026-10-22
- **Impacto**: Crítico / Alto
- **Tareas Afectadas**: Definición y ejecución del backlog funcional de los MVPs (requerimientos, historias de usuario, criterios de aceptación específicos, modelos de dominio exactos).
- **Descripción**:
  La instrucción del proyecto establece que el backlog y los criterios de aceptación de la documentación de Notion son la única fuente de verdad y que no se deben inventar requisitos faltantes. Al inspeccionar el workspace `d:\PROGRAMACION\PROYECTOS\Atent`, no se encuentra presente ningún archivo de exportación de Notion, documento de especificación funcional o backlog detallado.
- **Acción Requerida**:
  El usuario debe proporcionar la documentación de Notion del proyecto Atent (por ejemplo, exportando las páginas o carpetas a Markdown/PDF/archivos de texto dentro del workspace, por ejemplo en `docs/notion/` o `docs/specs/`, o pegando el contenido del backlog con sus criterios de aceptación).
### [BLK-002] Docker Daemon / Docker Desktop No Instalado en PATH del Sistema
- **Fecha de Identificación**: 2026-10-22
- **Impacto**: Medio (Entorno de desarrollo local)
- **Tareas Afectadas**: Ejecución de contenedores locales de PostgreSQL y Redis mediante `docker-compose`.
- **Descripción**:
  El comando `docker` no está registrado en el PATH de Windows. Esto impide arrancar contenedores Docker directamente en la máquina del desarrollador sin instalar Docker Desktop o configurar PostgreSQL/Redis como servicios nativos de Windows o usar mocks/SQLite/in-memory para tests locales.
- **Acción Requerida**:
  Para entornos contenerizados, se provee `infrastructure/docker-compose.yml`. En local, se configura soporte de persistencia desacoplada (con fallback en memoria / SQLite para tests rápidos).

---

## Historial de Bloqueos Resueltos

### [BLK-003] Compilación de APK Nativo de Android — RESUELTO
- **Fecha de Resolución**: 2026-10-23
- **Solución Implementada**:
  Se verificó la instalación del Android SDK en `C:\Users\Alonso\AppData\Local\Android\Sdk` con API 34 y Build-tools 34.0.0. Se configuró Gradle Wrapper 8.7 en `apps/mobile/android` y se compiló exitosamente el APK de producción/debug (`app-debug.apk` con tamaño de 9.9 MB) incluyendo el bundle web compilado de `apps/safety-web`.

