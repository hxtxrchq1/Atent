# RELEASE_CHECKLIST.md — Lista de Verificación para Puesta en Producción y Demo

Este documento detalla el procedimiento exhaustivo y reproducible para realizar una demostración completa de la plataforma Atent y validar los requisitos antes del pase a producción.

---

## 1. Verificación Previa del Entorno

- [x] Node.js `v20+` o `v24+` instalado y funcional.
- [x] Paquetes de dependencias instalados sin vulnerabilidades (`npm audit` con 0 vulnerabilidades).
- [x] Compilación estricta sin errores en todos los paquetes (`npm run build`).
- [x] Suite de pruebas automatizadas al 100% verde (`npm test` con 42 tests pasando).
- [x] Archivo de entorno `.env.example` actualizado con variables documentadas y valores seguros.
- [x] Cero secretos, API keys o contraseñas en Git o en el código fuente.

---

## 2. Checklist de Demostración End-to-End (Paso a Paso)

### Paso 1: Inicialización del Backend y Web Portal
1. En una terminal, iniciar la API REST:
   ```bash
   node apps/api/dist/main.js
   ```
   *Salida esperada*: `[Atent API] Server listening on http://localhost:3000`
2. En una segunda terminal, iniciar el visor web interactivo:
   ```bash
   npm --workspace=@atent/safety-web run preview
   ```
   *Acceso*: Abrir `http://localhost:3001` en el navegador.

### Paso 2: Demostración de Autenticación y Registro de Usuario
1. Registrar un nuevo usuario mediante `POST /api/auth/register`:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d "{\"email\":\"demo@atent.com\",\"password\":\"DemoPassword123!\",\"fullName\":\"Demo User\",\"phoneNumber\":\"+51999888777\"}"
   ```
   *Verificar*: Retorno de status HTTP 201, datos del usuario sanitizados (sin hash ni sal) y tokens `accessToken` y `refreshToken`.
2. Validar perfil protegido mediante `GET /api/auth/me` enviando el Bearer token.
3. Probar rotación de tokens mediante `POST /api/auth/refresh`.

### Paso 3: Configuración de Contactos Confiables
1. Registrar 2 contactos prioritarios en `POST /api/emergency/contacts`:
   - Contacto 1: Mamá (+51999111222, prioridad 1, relación FAMILY).
   - Contacto 2: Hermano (+51999333444, prioridad 2, relación FAMILY).
2. Registrar token push para el receptor en `POST /api/emergency/push-token`.

### Paso 4: Activación de Emergencia SOS
1. Iniciar emergencia mediante `POST /api/emergency/initiate` indicando latitud, longitud y fuente `MANUAL_BUTTON`.
2. *Verificar*:
   - Generación de token criptográfico impredecible de 48 caracteres.
   - Envío simulado de SMS a los contactos con el Live Safety Link.
   - Despacho de notificación Push FCM inmediata.

### Paso 5: Seguimiento en Vivo vía Live Safety Link
1. Abrir en el navegador: `http://localhost:3001/safety-link?token=<TOKEN_GENERADO>`
2. *Verificar*:
   - Carga inmediata de la pantalla de emergencia sin necesidad de login.
   - Posición GPS marcada en el mapa con radio de precisión.
   - Nombre de la persona y hora de inicio de la alerta.
3. Ingestar nueva telemetría simulada en `POST /api/emergency/telemetry`.
4. El visor web actualiza las coordenadas en tiempo real.

### Paso 6: Confirmación del Contacto ("Estoy al tanto")
1. El contacto presiona o envía `POST /api/emergency/acknowledge`:
   ```bash
   curl -X POST http://localhost:3000/api/emergency/acknowledge -H "Content-Type: application/json" -d "{\"alertId\":\"<ALERT_ID>\",\"contactId\":\"ct_1\",\"contactName\":\"Mama\",\"note\":\"Voy en camino\"}"
   ```
2. *Verificar*: La confirmación "Estoy al tanto" se refleja instantáneamente en el Live Safety Link.

### Paso 7: Resolución y Cierre de la Emergencia
1. Finalizar emergencia mediante `POST /api/emergency/resolve`.
2. Recargar el Live Safety Link en el navegador:
   *Verificar*: El enlace devuelve status `REVOKED` ("La emergencia ha concluido y el enlace fue revocado").
   Las coordenadas dejan de exponerse inmediatamente.

### Paso 8: Demostración de Modo Viaje (Trip Mode)
1. Iniciar viaje en `POST /api/trip/start` con origen, destino y ETA.
2. Ingestar telemetría de ruta en `POST /api/trip/location`.
3. Ejecutar check-in seguro en `POST /api/trip/checkin`.
4. Completar viaje seguro en `POST /api/trip/complete`.
5. *Verificar*: El enlace de viaje queda inmediatamente revocado.

---

## 3. Estado de Despliegue en Producción

> [!WARNING]
> Conforme a la Regla 7 de AGENTS.md, el despliegue automático a producción (AWS/GCP/Vercel/Fly.io), el envío de SMS reales a números externos con costo y la compra de dominios están **estrictamente prohibidos** sin autorización expresa del usuario. Todos los servicios están listos y configurados para operar en entornos sandbox locales y reproducibles.
