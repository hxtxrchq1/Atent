# Atent v1.9.2 — Corrección del gesto SOS

**Fecha:** 2026-11-19  
**Tipo:** Patch de usabilidad / corrección crítica  
**Android versionCode:** 8  
**Android versionName:** 1.9.2

## Problema corregido
En la versión anterior, al mantener presionado el botón SOS, el estado de preparación podía ser restablecido inmediatamente. El efecto de sincronización del componente reiniciaba cualquier gesto cuando `isSosActive` era falso, que es precisamente el estado mientras el usuario aún está preparando el envío de SOS. Esto impedía completar la pulsación larga y no se llegaba a la decisión de activar o cancelar.

## Cambios
- El reinicio automático del gesto ahora solo ocurre cuando una alerta activa pasa de activa a resuelta (`isSosActive: true → false`).
- El gesto de preparación `PRESSING`/`DRAGGING` ya no se borra por renders mientras no exista una alerta SOS activa.
- Captura y liberación del pointer se realizan en el elemento que controla el gesto (`currentTarget`) para evitar inconsistencias si el evento se origina en un elemento interno.
- Se previene el comportamiento predeterminado de pointer down y el menú contextual durante la interacción SOS.

## Comportamiento esperado
1. Mantener presionado SOS: se muestra el estado de preparación y el objetivo de cancelar.
2. Soltar fuera del objetivo de cancelación tras al menos 400 ms: activa SOS.
3. Arrastrar hacia el círculo superior derecho y soltar: cancela el intento sin emitir alerta.
4. Una vez que una alerta está activa, arrastrar hacia el objetivo de cancelación y soltar cancela la alerta activa.

## Verificación
La corrección se revisó en el código. La compilación Android y las pruebas automatizadas deben confirmarse mediante GitHub Actions antes de considerar el APK verificado.

## Archivos
- `apps/safety-web/src/components/SosDragCancelButton.tsx`
- `apps/mobile/android/app/build.gradle`
- `.github/workflows/android-release.yml`
