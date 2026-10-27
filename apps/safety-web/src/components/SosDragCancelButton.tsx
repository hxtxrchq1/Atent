import React, { useState, useRef } from 'react';
import { VectorIcon } from './AppCommon';

export type GestureMachineState =
  | 'IDLE'
  | 'PRESSING'
  | 'DRAGGING'
  | 'CANCELLED'
  | 'ALERT_TRIGGERED';

interface SosDragCancelButtonProps {
  isSosActive: boolean;
  onEmergencyTriggered: () => Promise<void>;
  onCancelActiveEmergency: () => Promise<boolean>;
  onGestureStateChange?: (state: GestureMachineState) => void;
}

export function SosDragCancelButton({
  isSosActive,
  onEmergencyTriggered,
  onCancelActiveEmergency,
  onGestureStateChange,
}: SosDragCancelButtonProps) {
  // Máquina de estados explícita: IDLE | PRESSING | DRAGGING | CANCELLED | ALERT_TRIGGERED
  const [gestureState, setGestureState] = useState<GestureMachineState>('IDLE');
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isOverTarget, setIsOverTarget] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const targetCircleRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const pressStartTime = useRef<number>(0);

  const updateState = (newState: GestureMachineState) => {
    setGestureState(newState);
    onGestureStateChange?.(newState);
  };

  // 1. INICIO DEL GESTO: Con una sola pulsación y mantener, arranca el gesto inmediatamente
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isProcessing) return;

    // Capturar puntero de inmediato en Android / navegador táctil
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      activePointerId.current = e.pointerId;
    } catch {
      // ignore
    }

    pressStartTime.current = Date.now();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDragOffset({ x: 0, y: 0 });
    setIsOverTarget(false);

    // Entra de inmediato a PRESSING: El objetivo de cancelar se hace visible
    updateState('PRESSING');
  };

  // 2. ARRASTRE CONTINUO: En la MISMA pulsación continua sin levantar el dedo
  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;
    if (gestureState !== 'PRESSING' && gestureState !== 'DRAGGING') return;

    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    setDragOffset({ x: dx, y: dy });

    // Si el dedo se ha movido más de 8 píxeles, pasa a estado DRAGGING
    if (Math.hypot(dx, dy) > 8 && gestureState === 'PRESSING') {
      updateState('DRAGGING');
    }

    // Calcular colisión con el círculo de cancelación (superior derecha) con margen de tolerancia
    if (targetCircleRef.current) {
      const rect = targetCircleRef.current.getBoundingClientRect();
      const tolerance = 20; // 20px de tolerancia táctil ergonómica
      const isInside =
        e.clientX >= rect.left - tolerance &&
        e.clientX <= rect.right + tolerance &&
        e.clientY >= rect.top - tolerance &&
        e.clientY <= rect.bottom + tolerance;

      setIsOverTarget(isInside);
    }
  };

  // 3. FINALIZACIÓN AL SOLTAR EL DEDO (Resolución única y definitiva)
  const handlePointerUp = async (e: React.PointerEvent) => {
    if (activePointerId.current !== e.pointerId) return;

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    activePointerId.current = null;

    const currentOverTarget = isOverTarget;
    const currentGState = gestureState;
    const holdDurationMs = Date.now() - pressStartTime.current;

    if (currentGState === 'IDLE') return;

    // CASO A: SOLTAR DENTRO DEL CÍRCULO DE CANCELAR -> CANCELLED
    if (currentOverTarget) {
      updateState('CANCELLED');
      setDragOffset({ x: 0, y: 0 });
      setIsOverTarget(false);

      if (isSosActive) {
        // Si ya había una alerta activa, cancelarla en Supabase
        setIsProcessing(true);
        await onCancelActiveEmergency();
        setIsProcessing(false);
      }
      // Si aún no estaba activa, se descartó el intento sin crear ni emitir ninguna alerta
      setTimeout(() => updateState('IDLE'), 350);
      return;
    }

    // CASO B: SOLTAR FUERA DEL OBJETIVO
    setDragOffset({ x: 0, y: 0 });
    setIsOverTarget(false);

    if (!isSosActive) {
      // REGLA CRÍTICA: No activar con un simple click accidental. Exigir mantener al menos 400ms
      if (holdDurationMs < 400) {
        // Descartar toque o click rápido accidental
        updateState('IDLE');
        return;
      }

      // El usuario mantuvo pulsado y soltó fuera del objetivo de cancelación: ACTIVAR SOS
      updateState('ALERT_TRIGGERED');
      setIsProcessing(true);
      await onEmergencyTriggered();
      setIsProcessing(false);
      updateState('IDLE');
    } else {
      // Ya estaba activa y se soltó fuera: continúa activa
      updateState('IDLE');
    }
  };

  // 4. INTERRUPCIÓN TÁCTIL O PÉRDIDA DE FOCO (Android system interrupt)
  const handlePointerCancel = (e: React.PointerEvent) => {
    try {
      if (activePointerId.current !== null) {
        (e.target as HTMLElement).releasePointerCapture(activePointerId.current);
      }
    } catch {
      // ignore
    }
    activePointerId.current = null;
    setIsOverTarget(false);
    setDragOffset({ x: 0, y: 0 });
    updateState('IDLE');
  };

  // El círculo de cancelación se muestra cuando el usuario mantiene pulsado (PRESSING/DRAGGING)
  // O cuando hay una emergencia activa ya confirmada
  const showCancelCircle = gestureState === 'PRESSING' || gestureState === 'DRAGGING' || isSosActive;

  return (
    <div
      ref={containerRef}
      style={{
        width: '280px',
        height: '270px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* 1. CÍRCULO SECUNDARIO (Separado más hacia la parte superior derecha) */}
      {showCancelCircle && (
        <div
          ref={targetCircleRef}
          style={{
            position: 'absolute',
            top: '-20px',
            right: '-6px',
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: isOverTarget ? '#FF304F' : '#18131F',
            border: `2.5px ${isOverTarget ? 'solid #FFFFFF' : 'dashed #FF304F'}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isOverTarget
              ? '0 0 30px rgba(255, 48, 79, 1), 0 0 50px rgba(255, 48, 79, 0.7)'
              : '0 0 16px rgba(255, 48, 79, 0.35)',
            transform: isOverTarget ? 'scale(1.2)' : 'scale(1)',
            transition: 'transform 0.12s ease, background-color 0.12s ease, border 0.12s ease',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <VectorIcon name="cross" size={24} color={isOverTarget ? '#FFFFFF' : '#FF83B9'} />
          <span
            style={{
              fontSize: '8px',
              fontWeight: 800,
              color: isOverTarget ? '#FFFFFF' : '#AAA4B0',
              marginTop: '1px',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            {isOverTarget ? '¡SOLTAR!' : 'CANCELAR'}
          </span>
        </div>
      )}

      {/* 2. CÍRCULO PRINCIPAL SOS / ALERTA ARRASTRABLE EN LA MISMA INTERACCIÓN */}
      <div
        id="btn-instant-sos"
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          backgroundColor: isSosActive
            ? isOverTarget
              ? '#FF304F'
              : '#3C0E14'
            : gestureState === 'PRESSING' || gestureState === 'DRAGGING'
            ? isOverTarget
              ? '#FF304F'
              : '#4A1420'
            : '#1E1925',
          border: `4px solid ${
            isOverTarget
              ? '#FFFFFF'
              : isSosActive || gestureState === 'PRESSING' || gestureState === 'DRAGGING'
              ? '#FF304F'
              : '#F52D83'
          }`,
          color: '#F8F5F8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isProcessing ? 'wait' : 'pointer',
          transform:
            (gestureState === 'DRAGGING' || gestureState === 'PRESSING') && (dragOffset.x !== 0 || dragOffset.y !== 0)
              ? `translate(${dragOffset.x}px, ${dragOffset.y}px) scale(${isOverTarget ? 0.92 : 0.97})`
              : gestureState === 'PRESSING'
              ? 'scale(0.96)'
              : 'scale(1)',
          transition:
            gestureState === 'DRAGGING'
              ? 'none'
              : 'transform 0.18s cubic-bezier(0.2, 0.9, 0.3, 1), background-color 0.15s ease',
          boxShadow:
            isSosActive || gestureState === 'PRESSING' || gestureState === 'DRAGGING'
              ? '0 0 45px rgba(255, 48, 79, 0.8)'
              : '0 0 35px rgba(245, 45, 131, 0.45)',
          outline: 'none',
          touchAction: 'none',
          zIndex: 5,
        }}
      >
        {!isSosActive ? (
          <>
            <span style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '1px' }}>
              {isOverTarget ? 'CANCELAR' : 'SOS'}
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isOverTarget ? '#FFFFFF' : '#AAA4B0',
                marginTop: '2px',
                textAlign: 'center',
                padding: '0 10px',
              }}
            >
              {isOverTarget
                ? 'Soltar para no enviar'
                : gestureState === 'PRESSING' || gestureState === 'DRAGGING'
                ? 'Soltar activa / Arrastra cancela'
                : 'Mantén pulsado'}
            </span>
          </>
        ) : (
          <>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: isOverTarget ? '#FFFFFF' : '#FF304F',
                letterSpacing: '1px',
              }}
            >
              {isProcessing ? 'CANCELANDO...' : isOverTarget ? '¡SUELTA AQUÍ!' : 'ALERTA ACTIVA'}
            </span>
            <span style={{ fontSize: '24px', fontWeight: 900, marginTop: '2px' }}>
              {isOverTarget ? 'CANCELAR' : 'EN CURSO'}
            </span>
            <span
              style={{
                fontSize: '10px',
                color: isOverTarget ? '#FFFFFF' : '#AAA4B0',
                marginTop: '2px',
                textAlign: 'center',
                padding: '0 10px',
              }}
            >
              {isOverTarget ? 'Soltar para finalizar' : 'Arrastra hacia ↗'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
