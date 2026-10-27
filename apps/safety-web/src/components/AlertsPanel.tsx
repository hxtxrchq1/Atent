import React from 'react';
import { VectorIcon } from './AppCommon';
import { GoogleMapView } from './GoogleMapView';

export interface EmergencyAlertItem {
  id: string;
  owner_user_id: string;
  owner_name: string;
  owner_avatar: string;
  status: 'active' | 'resolved' | 'cancelled';
  created_at: string;
  last_latitude?: number;
  last_longitude?: number;
  last_accuracy?: number;
  last_battery_level?: number;
  last_battery_charging?: boolean;
  is_in_vehicle?: boolean;
  last_updated_at?: string;
  last_recorded_at?: string;
}

interface AlertsPanelProps {
  alerts: EmergencyAlertItem[];
  onSelectAlert: (alert: EmergencyAlertItem) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function AlertsPanel({ alerts, onSelectAlert, onRefresh, isRefreshing = false }: AlertsPanelProps) {
  const activeAlerts = alerts.filter((a) => a.status === 'active');

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
            Alertas de Emergencia
          </h2>
          <p style={{ fontSize: '12px', color: '#AAA4B0', margin: 0 }}>
            Emergencias activas de personas en tu red de contactos de confianza.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Actualizar alertas"
          style={{ background: '#1E1925', border: '1px solid #382F45', borderRadius: '10px', color: '#FF83B9', padding: '9px 10px', fontSize: '12px', fontWeight: 800, cursor: isRefreshing ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
        >
          {isRefreshing ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {activeAlerts.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1E1925',
            borderRadius: '20px',
            border: '1px solid #282133',
            padding: '36px 20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(35, 134, 54, 0.15)',
              border: '1.5px solid #238636',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <VectorIcon name="shield" size={26} color="#3FB950" />
          </div>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#F8F5F8' }}>Sin emergencias activas</div>
          <p style={{ fontSize: '12px', color: '#AAA4B0', marginTop: '6px', maxWidth: '240px', lineHeight: 1.4 }}>
            Tus contactos de confianza se encuentran a salvo. Las alertas de auxilio aparecerán aquí de inmediato.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => onSelectAlert(alert)}
              style={{
                backgroundColor: 'rgba(60, 14, 20, 0.65)',
                border: '1.5px solid #FF304F',
                borderRadius: '16px',
                padding: '16px',
                cursor: 'pointer',
                boxShadow: '0 0 24px rgba(255, 48, 79, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#FF304F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px',
                      color: '#F8F5F8',
                    }}
                  >
                    {alert.owner_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#F8F5F8' }}>
                      {alert.owner_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#FF83B9', marginTop: '2px', fontWeight: 600 }}>
                      ¡Solicitud de auxilio activa!
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    backgroundColor: '#FF304F',
                    color: '#F8F5F8',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    letterSpacing: '0.5px',
                  }}
                >
                  SOS
                </span>
              </div>

              <div
                style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid rgba(255, 48, 79, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: '#AAA4B0',
                }}
              >
                <span>Hora: {new Date(alert.created_at).toLocaleTimeString()}</span>
                {alert.last_battery_level !== undefined && (
                  <span>Batería: {alert.last_battery_level}%</span>
                )}
                <span style={{ color: '#FF83B9', fontWeight: 700 }}>Ver mapa &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AlertDetailModalProps {
  alert: EmergencyAlertItem | null;
  onClose: () => void;
}

export function AlertDetailModal({ alert, onClose }: AlertDetailModalProps) {
  if (!alert) return null;

  const hasCoords = alert.last_latitude !== undefined && alert.last_longitude !== undefined;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(9, 8, 13, 0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 200,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#1E1925',
          borderRadius: '24px',
          border: '1.5px solid #FF304F',
          padding: '24px',
          boxSizing: 'border-box',
          boxShadow: '0 0 40px rgba(255, 48, 79, 0.45)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#FF304F',
                display: 'inline-block',
              }}
            />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#F8F5F8' }}>
              Emergencia de {alert.owner_name}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#AAA4B0',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <VectorIcon name="cross" size={18} color="#AAA4B0" />
          </button>
        </div>

        <div style={{ backgroundColor: '#151219', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#AAA4B0' }}>Hora de activación:</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#F8F5F8', marginTop: '2px' }}>
            {new Date(alert.created_at).toLocaleString()}
          </div>

          <div style={{ marginTop: '12px', fontSize: '12px', color: '#AAA4B0' }}>Ubicación satelital:</div>
          {hasCoords ? (
            <div style={{ fontSize: '13px', fontFamily: 'monospace', color: '#FF83B9', fontWeight: 700, marginTop: '2px' }}>
              {alert.last_latitude?.toFixed(6)}, {alert.last_longitude?.toFixed(6)}
              {alert.last_accuracy && (
                <span style={{ fontSize: '11px', color: '#AAA4B0', display: 'block', marginTop: '2px', fontFamily: 'sans-serif' }}>
                  Precisión estimada: ±{Math.round(alert.last_accuracy)}m
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#D29922', marginTop: '2px' }}>
              Sin coordenadas geográficas recibidas
            </div>
          )}

          <div style={{ marginTop: '12px', fontSize: '12px', color: '#AAA4B0' }}>Nivel de batería:</div>
          <div style={{ fontSize: '13px', color: '#F8F5F8', fontWeight: 600, marginTop: '2px' }}>
            {alert.last_battery_level !== undefined && alert.last_battery_level >= 0
              ? `${alert.last_battery_level}% ${alert.last_battery_charging ? '(Cargando)' : ''}`
              : 'Sin información reciente'}
          </div>

          <div style={{ marginTop: '12px', fontSize: '12px', color: '#AAA4B0' }}>Estado del viaje:</div>
          <div style={{ fontSize: '13px', color: alert.is_in_vehicle ? '#FF83B9' : '#F8F5F8', fontWeight: 700, marginTop: '2px' }}>
            {alert.is_in_vehicle ? 'En vehículo · modo viaje activo' : 'No está en vehículo'}
          </div>
        </div>

        {hasCoords && (
          <div style={{ height: '230px', borderRadius: '16px', overflow: 'hidden', marginBottom: '12px', border: '1px solid #382F45' }}>
            <GoogleMapView
              latitude={alert.last_latitude ?? null}
              longitude={alert.last_longitude ?? null}
              accuracy={alert.last_accuracy ?? null}
              timestamp={alert.last_recorded_at ? Date.parse(alert.last_recorded_at) : (alert.last_updated_at ? Date.parse(alert.last_updated_at) : Date.now())}
              locationStatus="AVAILABLE"
              errorMessage={null}
              onRefreshLocation={() => undefined}
            />
          </div>
        )}

        {hasCoords && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${alert.last_latitude}&mlon=${alert.last_longitude}#map=18/${alert.last_latitude}/${alert.last_longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px',
              backgroundColor: '#F52D83',
              color: '#F8F5F8',
              borderRadius: '14px',
              fontWeight: 800,
              fontSize: '14px',
              textDecoration: 'none',
              boxSizing: 'border-box',
              marginBottom: '10px',
            }}
          >
            <VectorIcon name="navigation" size={16} color="#F8F5F8" />
            Abrir ubicación en OpenStreetMap
          </a>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#151219',
            color: '#AAA4B0',
            border: '1px solid #2B2436',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
