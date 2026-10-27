# SECURITY_PRIVACY_AUDIT.md — Auditoría Integral de Seguridad y Privacidad

Auditoría forense sobre los controles de seguridad, aislamiento de identidades, sanitización de datos y límites criptográficos en **Atent**.

---

## 1. Autenticación y Gestión de Sesiones

- **Algoritmo de Derivación de Claves (KDF)**:
  - Se utiliza `crypto.scryptSync(password, salt, 64)` con salt criptográfica aleatoria de 16 bytes generada por `crypto.randomBytes(16)`.
  - Comparación de hashes en tiempo constante con `crypto.timingSafeEqual` (`packages/shared/src/domain/auth.ts#L88`) para prevenir ataques de temporización (timing attacks).
- **Manejo de Tokens**:
  - Access Token: JWT firmado con HMAC-SHA256 (`HS256`) con expiración estricta de 15 minutos (900s).
  - Refresh Token: Token opaco de alta entropía (32 bytes aleatorios = 64 hex chars). En base de datos o memoria únicamente se persiste el hash SHA-256 (`crypto.createHash('sha256')`).
  - Rotación Forzada: Al usar un refresh token, la sesión anterior queda inmediatamente invalidada (`revokedAt = Date.now()`) y se emite un nuevo par de tokens.
  - Aislamiento de Usuario: `revokeSession` valida explícitamente que el `requestingUserId` sea el dueño legítimo de la sesión; de lo contrario, arroja `UNAUTHORIZED_SESSION_ACCESS` (`auth.test.ts`).

---

## 2. Live Safety Link y Exposición de Coordenadas

- **Entropía del Token**:
  - Generado mediante `crypto.randomBytes(24).toString('hex')` (48 caracteres hexadecimales, 192 bits de entropía).
  - Impredecible e imposible de enumerar mediante fuerza bruta.
- **Ciclo de Vida y Revocación Inmediata**:
  - TTL por defecto: 60 minutos configurables (`EMERGENCY_LINK_TTL_MINUTES`).
  - Al resolverse la emergencia (`resolveEmergency`), el token pasa inmediatamente al estado revocado (`revokedAt = now`).
  - Al consultar el endpoint `/api/emergency/safety-link?token=...`:
    - Si el token está revocado: Retorna `{ status: 'REVOKED' }` y suprime cualquier coordenada previa.
    - Si el token está expirado: Retorna `{ status: 'EXPIRED' }` y suprime la telemetría.
    - Únicamente si la alerta está en estado `ACTIVE` se retorna la última posición conocida y la cantidad de puntos registrados.

---

## 3. Resiliencia de la API y Mitigación de Abuso

- **Protección contra Inundación (Body Flooding)**:
  - Límite estricto de 64 KB (`MAX_BODY_BYTES = 65536`) en `apps/api/src/main.ts#L45`. Peticiones mayores a 64 KB son destruidas con código HTTP 413 `Payload Too Large`.
- **Rate Limiting**:
  - Implementado mediante `SimpleRateLimiter` con ventana deslizante (sliding window) de 1 minuto.
  - El endpoint de activación de emergencia `/api/emergency/initiate` está restringido a 10 peticiones/minuto por IP para prevenir abuso de despacho de SMS; otros endpoints permiten 60 req/min. Superar el umbral genera HTTP 429 `Too Many Requests`.
- **Idempotencia**:
  - El inicio de emergencia soporta el encabezado/parámetro `idempotencyKey`. Si un cliente reintenta una petición ante fallos de conexión, el backend devuelve el agregado de la alerta original sin generar alertas duplicadas ni despachar notificaciones repetidas a los contactos.
- **Deriva de Reloj (Clock Skew)**:
  - La ingesta de telemetría rechaza puntos con timestamps con más de 10 minutos de retraso o más de 2 minutos en el futuro para mitigar ataques de repetición (replay attacks) de coordenadas antiguas.

---

## 4. Sanitización y Fuga de Información Personal (PII)

- **Sanitización de Logs**:
  - `sanitizeObjectForLogging()` (`packages/shared/src/utils/index.ts#L52`) enmascara recursivamente claves sensibles (`password`, `token`, `secret`, `authorization`, `creditCard`, `latitude`, `longitude`, `coordinates`).
- **Enmascaramiento de Teléfonos**:
  - `maskPhoneNumber()` (`packages/shared/src/utils/index.ts#L39`) oculta los dígitos intermedios conservando únicamente el código de país y los 3 dígitos finales (ej. `+519***123`).

---

## 5. Auditoría de Dependencias (`npm audit`)

- **Resultado**: 0 vulnerabilidades conocidas (`found 0 vulnerabilities`).
- **Advertencia Forense**: Cero vulnerabilidades conocidas en la base de datos de npm no implica seguridad absoluta de la arquitectura o la lógica de negocio; certifica únicamente la ausencia de CVEs conocidos en las dependencias declaradas en el árbol del monorepo.
