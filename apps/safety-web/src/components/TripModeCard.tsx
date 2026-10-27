import React, { useState } from 'react';
import { VectorIcon } from './AppCommon';

export interface TripSession {
  isActive: boolean;
  destination: string;
  estimatedMinutes: number;
  startedAt: number;
  deadline: number;
  trustedContactName?: string;
  lastCheckinAt?: number;
}

interface TripModeCardProps {
  trip: TripSession | null;
  contactsCount: number;
  onStartTrip: (destination: string, minutes: number) => void;
  onFinishTrip: () => void;
}

export function TripModeCard({
  trip,
  contactsCount,
  onStartTrip,
  onFinishTrip,
}: TripModeCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(25);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;
    onStartTrip(destination.trim(), durationMinutes);
    setIsModalOpen(false);
  };

  if (trip && trip.isActive) {
    const minutesLeft = Math.max(0, Math.round((trip.deadline - Date.now()) / 60000));

    return (
      <div
        style={{
          backgroundColor: '#1E1925',
          border: '1.5px solid #F52D83',
          borderRadius: '18px',
          padding: '16px',
          margin: '12px 0',
          boxShadow: '0 0 24px rgba(245, 45, 131, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <VectorIcon name="navigation" size={18} color="#FF83B9" />
            <span style={{ fontWeight: 800, fontSize: '14px', color: '#F8F5F8' }}>Modo Viaje en Curso</span>
          </div>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: 'rgba(35, 134, 54, 0.2)',
              color: '#3FB950',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 700,
            }}
          >
            Activo
          </span>
        </div>

        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '13px', color: '#AAA4B0' }}>
            Hacia: <strong style={{ color: '#F8F5F8' }}>{trip.destination}</strong>
          </div>
          <div style={{ fontSize: '12px', color: '#FF83B9', marginTop: '2px', fontWeight: 600 }}>
            Tiempo restante estimado: {minutesLeft} min
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button
            onClick={onFinishTrip}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#151219',
              border: '1px solid #382F45',
              borderRadius: '10px',
              color: '#3FB950',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Llegué a salvo (Finalizar)
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        style={{
          backgroundColor: '#1E1925',
          border: '1px solid #282133',
          borderRadius: '16px',
          padding: '14px 16px',
          margin: '8px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'border-color 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 45, 131, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <VectorIcon name="navigation" size={18} color="#FF83B9" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#F8F5F8' }}>Modo Viaje</div>
            <div style={{ fontSize: '11px', color: '#AAA4B0', marginTop: '1px' }}>
              Monitoreo y tiempo estimado en tus desplazamientos
            </div>
          </div>
        </div>
        <span style={{ fontSize: '12px', color: '#FF83B9', fontWeight: 700 }}>Activar</span>
      </div>

      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(9, 8, 13, 0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 150,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#1E1925',
              borderRadius: '20px',
              border: '1px solid #382F45',
              padding: '24px',
              boxSizing: 'border-box',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 800 }}>Iniciar Modo Viaje</h3>
            <p style={{ color: '#AAA4B0', fontSize: '12px', margin: '0 0 16px 0' }}>
              Tus contactos de auxilio sabrán a dónde te diriges y recibirán aviso si no confirmas tu llegada.
            </p>

            <form onSubmit={handleStart} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  Destino
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Casa, Trabajo, Universidad..."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#151219',
                    border: '1px solid #2B2436',
                    borderRadius: '12px',
                    color: '#F8F5F8',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  Duración estimada del trayecto
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#151219',
                    border: '1px solid #2B2436',
                    borderRadius: '12px',
                    color: '#F8F5F8',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                >
                  <option value={15}>15 minutos</option>
                  <option value={25}>25 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1 hora y 30 min</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#151219',
                    color: '#AAA4B0',
                    border: '1px solid #2B2436',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#F52D83',
                    color: '#F8F5F8',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Iniciar Viaje
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
