# ANDROID_VALIDATION.md — Validación y Realismo Técnico en Android

Este documento establece las especificaciones de compatibilidad, limitaciones físicas del sistema operativo Android y procedimientos para la validación en dispositivos reales y emuladores.

---

## 1. Honestidad Técnica y Restricciones de Plataforma (Regla 8 de Atent)

De acuerdo con el protocolo obligatorio de ingeniería de Atent, **está terminantemente prohibido afirmar que la aplicación móvil puede ignorar de manera absoluta los estados del sistema operativo**.

### 1.1 Doze Mode (Modo Reposo Profundo)
- **Comportamiento Real**: Introducido en Android 6.0 (API 23), cuando el dispositivo está desenchufado, estacionario y con la pantalla apagada durante cierto tiempo, el sistema suspende los accesos a la red y difiere las tareas periódicas (Jobs, Syncs, Alarms).
- **Mitigación en Atent**: Se utiliza un **Foreground Service** con notificación persistente visible (`ongoing: true`, prioridad `IMPORTANCE_HIGH`) para mantener el seguimiento de geolocalización activo durante una emergencia o viaje.
- **Límite Técnico**: Los fabricantes (OEMs como Xiaomi, Samsung, Huawei) implementan gestores de batería agresivos a nivel de kernel (ej. MIUI Battery Saver, Device Care) que pueden terminar procesos en segundo plano pasados varios minutos si el usuario no configura la excepción manualmente en Ajustes del Sistema ("Sin restricciones de batería").

### 1.2 No Molestar (DND - Do Not Disturb) y Modo Silencio
- **Comportamiento Real**: Ninguna aplicación estándar puede forzar que el altavoz del teléfono receptor suene si el usuario tiene activado el modo "Total Silence" sin que el usuario haya otorgado previamente el permiso especial `ACCESS_NOTIFICATION_POLICY` (Acceso a No Molestar) en los ajustes del sistema.
- **Mitigación en Atent**: Se configura el canal de notificación con `NotificationManager.IMPORTANCE_HIGH` o `IMPORTANCE_MAX`, con vibración y sonido asignado a la categoría de alarma (`CATEGORY_ALARM`). El onboarding informa claramente al usuario cómo permitir que las alertas de sus contactos confiables atraviesen el modo No Molestar.

---

## 2. Matriz de Compatibilidad de Versiones Android

| Versión de Android | Nivel de API | Requisitos Específicos de Seguridad y Permisos | Estado de Soporte |
| :--- | :---: | :--- | :---: |
| **Android 10 (Q)** | API 29 | Requiere permiso explícito `ACCESS_BACKGROUND_LOCATION` para ubicación en segundo plano. | Soportado |
| **Android 11 (R)** | API 30 | Permiso de ubicación en un solo uso ("Solo esta vez"); el permiso en background debe solicitarse en un diálogo de configuración independiente. | Soportado |
| **Android 12 (S)** | API 31 | Permiso de ubicación aproximada vs precisa (`ACCESS_FINE_LOCATION` vs `ACCESS_COARSE_LOCATION`); restricciones a inicios de Foreground Service desde background. | Soportado |
| **Android 13 (Tiramisu)** | API 33 | Requiere permiso de ejecución en tiempo real para notificaciones (`POST_NOTIFICATIONS`). | Soportado |
| **Android 14 (Upside Down Cake)** | API 34 | Obligatoriedad de declarar el tipo de Foreground Service (`foregroundServiceType="location"`) en el AndroidManifest. | Soportado |

---

## 3. Estado de Compilación Local y Procedimiento de Generación de APK

### 3.1 Diagnóstico de Herramientas del Host
- **Java**: OpenJDK 21.0.12.1 instalado en `C:\Program Files\Amazon Corretto\jdk21.0.12_8\bin`.
- **Android SDK**: No se encuentra configurado en `$env:ANDROID_HOME` ni en `$env:LOCALAPPDATA\Android\Sdk`.
- **adb (Android Debug Bridge)**: No disponible en el PATH del sistema.
- **Estado Forense**: **`BLOCKED_EXTERNAL`** para la compilación directa del archivo binario APK en esta máquina. No se emitirán afirmaciones falsas de haber generado un APK físico sin el SDK instalado.

### 3.2 Procedimiento Reproducible para Compilar APK en Máquina con SDK

1. Instalar Android Studio / Android Command Line Tools:
   ```bash
   winget install Google.AndroidStudio
   ```
2. Configurar variables de entorno:
   ```powershell
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\cmdline-tools\latest\bin"
   ```
3. Compilar APK de depuración / prueba:
   ```powershell
   cd apps/mobile/android
   ./gradlew assembleDebug
   ```
4. El archivo resultante se generará en:
   `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
5. Instalar y ejecutar en emulador o dispositivo físico:
   ```powershell
   adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
   adb shell am start -n com.atent/.MainActivity
   ```
