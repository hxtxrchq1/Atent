# BLOCKERS.md — Registro Activo de Impedimentos y Limitaciones Técnicas

Este registro documenta de forma transparente y rigurosa los bloqueos técnicos reales que impiden la ejecución completa de ciertas tareas en el entorno de desarrollo actual, diferenciando claramente entre limitaciones del host, integraciones simuladas y requisitos de hardware.

---

## Estado Actual de Bloqueos (Segunda Auditoría Forense)

| ID Bloqueo | Tareas Afectadas | Categoría | Descripción Técnica del Bloqueo | Estado | Veredicto & Acciones Requeridas |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `BLK-001` | Backlog Maestro de Notion | Externo / Ingestión | Las 92 tareas originales fueron auditadas, extraídas y consolidadas en `BACKLOG_INVENTORY.md` y `TRACEABILITY_MATRIX.md`. | **CERRADO** | Cobertura total de 92 tareas con trazabilidad completa a código. |
| `BLK-002` | `ATENT-088` (APK Android) | Toolchain / Host OS | Ausencia de Android SDK (`sdkmanager`, `adb`, `aapt`), JDK 17/21 y Gradle nativo en el PATH del sistema host de Windows. Además, `apps/mobile` opera como módulo React Native con lógica de dominio compilable vía TypeScript pero sin el andamiaje `android/` (`build.gradle`, `AndroidManifest.xml`). | **ACTIVO (BLOCKED_EXTERNAL)** | Requiere instalar Android Command Line Tools y generar el scaffold nativo Android (`npx react-native@latest eject` o plantilla Gradle nativa). |
| `BLK-003` | `ATENT-079`, `ATENT-080` (Teléfono Bloqueado & Background) | Dispositivo Físico | El ciclo de vida en segundo plano y Foreground Service está completamente implementado y verificado en tests unitarios/simulación (`MobileAlertController`). La verificación con pantalla físicamente bloqueada requiere un dispositivo Android real conectado por ADB. | **ACTIVO (SIMULADO / PENDIENTE DE HARDWARE)** | Código implementado y probado con mocks; pendiente de prueba física en dispositivo. |
| `BLK-004` | `ATENT-081`, `ATENT-084` (DND, Doze Mode & Batería Baja) | Dispositivo Físico / Restricciones SO | La plataforma declara honestamente las limitaciones insalvables de Doze Mode y DND según la Regla 8 de `AGENTS.md`. No es técnicamente posible forzar que un teléfono suene en DND sin permisos de sistema prioritarios del usuario. | **ACTIVO (SIMULADO / PENDIENTE DE HARDWARE)** | Mitigado y verificado a nivel de especificación y tests; pendiente de validación en banco de pruebas físico. |
| `BLK-005` | `ATENT-085` (Múltiples Fabricantes Android) | Dispositivo Físico | Las capas de personalización (MIUI/HyperOS de Xiaomi, One UI de Samsung, ColorOS) aplican gestores de batería agresivos que matan servicios en segundo plano. | **ACTIVO (DOCUMENTADO / PENDIENTE DE BANCO DE PRUEBAS)** | Requiere acceso a dispositivos físicos de distintas marcas para certificar la guía de exclusión de optimización de batería. |
| `BLK-006` | `ATENT-092` (Botón de Emergencia Físico BLE) | Hardware Físico | El gestor `BleButtonManager`, las definiciones GATT estándar y las pruebas de comportamiento ante desconexión accidental están 100% implementadas y probadas (`ble-button.test.ts`). Sin embargo, no se cuenta con un botón físico Bluetooth conectado al host. | **ACTIVO (SIMULADO / PENDIENTE DE HARDWARE)** | Código de integración y tests completados en software; pendiente de emparejamiento con periférico BLE real. |

---

## Diagnóstico y Comandos de PowerShell para Desbloqueo del APK (`BLK-002`)

Para habilitar la compilación del APK nativo en esta máquina Windows:

```powershell
# 1. Instalar Android Command Line Tools mediante winget o descarga directa
winget install Google.AndroidStudio -e --silent
# o alternativamente las herramientas de línea de comandos:
# winget install Google.PlatformTools -e

# 2. Configurar variables de entorno en Windows
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Amazon Corretto\jdk21.0.12_9", "User")

# 3. Descargar SDK Platforms y Build Tools
& "$env:LOCALAPPDATA\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" --install "platform-tools" "platforms;android-34" "build-tools;34.0.0"

# 4. Inicializar el contenedor nativo Android en apps/mobile si se desea compilación Gradle pura:
# cd apps/mobile
# npx react-native init AtentAndroid --template react-native-template-typescript
```
