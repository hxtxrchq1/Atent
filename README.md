# Atent — Plataforma de Seguridad Personal y Alerta de Emergencia

Atent es una plataforma móvil y web de seguridad personal orientada a la protección preventiva y respuesta rápida ante situaciones de riesgo o emergencia. Permite a los usuarios emitir alertas satelitales en tiempo real, compartir su ubicación continua con contactos de confianza verificados y activar modos de acompañamiento durante sus trayectos.

---

## 1. Características Principales

### Botón SOS con Gesto Continuo
- **Máquina de estados táctil**: Activación y cancelación gestionadas en un único gesto ininterrumpido sin bloqueos ni dobles pulsaciones.
- **Cancelación preventiva**: Zona de cancelación en la parte superior derecha hacia la que el usuario puede arrastrar el dedo para descartar la alerta antes de que sea emitida.
- **Protección contra toques accidentales**: Requiere una pulsación sostenida intencional para evitar disparos en falsos positivos.
- **Acción "Ya estoy seguro"**: Diálogo de confirmación dentro de la interfaz para finalizar de forma segura una emergencia en curso y notificar el cierre a la red de confianza.

### Monitoreo y Mapa en Tiempo Real
- **Mapa interactivo embebido**: Renderizado cartográfico dentro de la aplicación con visualización de posición mediante marcador de alta visibilidad y círculo de precisión satelital.
- **Detección inteligente de servicios de ubicación**: Reconocimiento del estado de los proveedores GPS/Red con enlace directo a los ajustes del sistema en caso de estar deshabilitados.
- **Privacidad y protección de coordenadas**: Las coordenadas se procesan de manera cifrada e interna sin exponer números en texto plano dentro de la interfaz estándar.

### Modo Viaje (Acompañamiento Activo)
- Control rápido mediante switch unificado para activar el seguimiento durante desplazamientos.
- Emisión periódica de telemetría de ruta para monitoreo preventivo hasta la llegada a destino.

### Red de Contactos de Confianza
- Solicitudes mutuas de vinculación con validación de números telefónicos en formato internacional E.164.
- Integración con el selector nativo de contactos del sistema operativo Android.
- Canales de notificación multicanal para auxilio inmediato.

---

## 2. Arquitectura del Proyecto

El repositorio está organizado como un **monorepo**:

```text
Atent/
├── apps/
│   ├── mobile/         # Aplicación Android nativa (Kotlin, WebView Bridge, Foreground Service)
│   ├── safety-web/     # Portal web y UI de control (React, Vite, Leaflet, diseño modular)
│   └── api/            # Backend REST & WebSockets (NestJS, DTOs, autenticación, telemetría)
├── packages/
│   ├── shared/         # Modelos de dominio, reglas de negocio, adaptadores y validadores
│   ├── config/         # Configuración centralizada de variables y constantes
│   └── validation/     # Esquemas de validación estructural (coordenadas, teléfonos, tokens)
├── infrastructure/     # Esquemas de base de datos (PostgreSQL / Supabase RLS y funciones)
└── docs/               # Especificaciones técnicas, arquitectura y control de cambios
```

---

## 3. Tecnologías Utilizadas

- **Móvil**: Android SDK (Kotlin), Foreground Service para seguimiento continuo, Google Play Services Location (`FusedLocationProviderClient`).
- **Frontend / Web**: TypeScript, React, Vite, Leaflet (Cartografía abierta con OpenStreetMap).
- **Backend**: Node.js, NestJS, TypeScript, WebSockets.
- **Base de Datos & Auth**: PostgreSQL con Row Level Security (RLS), Supabase Auth y persistencia transaccional.
- **Seguridad**: Hash criptográfico (scrypt / pgcrypto), tokens UUIDv4 de alta entropía, expiración estricta (TTL) y saneamiento de registros.

---

## 4. Requisitos y Configuración Local

### Prerrequisitos
- **Node.js** (v18 o superior) y **npm** (v9 o superior)
- **Java JDK** (versión 17) y **Android SDK** (para compilar la app móvil)

### Instalación de Dependencias
```bash
npm install
```

### Variables de Entorno
Copia el archivo de ejemplo para configurar tu entorno local:
```bash
cp .env.example .env
```

Configura en `.env` tus parámetros de desarrollo:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_clave_publica_anonima
```

### Ejecutar Pruebas Automatizadas
```bash
npm test
```

### Compilar la Aplicación Android (APK)
```bash
cd apps/mobile/android
./gradlew assembleDebug
```
El archivo `.apk` compilado se generará en `apps/mobile/android/app/build/outputs/apk/debug/`.

---

## 5. Licencia y Uso
Este software ha sido desarrollado con fines de asistencia y seguridad preventiva. La efectividad del servicio depende de la cobertura satelital, conectividad móvil a internet y permisos otorgados por el usuario en el dispositivo.
