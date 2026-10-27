# INTEGRATIONS.md — Catálogo de Integraciones y Servicios Externos

Este documento define el catálogo de proveedores de servicios externos requeridos por Atent, las políticas de sandbox, manejo seguro de credenciales y directrices de prueba.

---

## 1. Política General de Integraciones

1. **Autorización Previa Obligatoria**:
   - En cumplimiento estricto de la regla 7, el equipo **nunca** enviará SMS reales a teléfonos de usuarios, no originará llamadas telefónicas reales, no comprará servicios ni desplegará a producción sin la autorización explícita del usuario.
2. **Uso Exclusivo de Sandboxes y Emuladores**:
   - Durante desarrollo y pruebas automatizadas, todas las integraciones funcionarán en modo `sandbox` o mediante adaptadores de prueba controlados (`InMemory*Provider`, `Sandbox*Client`).
3. **Patrón de Adaptador (Ports & Adapters)**:
   - Todo servicio externo debe interactuar con el dominio a través de una interfaz abstracta (puerto).
   - El código de producción utiliza el adaptador oficial configurado con credenciales de entorno.
   - Las pruebas unitarias e integración utilizan dobles de prueba tipados que respetan el mismo contrato sin llamar a la red externa.
4. **Cero Secretos**:
   - Ninguna clave de API, token o secreto se guarda en el repositorio.
   - Se documenta cada variable requerida en `.env.example`.

---

## 2. Catálogo Preliminar de Integraciones

| Servicio | Propósito | Proveedor Candidato | Entorno de Pruebas | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Envío de SMS** | Envío de enlaces de alerta a contactos de emergencia | Twilio / AWS SNS / Sinch | Sandbox API / Mock Provider | `PENDING_DOCS_CONFIRMATION` |
| **Llamadas de Voz (VoIP/IVR)** | Llamada automatizada en alertas críticas | Twilio Voice / Asterisk | Audio emulado / Test credentials | `PENDING_DOCS_CONFIRMATION` |
| **Geolocalización / Mapas** | Visualización de mapas y geocodificación inversa | Mapbox / Google Maps / OSM | OpenStreetMap / Tiles libres | `PENDING_DOCS_CONFIRMATION` |
| **Notificaciones Push** | Alertas a contactos con app instalada | Firebase Cloud Messaging (FCM) / APNs | FCM Test Token / Local Mock | `PENDING_DOCS_CONFIRMATION` |
| **Base de Datos Relacional** | Persistencia de datos transaccionales | PostgreSQL | Instancia local / Testcontainer | `READY_FOR_SETUP` |
| **Caché y Mensajería Efímera** | Estado volátil y limitación de tasa | Redis | Redis local / Mock Redis in-memory | `READY_FOR_SETUP` |

---

## 3. Configuración de Variables de Entorno (Plantilla de Referencia)

Cada aplicación contendrá su archivo `.env.example`. Las variables deben seguir esta nomenclatura estándar:

```env
# SERVER CONFIG
PORT=3000
NODE_ENV=development

# DATABASE (PostgreSQL)
DATABASE_URL=postgresql://atent_user:atent_password@localhost:5432/atent_db

# CACHE & TEMPORAL STATE (Redis)
REDIS_URL=redis://localhost:6379

# SMS SERVICE (SANDBOX BY DEFAULT)
SMS_PROVIDER=sandbox
SMS_API_KEY=sandbox_key_not_for_production
SMS_FROM_NUMBER=+15005550006

# MAPS & GEO
MAPS_PROVIDER=osm
MAPS_API_KEY=test_maps_key
```

> [!WARNING]
> La lista de proveedores e integraciones finales se confirmará y alineará con la documentación de Notion tan pronto como esté disponible.
