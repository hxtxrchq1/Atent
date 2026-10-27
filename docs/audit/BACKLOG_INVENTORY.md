# BACKLOG_INVENTORY.md — Inventario Forense de Referencia

Este documento contiene el inventario exhaustivo, inmutable y ordenado de la lista proporcionada por el usuario como fuente de verdad.

## Nota de Conciliación de Conteo
- **Título en el prompt**: "86 ENTRADAS"
- **Líneas enumeradas en la lista del prompt**: 92 líneas numeradas (`01.` a `92.`).
- **Análisis Forense**: Se conservan y auditan las **92 líneas literales** asignando identificadores estables `ATENT-001` a `ATENT-092`. Ninguna línea ha sido omitida, eliminada ni inventada.
- Se documenta explícitamente cualquier duplicación o subfase (ej. "Definir alcance del producto 2", "Definir flujo de emergencia 2", "Diseñar Live Safety Link" x3, etc.) manteniendo trazabilidad unitaria e independiente para cada una.

---

| ID Estable | N° Original | Nombre Original Exacto | Área Funcional |
| :--- | :--- | :--- | :--- |
| `ATENT-001` | 01 | Definir propósito y alcance del producto | Producto / Alcance |
| `ATENT-002` | 02 | Definir comportamiento de contactos | Producto / Contactos |
| `ATENT-003` | 03 | Definir alcance del producto 2 | Producto / Alcance Fase 2 |
| `ATENT-004` | 04 | Definir contenido de la alerta | Producto / Notificaciones |
| `ATENT-005` | 05 | Definir flujo de emergencia 2 | Producto / Flujo de Emergencia |
| `ATENT-006` | 06 | Definir comportamiento de alerta recibida | Producto / Receptor |
| `ATENT-007` | 07 | Definir Live Safety Link | Producto / Live Link |
| `ATENT-008` | 08 | Definir modo viaje | Producto / Modo Viaje |
| `ATENT-009` | 09 | Definir alcance Android-first | Arquitectura / Plataforma |
| `ATENT-010` | 10 | Definir permisos y privacidad | Seguridad / Privacidad |
| `ATENT-011` | 11 | Documentar requisitos funcionales | Documentación / Requisitos |
| `ATENT-012` | 12 | Documentar requisitos no funcionales | Documentación / Requisitos |
| `ATENT-013` | 13 | Definir casos de uso | Producto / Casos de Uso |
| `ATENT-014` | 14 | Definir estados de emergencia | Dominio / Estados SOS |
| `ATENT-015` | 15 | Definir reglas de expiración del link | Dominio / Expiración & TTL |
| `ATENT-016` | 16 | Definir prioridad de notificaciones | Backend / Notificaciones |
| `ATENT-017` | 17 | Definir estrategia SMS | Integraciones / SMS Fallback |
| `ATENT-018` | 18 | Crear arquitectura de información | UX / Arquitectura de Información |
| `ATENT-019` | 19 | Diseñar onboarding | UX / Onboarding |
| `ATENT-020` | 20 | Diseñar flujo de contactos | UX / Contactos |
| `ATENT-021` | 21 | Diseñar flujo de emergencia | UX / Emergencia |
| `ATENT-022` | 22 | Diseñar flujo de alerta recibida | UX / Alerta Recibida |
| `ATENT-023` | 23 | Diseñar Live Safety Link | UX / Live Safety Link |
| `ATENT-024` | 24 | Diseñar modo viaje | UX / Modo Viaje |
| `ATENT-025` | 25 | Diseñar errores y estados vacíos | UX / Estados de Error |
| `ATENT-026` | 26 | Crear wireframes | Diseño / Wireframes |
| `ATENT-027` | 27 | Crear sistema visual básico | UI / Sistema de Diseño |
| `ATENT-028` | 28 | Diseñar pantalla principal | UI / Home Screen |
| `ATENT-029` | 29 | Diseñar contactos confiables | UI / Contactos Screen |
| `ATENT-030` | 30 | Diseñar alerta recibida | UI / Receptor Screen |
| `ATENT-031` | 31 | Diseñar Live Safety Link | UI / Web Viewer Screen |
| `ATENT-032` | 32 | Diseñar modo viaje | UI / Modo Viaje Screen |
| `ATENT-033` | 33 | Crear prototipo end-to-end | Prototipo / Validación Visual |
| `ATENT-034` | 34 | Elegir stack Android | Arquitectura / Mobile Stack |
| `ATENT-035` | 35 | Definir arquitectura móvil | Arquitectura / Mobile Architecture |
| `ATENT-036` | 36 | Definir arquitectura backend | Arquitectura / Backend Architecture |
| `ATENT-037` | 37 | Definir API inicial | Backend / Contratos REST |
| `ATENT-038` | 38 | Crear repositorios Git | DevOps / Repositorio & Monorepo |
| `ATENT-039` | 39 | Configurar variables de entorno | DevOps / Configuración de Entorno |
| `ATENT-040` | 40 | Diseñar modelo de datos | Base de Datos / Modelo Relacional |
| `ATENT-041` | 41 | Crear base de datos y migraciones | Base de Datos / Migraciones SQL |
| `ATENT-042` | 42 | Implementar usuarios y autenticación | Backend / Autenticación |
| `ATENT-043` | 43 | Implementar contactos confiables | Backend / Gestión de Contactos |
| `ATENT-044` | 44 | Implementar sesiones de emergencia | Backend / Ciclo de Alerta |
| `ATENT-045` | 45 | Implementar ubicaciones | Backend / Ingesta de Telemetría |
| `ATENT-046` | 46 | Implementar tokens temporales | Seguridad / Criptografía de Tokens |
| `ATENT-047` | 47 | Implementar API de alerta | Backend / API REST SOS |
| `ATENT-048` | 48 | Inicializar proyecto Android | Mobile / Scaffolding Mobile |
| `ATENT-049` | 49 | Implementar navegación | Mobile / Navegación Móvil |
| `ATENT-050` | 50 | Implementar onboarding | Mobile / Pantallas de Onboarding |
| `ATENT-051` | 51 | Implementar autenticación | Mobile / Flujo de Login y Registro |
| `ATENT-052` | 52 | Implementar home | Mobile / Pantalla Home Principal |
| `ATENT-053` | 53 | Implementar botón de emergencia | Mobile / Botón SOS y Disparador |
| `ATENT-054` | 54 | Implementar pantalla de contactos | Mobile / UI Contactos Confiables |
| `ATENT-055` | 55 | Implementar switch de viaje | Mobile / Activación Modo Viaje |
| `ATENT-056` | 56 | Integrar selector de contactos del sistema | Mobile / Contact Picker Nativo |
| `ATENT-057` | 57 | Registrar token push | Mobile / FCM Token Handler |
| `ATENT-058` | 58 | Implementar envío push | Backend / Dispatcher Push FCM |
| `ATENT-059` | 59 | Integrar proveedor SMS | Backend / SMS Gateway Adapter |
| `ATENT-060` | 60 | Implementar selección de canal | Backend / Notificator Channel Router |
| `ATENT-061` | 61 | Configurar notificación de alta importancia | Mobile / Android Notification Channel |
| `ATENT-062` | 62 | Registrar resultados de notificación | Backend / Audit Log de Envíos |
| `ATENT-063` | 63 | Generar link temporal | Backend / Link Generator Service |
| `ATENT-064` | 64 | Implementar permisos de ubicación | Mobile / Location Permission Flow |
| `ATENT-065` | 65 | Crear interfaz web del link | Web / Safety Link Viewer Portal |
| `ATENT-066` | 66 | Integrar mapa | Web / Map Component |
| `ATENT-067` | 67 | Actualizar ubicación en link | Web / Live Telemetry Poller / Stream |
| `ATENT-068` | 68 | Bloquear link expirado | Web / Bloqueo y Revocación Link |
| `ATENT-069` | 69 | Implementar Estoy al tanto | Backend / Receptor Acknowledge API |
| `ATENT-070` | 70 | Implementar alerta recibida dentro de app | Mobile / In-App Alert Receiver UI |
| `ATENT-071` | 71 | Abrir alerta desde push | Mobile / Deep Link & Notification Tap |
| `ATENT-072` | 72 | Implementar inicio de viaje | Backend / Mobile / Start Trip |
| `ATENT-073` | 73 | Implementar estados del viaje | Dominio / Estados de Modo Viaje |
| `ATENT-074` | 74 | Agregar razones de inseguridad | Dominio / Check-in & Insecurity Flags |
| `ATENT-075` | 75 | Notificar cambios de viaje | Backend / Notificaciones Modo Viaje |
| `ATENT-076` | 76 | Finalizar viaje | Backend / Finalización y Cierre |
| `ATENT-077` | 77 | Crear pruebas unitarias | QA / Tests Unitarios |
| `ATENT-078` | 78 | Crear pruebas de integración backend | QA / Tests Integración API |
| `ATENT-079` | 79 | Probar teléfono bloqueado | QA / Escenario Lock Screen |
| `ATENT-080` | 80 | Probar app en segundo plano | QA / Escenario Background Service |
| `ATENT-081` | 81 | Probar silencio y DND | QA / Escenario Silencio y DND |
| `ATENT-082` | 82 | Probar sin internet | QA / Escenario Offline & Cola |
| `ATENT-083` | 83 | Probar GPS apagado | QA / Escenario GPS Unavailable |
| `ATENT-084` | 84 | Probar batería baja | QA / Escenario Low Battery & Doze |
| `ATENT-085` | 85 | Probar múltiples Android | QA / Matriz de Versiones Android |
| `ATENT-086` | 86 | Probar emergencia end-to-end | QA / E2E Emergency Lifecycle |
| `ATENT-087` | 87 | Probar seguridad del link | QA / Security & Link Tampering |
| `ATENT-088` | 88 | Generar APK de prueba | DevOps / Mobile Android Build |
| `ATENT-089` | 89 | Documentar ejecución | Documentación / Local Execution |
| `ATENT-090` | 90 | Documentar arquitectura | Documentación / Arquitectura |
| `ATENT-091` | 91 | Crear checklist de demo | Producto / QA / Demo Checklist |
| `ATENT-092` | 92 | Documentar idea futura del botón BLE | Documentación / Hardware BLE Roadmap |
