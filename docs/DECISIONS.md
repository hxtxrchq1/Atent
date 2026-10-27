# DECISIONS.md — Registro de Decisiones de Arquitectura y Negocio (ADR)

Este registro documenta formalmente las decisiones técnicas, estructurales y metodológicas tomadas durante el desarrollo de Atent, así como la resolución de posibles contradicciones identificadas.

---

## DEC-001: Estructura del Monorepo `safe-app` y Gestor de Paquetes
- **Fecha**: 2026-10-22
- **Estado**: Aceptada
- **Contexto**:
  Se requiere una estructura monorepo para compartir tipados TypeScript, DTOs de validación y constantes de seguridad entre `apps/api`, `apps/mobile` y `apps/safety-web`. La inspección del entorno local arrojó que Node.js v24.13.0 y npm 11.6.2 están instalados de forma nativa en el sistema, mientras que `pnpm` y `yarn` no están registrados en el PATH global de Windows.
- **Decisión**:
  Configurar el monorepo utilizando `npm workspaces` (soportado nativamente por npm 11 sin requerir dependencias adicionales globales en el sistema operativo), definiendo:
  - `apps/mobile`: Aplicación React Native + TypeScript (con soporte nativo Kotlin).
  - `apps/api`: Backend NestJS + TypeScript.
  - `apps/safety-web`: Consola web Next.js / React para enlaces de seguridad y monitoreo.
  - `packages/shared`: Tipos, utilidades de validación y contratos compartidos.
- **Consecuencias**:
  Permite compilación unificada, enlaces locales limpios y compatibilidad inmediata con la máquina de desarrollo sin requerir permisos elevados para instalar herramientas globales.

---

## DEC-002: Respeto Estricto a la Documentación de Notion como Fuente de Verdad
- **Fecha**: 2026-10-22
- **Estado**: Aceptada
- **Contexto**:
  La regla 1 del proyecto prohíbe inventar requisitos faltantes y exige respetar los MVPs en su orden estricto con sus IDs de tareas originales. Al no encontrarse la documentación de Notion en el workspace local al momento del arranque, existe el riesgo de asumir flujos funcionales o reglas de negocio incorrectas.
- **Decisión**:
  El equipo no inventará entidades de negocio, endpoints específicos, ni secuencias de MVP hasta que se incorpore la documentación oficial de Notion al workspace. Se suspende la toma de decisiones funcionales de negocio hasta la entrega de dichos documentos, registrando el bloqueo `BLK-001` y preparando el andamiaje técnico inicial.
- **Consecuencias**:
  Garantiza fidelidad total a los requerimientos originales y evita retrabajos en modelos de datos y lógica de dominio.

---

## DEC-003: Restricciones de Plataforma Android y Compromisos de Emergencia
- **Fecha**: 2026-10-22
- **Estado**: Aceptada
- **Contexto**:
  Las aplicaciones de asistencia y alerta frecuentemente incurren en promesas irreales sobre su capacidad para garantizar la llegada de ayuda o superar modos silenciosos del sistema operativo.
- **Decisión**:
  En cumplimiento de la regla 8:
  1. En ningún documento, mensaje de la UI ni lógica técnica se afirmará que la app puede burlar el modo *Do Not Disturb* (DND), saltarse las restricciones de *Doze Mode* de Android o garantizar la recepción de asistencia externa.
  2. Se diseñarán advertencias explícitas en la interfaz de usuario informando los límites reales: conectividad de red, precisión del GPS, nivel de batería, políticas de ahorro de energía del fabricante del dispositivo y tiempos de respuesta de servicios terceros.
- **Consecuencias**:
  Diseño honesto, seguro y transparente para el usuario final y cumplimiento de normativas de las tiendas de aplicaciones (Google Play / App Store).

---

## DEC-004: Estrategia de Testing y Definición de Hecho (DoD)
- **Fecha**: 2026-10-22
- **Estado**: Aceptada
- **Contexto**:
  Se exige que ninguna tarea se marque como `VERIFIED` sin pruebas ejecutadas y evidencia registrada. No se admiten mocks para sustituir servicios en producción.
- **Decisión**:
  1. Pruebas Unitarias e Integración: Se usarán suites automatizadas (Jest/Vitest) en backend y librerías compartidas.
  2. Pruebas E2E en Web: Se utilizará Playwright y el script helper `scripts/with_server.py` según la skill `webapp-testing` para interactuar con la interfaz de `apps/safety-web`.
  3. Mocks: Únicamente permitidos en entornos aislados de test (`test/mocks/`) bajo contratos de adaptadores formales; prohibido mockear lógica interna o inventar respuestas en código de producción.
- **Consecuencias**:
  Trazabilidad total entre criterios de aceptación y resultados verificables.
## DEC-2026-10-24 — Alertas privadas y sonido del sistema

- La solicitud de red de confianza usa el primer registro de `find_profile_by_phone`; PostgREST entrega `RETURNS TABLE` como arreglo.
- El panel de Alertas consulta exclusivamente `get_trusted_alerts` y `get_trusted_alert_locations`, filtrando por relaciones aceptadas.
- La ubicación se actualiza mediante Realtime cuando está disponible y por sondeo de respaldo cada 5 segundos. Se purga según la política de retención del proyecto al resolver/cancelar la alerta.
- Android usa un canal `IMPORTANCE_HIGH`, categoría alarma, vibración y tono del sistema. No se promete ignorar silencio/DND: Android requiere que la persona conceda acceso especial a interrupciones y algunos fabricantes pueden limitarlo.
## DEC-2026-10-25 — Ubicación, permisos y tutorial de seguridad

- La ubicación se solicita manualmente con `Actualizar ubicación` y se vuelve a consultar cada 10 segundos mientras se está en Ubicación, SOS o Modo viaje.
- El mapa usa MapLibre GL con teselas raster de OpenStreetMap, sin API key de Google/Mapbox. La capa de proveedor queda desacoplada para permitir cambiar el estilo sin tocar la lógica de geolocalización.
- El primer acceso posterior al registro exige ubicación, ubicación en segundo plano, agenda, notificaciones y acceso especial de No molestar. Android muestra cada autorización; Atent no puede aceptarlas por el usuario.
- Tras completar permisos aparece un tutorial breve de tres pasos antes de entrar al inicio.
- La actualización manual debe solicitar una lectura GPS actual; `lastLocation` se considera caché. La hora mostrada junto al mapa representa `emergency_locations.recorded_at`, no `emergency_alerts.updated_at`.
