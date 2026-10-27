import React, { useEffect, useRef } from 'react';
import { VectorIcon } from './AppCommon';

interface GoogleMapViewProps {
  latitude: number | null; longitude: number | null; accuracy: number | null; timestamp: number | null;
  locationStatus: 'IDLE' | 'FETCHING' | 'AVAILABLE' | 'UNAVAILABLE' | 'PERMISSION_DENIED';
  errorMessage: string | null; onRefreshLocation: () => void; onRequestPermissions?: () => void;
}

export function GoogleMapView({ latitude, longitude, accuracy, timestamp, locationStatus, errorMessage, onRefreshLocation }: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null); const mapRef = useRef<any>(null); const markerRef = useRef<any>(null);
  const hasCoords = latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude);
  const isGpsDisabled = errorMessage === 'GPS_DISABLED' || (!hasCoords && errorMessage?.toLowerCase().includes('gps'));

  useEffect(() => {
    if (!hasCoords || !containerRef.current) return;
    const maplibregl = (window as any).maplibregl; if (!maplibregl) return;
    if (!mapRef.current) {
      // MapLibre GL + teselas raster de OpenStreetMap: no requiere API key.
      const map = new maplibregl.Map({ container: containerRef.current, center: [longitude, latitude], zoom: 16,
        style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] } });
      const markerElement = document.createElement('div');
      markerElement.innerHTML = '<div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center"><div style="position:absolute;width:34px;height:34px;border-radius:50%;background:rgba(255,48,79,.35);animation:pulse 2s infinite ease-out"></div><div style="width:18px;height:18px;border-radius:50%;background:#FF304F;border:3px solid #FFF;box-shadow:0 0 16px rgba(255,48,79,1)"></div></div>';
      markerRef.current = new maplibregl.Marker({ element: markerElement }).setLngLat([longitude, latitude]).addTo(map); mapRef.current = map; map.once('load', () => map.resize());
    } else { mapRef.current.easeTo({ center: [longitude, latitude], duration: 600 }); markerRef.current?.setLngLat([longitude, latitude]); }
  }, [latitude, longitude, accuracy, hasCoords]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; markerRef.current = null; }, []);
  const openExternalMap = () => { if (!hasCoords) return; if ((window as any).AndroidBridge?.openExternalMap) return (window as any).AndroidBridge.openExternalMap(latitude, longitude); window.open(`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}`, '_blank', 'noopener,noreferrer'); };

  return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, boxSizing: 'border-box', overflowY: 'auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 }}><div><h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Ubicación satelital</h2><p style={{ fontSize: 12, color: '#AAA4B0', margin: '2px 0 0' }}>Monitoreo en tiempo real de tu dispositivo</p></div><button id="btn-refresh-location" type="button" onClick={onRefreshLocation} disabled={locationStatus === 'FETCHING'} style={{ padding: '10px 12px', backgroundColor: locationStatus === 'FETCHING' ? '#2A2430' : '#F52D83', color: '#F8F5F8', border: 0, borderRadius: 11, fontSize: 12, fontWeight: 800 }}>{locationStatus === 'FETCHING' ? 'Actualizando…' : 'Actualizar ubicación'}</button></div>
    {isGpsDisabled && <div style={{ backgroundColor: '#2A1820', border: '1.5px solid #FF304F', borderRadius: 16, padding: 16, marginBottom: 16 }}><strong>Activa tu ubicación</strong><p style={{ fontSize: 12, color: '#DDD6E3', lineHeight: 1.45 }}>Enciende los servicios de ubicación de tu dispositivo para actualizar el mapa.</p></div>}
    <div style={{ width: '100%', height: 330, borderRadius: 20, overflow: 'hidden', border: '1.5px solid #382F45', position: 'relative', backgroundColor: '#151219', marginBottom: 16 }}>{hasCoords ? <><div ref={containerRef} style={{ width: '100%', height: '100%' }} /><div style={{ position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(9,8,13,.85)', color: '#F8F5F8', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, zIndex: 2, pointerEvents: 'none' }}>GPS Satelital en Vivo</div></> : <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}><VectorIcon name="map-pin" size={26} color="#FF83B9" /><strong style={{ marginTop: 12 }}>{locationStatus === 'FETCHING' ? 'Buscando satélites GPS…' : isGpsDisabled ? 'Ubicación desactivada' : locationStatus === 'PERMISSION_DENIED' ? 'Permiso de ubicación pendiente' : 'Ubicación pendiente'}</strong><p style={{ fontSize: 12, color: '#AAA4B0' }}>{errorMessage || 'Toca «Actualizar» para leer la posición.'}</p></div>}</div>
    <div style={{ backgroundColor: '#1E1925', borderRadius: 16, border: '1px solid #282133', padding: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><strong style={{ fontSize: 12 }}>Ubicación en tiempo real</strong><span style={{ color: hasCoords ? '#3FB950' : '#D29922', fontSize: 11 }}>{hasCoords ? '● Señal GPS activa' : '● Buscando satélites'}</span></div>{hasCoords && <div style={{ marginTop: 10, fontSize: 12, color: '#AAA4B0' }}>Precisión estimada: ±{Math.round(accuracy || 0)} m · {timestamp ? new Date(timestamp).toLocaleTimeString() : 'No disponible'}</div>}{hasCoords && <button id="btn-open-openstreetmap" type="button" onClick={openExternalMap} style={{ width: '100%', marginTop: 14, padding: 12, backgroundColor: '#151219', border: '1.5px solid #382F45', borderRadius: 12, color: '#FF83B9', fontWeight: 700 }}>Abrir OpenStreetMap (Externo)</button>}</div>
  </div>;
}
