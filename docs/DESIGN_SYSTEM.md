# DESIGN_SYSTEM.md — Sistema de Diseño e Identidad Visual de Atent

Este documento establece la identidad visual, tokens de diseño, principios de accesibilidad, taxonomía de componentes y especificación de flujos del MVP de la plataforma **Atent**.

---

## 1. Identidad y Dirección Visual

- **Arquetipo**: Protector sereno, empático, hiperconfiable y lúcido en momentos de alto estrés o vulnerabilidad.
- **Tono**: Cálido pero sobrio, directo, altamente accesible y sin distracciones decorativas.
- **Evitación de clichés**:
  - Prohibido el aspecto de plantilla SaaS genérica (fondos violetas con degradados decorativos o sombras flotantes genéricas).
  - Prohibido el uso exclusivo del color para comunicar estados críticos (cumplimiento WCAG 2.1 AA / AAA).
  - Nunca mostrar ubicaciones ficticias ni confirmaciones de alerta que no hayan ocurrido en el servidor.
- **Acción de Emergencia**:
  - Mecanismo deliberado anti-falsos positivos: **Pulsación sostenida con temporizador háptico y radial** (*Hold-to-activate* de 3 segundos) con cancelación inmediata de 5 segundos previo al despacho de la alerta.

---

## 2. Design Tokens (Fundamentos)

### 2.1. Paleta Cromática y Semántica

```css
/* Primarios y Superficies */
--color-bg-canvas: #0c0f14;       /* Slate profundo para reducir fatiga visual en la noche */
--color-bg-surface: #161b22;      /* Superficie de tarjetas y controles */
--color-bg-elevated: #21262d;     /* Menús modales y hojas inferiores (sheets) */
--color-border-subtle: #30363d;   /* Divisores discretos */
--color-border-strong: #484f58;   /* Bordes de inputs y botones secundarios */

/* Textos (Alto Contraste WCAG AAA) */
--color-text-primary: #f0f6fc;    /* 98% contraste sobre canvas */
--color-text-secondary: #8b949e;  /* Textos explicativos e instructivos */
--color-text-tertiary: #6e7681;   /* Metadatos y marcas temporales */
--color-text-inverse: #0d1117;    /* Texto sobre botones sólidos de acento */

/* Semántica de Estados de Seguridad */
--color-safety-safe: #238636;       /* Estado seguro / Check-in OK */
--color-safety-safe-surface: #0e2714;
--color-safety-preparing: #d29922;  /* Conteo regresivo / Preparación */
--color-safety-preparing-surface: #382405;
--color-safety-active: #da3633;     /* Emergencia ACTIVA en curso */
--color-safety-active-surface: #3c1110;
--color-safety-resolved: #1f6feb;   /* Evento finalizado / Desactivado */
--color-safety-offline: #6e7681;    /* Sin red o GPS degradado */
```

### 2.2. Tipografía y Escala
- **Display & Títulos**: Sans-serif ergonómico de alta legibilidad (`Inter`, `System UI`, `-apple-system`, `Roboto`).
- **Números / Telemetría**: Monospace tabular (`JetBrains Mono`, `Roboto Mono`, `monospace`) para coordenadas, contadores regresivos y marcas de tiempo UTC.

```css
--font-family-base: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-family-mono: "SF Mono", Monaco, "Cascadia Code", monospace;

--font-size-xs: 12px;   /* Metadatos */
--font-size-sm: 14px;   /* Etiquetas secundarias */
--font-size-md: 16px;   /* Texto base de formularios */
--font-size-lg: 18px;   /* Títulos de sección */
--font-size-xl: 22px;   /* Encabezados de pantalla */
--font-size-2xl: 28px;  /* Indicadores numéricos */
--font-size-hero: 44px; /* Temporizador de cuenta regresiva */
```

### 2.3. Radios y Espaciado
- **Espaciado**: Módulo de 8px (4, 8, 12, 16, 24, 32, 48px).
- **Radios de Borde**:
  - `sm`: 6px (chips, badges)
  - `md`: 12px (botones, inputs)
  - `lg`: 16px (tarjetas, modales)
  - `full`: 9999px (botón central SOS)

---

## 3. Taxonomía de Flujos del MVP

1. **Onboarding & Permisos Contextuales**:
   - Explicación anticipada y transparente del por qué de la Ubicación en Segundo Plano y Notificaciones.
   - Estado de permisos: Permitido / Denegado con guía paso a paso para habilitar en ajustes de Android sin bloquear el resto de la app.
2. **Contactos Confiables**:
   - Lista priorizada (1 a 10 contactos).
   - Relación (Familiar, Amigo, Pareja, etc.).
   - Estado de notificación (Pendiente / Recibido / Fallido) con enmascaramiento de números.
3. **Pantalla Principal (Dashboard Seguro)**:
   - Estado de señal, precisión de GPS en metros reales, nivel de batería.
   - Botón SOS central con confirmación táctil `Hold-to-Activate` (3s).
4. **Ciclo de Vida de la Emergencia**:
   - **Preparación**: Conteo de 5 segundos con aviso sonoro y botón visible de *"Cancelar ahora (Falsa alarma)"*.
   - **Emergencia Activa**: Despacho de alerta por SMS/Red con indicador de progreso real. Envío continuo de telemetría de ubicación cada 5 segundos.
   - **Modo Viaje / Monitoreo Programado**: Check-in temporizado con notificación periódica.
   - **Cancelación / Finalización**: Desactivación deliberada con confirmación y registro de evento seguro.
5. **Visor Web de Seguridad (Live Safety Link)**:
   - Acceso sin registro previo para el contacto mediante token criptográfico de un solo uso.
   - Vista en tiempo real de coordenadas, precisión del radio, nivel de batería del remitente y botón de llamada directa a servicios oficiales locales (911).
   - Estados: `ACTIVE`, `RESOLVED`, `EXPIRED`, `INVALID_TOKEN`.

---

## 4. Matriz de Estados de Componentes

Todos los componentes de interfaz deben implementar obligatoriamente:
- `Default`: Estado en reposo interactivo.
- `Loading / In-Progress`: Indicador de procesamiento no bloqueante.
- `Error`: Mensaje legible y causa accionable (sin jerga técnica interna).
- `Empty`: Orientación clara para añadir contactos o configurar el modo seguro.
- `Offline / Degraded GPS`: Advertencia inmediata sin inventar coordenadas.
- `Permission-Denied`: Botón de reapertura guiada hacia los permisos del sistema.
