# Guía de Puesta en Marcha Local — Plataforma Atent

Esta guía documenta los pasos para instalar, compilar y ejecutar de forma reproducible todos los componentes del monorepo `safe-app` en entornos de desarrollo local.

---

## 1. Requisitos Previos del Sistema

- **Node.js**: `>= 20.0.0` (Probado y certificado en `v24.13.0`)
- **npm**: `>= 10.0.0` (Probado en `11.6.2`)
- **Java JDK**: `>= 17` (Requerido para tooling de Android, certificado con Amazon Corretto `21.0.12.1`)
- **Docker & Docker Compose** (Opcional para DB/Redis local contenerizado):
  - *Nota técnica*: Si Docker no está instalado en la máquina (`BLK-002`), los servicios y tests utilizan adaptadores desacoplados en memoria sin bloquear la ejecución.
- **Android SDK** (Opcional para compilación de APK nativo de `apps/mobile`):
  - *Nota técnica*: Si falta el Android SDK (`BLK-003`), el código TypeScript/React Native se valida mediante typecheck estricto y tests unitarios.

---

## 2. Instalación de Dependencias

Desde la raíz del repositorio:
```bash
npm install
```
Esto resolverá y enlazará automáticamente todos los workspaces:
- `apps/api`
- `apps/mobile`
- `apps/safety-web`
- `packages/types`
- `packages/validation`
- `packages/config`
- `packages/shared`

---

## 3. Configuración de Variables de Entorno

Copiar la plantilla de variables seguras (sin secretos ni servicios de pago obligatorios):
```bash
cp .env.example .env
```

---

## 4. Compilación del Monorepo

Compilar todos los paquetes y aplicaciones en su orden estricto de dependencias:
```bash
npm run build
```

---

## 5. Ejecución de la Suite Completa de Pruebas

Ejecutar las pruebas unitarias y de integración en todos los paquetes:
```bash
npm test
```
*Cobertura actual: 18 tests automatizados ejecutados con 0 fallos.*

---

## 6. Puesta en Marcha de Aplicaciones

### 6.1. Backend API (`apps/api`)
```bash
npm --workspace=@atent/api run start
```
- Endpoint de verificación: `GET http://localhost:3000/health`
- Respuesta JSON esperada: `{"status":"ok","service":"atent-api","version":"0.1.0",...}`

### 6.2. Portal Web de Seguridad (`apps/safety-web`)
```bash
npm --workspace=@atent/safety-web run dev
```
- Acceso en navegador: `http://localhost:3001`

### 6.3. Verificación Automatizada Visual E2E (Playwright)
```bash
python .agents/skills/webapp-testing/scripts/with_server.py --server "npm --workspace=@atent/safety-web run preview" --port 3001 -- python scripts/verify_design.py
```
- Capturas generadas en `docs/screenshots/`.

### 6.4. Base de Datos y Caché (Docker)
Si Docker está disponible:
```bash
cd infrastructure
docker-compose up -d
```
Esto inicializará PostgreSQL con el esquema y los seeds de prueba deterministas (`infrastructure/init.sql`) y Redis en el puerto `6379`.
