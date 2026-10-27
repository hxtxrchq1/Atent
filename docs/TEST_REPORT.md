# TEST_REPORT.md — Registro de Ejecución de Pruebas y Evidencia

Este documento recopila de manera continua la ejecución de pruebas automatizadas, suites de validación y la evidencia requerida para certificar el estado `VERIFIED` de cada tarea del backlog.

## Release Atent V1 — autenticación endurecida, permisos y APK público (2026-10-25)

- `npm.cmd run build`: **PASSED**; paquetes, API, mobile y Vite compilados.
- `npm.cmd test`: **PASSED**; 75 pruebas aprobadas, 0 fallos.
- Diagnóstico de TypeScript en `DesignShowcaseApp.tsx` y `update-checker.ts`: sin errores.
- `apps/mobile/android/gradlew.bat assembleDebug`: **PASSED**; `versionName 1.0.0`, `versionCode 5`.
- Artefacto final: [AtentV1.apk](../AtentV1.apk), 14,081,865 bytes.
- SHA-256: `FFD94934156DD19AC49BEC54ADDDFCAD287DF432BE373CEDACD42D3BD0ADBBD7`.
- Seguridad: cliente con límites de entrada y mensajes no filtrantes; migración SQL v4 con validación server-side, RPC parametrizadas, grants explícitos y control de unicidad.
- Permisos: callback nativo corregido con referencias de estado actuales; el modal se abre después de completar permisos y su confirmación navega a Inicio.
- Actualizaciones: el comprobador filtra assets Android `AtentV*.apk` y no mezcla artefactos de otras plataformas.
- Pendiente para `VERIFIED` funcional completo: aplicar v4 en Supabase sandbox y probar el flujo de permisos/login en un dispositivo Android físico.

---

## Actualización 1.3.0 — Comprobador de versiones

- Consulta real a GitHub Releases, comparación semver, detección de asset APK y apertura nativa de URL HTTPS restringida al repositorio oficial.
- APK final: `AtentV1.3.apk`, 13,921,062 bytes, SHA-256 `C4CE135596887B9D64ACB2B4B1F2E6BC9D1D7BD6486EBC0338BEB9C331597A5B`.

## Release 1.3.0 — Refresco GPS, tutorial y APK

- `npm.cmd run build`: **PASSED**; TypeScript, paquetes y Vite compilados.
- `npm.cmd test`: **PASSED**; 75 pruebas aprobadas, 0 fallos.
- `apps/mobile/android/gradlew.bat assembleDebug`: **PASSED**; `versionName 1.3.0`, bundle web actualizado.
- Artefacto: `AtentV1.3.apk` en la raíz, 13,539,538 bytes.
- Validación: lectura inmediata, intervalo de 10 segundos, bloqueo de solicitudes superpuestas, descarte por `requestId`, modal de permisos y walkthrough in-app.
- Playwright: no ejecutable porque Chromium no está instalado; Vite sí inició correctamente.

## 1. Criterios de Aceptación de Pruebas (DoD de QA)

Una tarea solo puede transicionar de `IMPLEMENTED` a `VERIFIED` cuando cumple simultáneamente:
1. Las pruebas unitarias cubren los casos límite de la lógica de dominio.
2. Las pruebas de integración verifican la persistencia en base de datos o llamadas a endpoints sin errores.
3. Las pruebas E2E (si involucran interfaces web o flujos de usuario) demuestran la interacción completa.
4. No existen fallos (`0 failures`), ni regresiones en la suite global.
5. El registro de comando, fecha y salida de ejecución está documentado en la tabla de este informe.

---

## 2. Registro Histórico de Pruebas

| ID Tarea | Suite / Archivo de Prueba | Nivel (Unit / Int / E2E) | Comando de Ejecución | Resultado | Fecha | Evidencia / Notas |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ATENT-TASK-001` | Verificación de Herramientas del Sistema | Infra / Env | `node -v; npm -v; git --version` | **PASSED** | 2026-10-22 | Node 24.13.0, npm 11.6.2, Git 2.53.0 detectados y operativos |
| `ATENT-TASK-002` | `@atent/shared` Suite (`utils.test.ts`) | Unit | `npm --workspace=@atent/shared test` | **PASSED** | 2026-10-22 | 5 suites, 5 tests pasados en 187ms. Validación de coordenadas, expiración de tokens, enmascaramiento de teléfonos y sanitización de PII/logs. |
| `ATENT-TASK-002` | Monorepo Workspaces Root Test | Integration | `npm test` | **PASSED** | 2026-10-22 | Ejecución coordinada en apps y packages (0 fallos). |
| `ATENT-TASK-003` | Verificación de Fuentes e Inventario | Audit / Docs | Inspección física de rutas y validación de referencias | **PASSED** | 2026-10-22 | 8 fuentes auditadas físicamente en disco. Documentadas en `docs/SOURCE_INVENTORY.md` y `docs/TRACEABILITY_MATRIX.md`. |
| `ATENT-TASK-004` | Verificación Visual E2E de Flujos UI MVP | E2E / UI | `python scripts/verify_design.py` | **PASSED** | 2026-10-22 | 8 pantallas y estados capturados sin errores visuales ni excepciones de consola. Evidencias en `docs/screenshots/`. |
| `ATENT-TASK-005` | `@atent/api` HealthCheck Test Suite | Integration | `node --test dist/**/*.test.js` | **PASSED** | 2026-10-22 | 2/2 tests aprobados. Servidor responde 200 en `/health` y 404 en rutas desconocidas. |
| `ATENT-TASK-005` | `@atent/mobile` Core Controller Test Suite | Unit | `node --test dist/**/*.test.js` | **PASSED** | 2026-10-22 | 4/4 tests aprobados. Transiciones de estado, foreground service y filtrado de coordenadas. |
| `ATENT-TASK-005` | `@atent/validation` Rules Test Suite | Unit | `node --test dist/**/*.test.js` | **PASSED** | 2026-10-22 | 3/3 tests aprobados. Coordenadas terrestres, formato E.164 y tokens de alta entropía. |
| `ATENT-TASK-005` | Monorepo Full CI Test Suite | Monorepo | `npm test` | **PASSED** | 2026-10-22 | 18 tests aprobados sin fallos en todos los paquetes y apps. |
| `ATENT-TASK-006` | Emergency Domain & Notification Orchestrator | Unit / Domain | `npm --workspace=@atent/shared test` | **PASSED** | 2026-10-22 | 3/3 tests aprobados. Creación de sesión, telemetría, despacho SMS y revocación. |
| `ATENT-TASK-006` | Emergency API Full HTTP Lifecycle Suite | Integration | `npm --workspace=@atent/api test` | **PASSED** | 2026-10-22 | Flujo completo verificado: `/api/emergency/contacts` -> `/initiate` -> `/telemetry` -> `/safety-link` -> `/resolve`. |
| `ATENT-TASK-007` | Security & Resilience Audit Regression Suite | Security / API | `node --test apps/api/dist/security.test.js` | **PASSED** | 2026-10-22 | 4/4 tests aprobados. Idempotencia en reintentos, rechazo de clock skew / replay, rate limiting 429 y protección de payload 413. |
| `ATENT-TASK-007` | Full Monorepo Post-Hardening Test Suite | Monorepo | `npm test` | **PASSED** | 2026-10-22 | 24 tests automatizados aprobados con 0 fallos en todos los paquetes y apps. |
| `ATENT-TASK-008` | Trip Mode (Modo Viaje) Domain Test Suite | Unit / Domain | `npm --workspace=@atent/shared test` | **PASSED** | 2026-10-22 | 4/4 tests aprobados. Inicio de viaje, telemetría de ruta, check-in seguro, evaluación de retraso (overdue) y revocación definitiva de token. |
| `ATENT-TASK-008` | Trip Mode API Integration Test Suite | Integration | `node --test apps/api/dist/trip.test.js` | **PASSED** | 2026-10-22 | Ciclo HTTP completo verificado: `/api/trip/start` -> `/location` -> `/safety-link` -> `/checkin` -> `/complete`. |
| `ATENT-TASK-009` | Mobile Offline Telemetry Queue & Sync Suite | Unit / Mobile Resilience | `npm --workspace=@atent/mobile test` | **PASSED** | 2026-10-22 | 5/5 tests de sincronización offline aprobados. Validación de límites terrestres, persistencia entre reinicios de app, vaciado secuencial de cola, política de reintentos (maxRetries) y desalojo FIFO ante buffer lleno. |
| `ATENT-TASK-010` | AuthService Domain & Cryptographic Security Suite | Unit / Security | `npm --workspace=@atent/shared test` | **PASSED** | 2026-10-22 | 6/6 tests de autenticación aprobados. Hashing scrypt con sal aleatoria, firma HMAC-SHA256, rotación de refresh tokens, invalidación inmediata de sesiones revocadas y aislamiento estricto de usuarios (prohibido revocar sesiones ajenas). |
| `ATENT-TASK-010` | Auth & Session HTTP Integration Test Suite | Integration | `node --test apps/api/dist/auth.test.js` | **PASSED** | 2026-10-22 | Flujo HTTP integral verificado: `/api/auth/register` -> `/api/auth/me` -> `/api/auth/login` -> `/api/auth/refresh` (con revocación de token previo) -> `/api/auth/logout`. |
| `ATENT-TASK-010` | Full Monorepo Post-Auth Integration Suite | Monorepo | `npm test` | **PASSED** | 2026-10-22 | 41 tests aprobados con 0 fallos en todos los paquetes y aplicaciones del monorepo. |

---

## 3. Cobertura y Métricas de Calidad

*Las métricas de cobertura (Istanbul/Jest/c8) se registrarán aquí conforme se implementen los paquetes del monorepo.*
## Release 1.1.0 — Red de Confianza (2026-10-24)
- Build web: OK.
- Suite monorepo: 32 pruebas pasadas, 0 fallos.
- APK Android debug: `versionName 1.1.0`, `versionCode 2`.
## 2026-10-24 — Red de confianza y alertas en vivo

- `npm run build`: OK; compilación TypeScript y Vite completada.
- `npm test`: OK; 75 pruebas aprobadas, 0 fallos.
- `apps/mobile/android`: `gradlew assembleDebug`: OK; Kotlin y APK debug compilados.
- Validado por código: selección del primer resultado de `find_profile_by_phone`, inserción de `recipient_user_id`, filtrado de alertas por relación aceptada, telemetría con batería/modo viaje y canal Android de alta importancia.
- No se certifica todavía el flujo remoto completo: la migración SQL nueva debe ejecutarse en Supabase sandbox y el sonido sobre DND depende de permisos y políticas del dispositivo.

## Release 1.2.0 — Alerta audible persistente

### 2026-10-26 — Receptor nativo fuera del WebView
- Se corrigió la dependencia del polling de alertas respecto a `MainActivity`/WebView.
- `npm.cmd --workspace=@atent/safety-web run build`: **PASSED**.
- `apps/mobile/android/.\gradlew.bat assembleDebug`: **PASSED**; compilación Kotlin y APK debug completadas.
- La validación física de dos dispositivos y del comportamiento con el proceso retirado de recientes queda pendiente; no se marca `VERIFIED` hasta ejecutarla.

- MP3 de alerta verificado por SHA-256 y empaquetado en `res/raw/alert_sound.mp3`.
- `IncomingEmergencyAlertService`: compilación pendiente de la prueba final de dos dispositivos; el servicio usa reproducción en bucle, vibración repetida y foreground notification.
- El botón `Actualizar` refresca alertas y solicitudes manualmente.
- Limitación Android documentada: el acceso DND debe concederse manualmente; no se elimina DND ni se altera el volumen sin consentimiento del sistema.

## 2026-10-25 — Ubicación y onboarding de permisos

- `npm run build`: OK; compilación web y TypeScript completada.
- `apps/mobile/android`: `gradlew assembleDebug`: OK; APK recompilado con permisos y tutorial.
- Verificado por código: botón manual de actualización, intervalo GPS de 10 segundos, permiso de ubicación en segundo plano, permiso especial DND y tutorial posterior.
- Corrección de frescura GPS: build web OK, suite monorepo 99/99 OK y APK debug ensamblado. Queda pendiente ejecutar la migración v3 en Supabase sandbox y validar con dos dispositivos reales antes de marcar `ATENT-TASK-015` como `VERIFIED`.
