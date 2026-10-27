import React from 'react';
import { VectorIcon } from './AppCommon';

interface TripModeSwitchProps {
  isEnabled: boolean;
  onToggle: (nextState: boolean) => void;
  hasLocationPermission: boolean;
  onRequestPermissions: () => void;
}

export function TripModeSwitch({
  isEnabled,
  onToggle,
  hasLocationPermission,
  onRequestPermissions,
}: TripModeSwitchProps) {
  const handleToggle = () => {
    if (!isEnabled && !hasLocationPermission) {
      onRequestPermissions();
      return;
    }
    onToggle(!isEnabled);
  };

  return (
    <div
      style={{
        backgroundColor: '#1E1925',
        border: `1.5px solid ${isEnabled ? '#F52D83' : '#282133'}`,
        borderRadius: '16px',
        padding: '16px 18px',
        margin: '12px 0 6px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: isEnabled ? '0 0 20px rgba(245, 45, 131, 0.25)' : 'none',
        transition: 'all 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: isEnabled ? 'rgba(245, 45, 131, 0.2)' : 'rgba(255, 255, 255, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.25s ease',
          }}
        >
          <VectorIcon name="navigation" size={20} color={isEnabled ? '#FF83B9' : '#AAA4B0'} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '15px', color: '#F8F5F8', letterSpacing: '-0.2px' }}>
            Modo viaje
          </div>
          <div style={{ fontSize: '12px', color: isEnabled ? '#3FB950' : '#AAA4B0', marginTop: '2px', fontWeight: isEnabled ? 600 : 400 }}>
            {isEnabled ? 'Monitoreo activo' : 'Inactivo'}
          </div>
        </div>
      </div>

      {/* Switch Toggle Nativo y Táctil */}
      <div
        role="switch"
        aria-checked={isEnabled}
        tabIndex={0}
        onClick={handleToggle}
        style={{
          width: '52px',
          height: '30px',
          borderRadius: '15px',
          backgroundColor: isEnabled ? '#F52D83' : '#2B2436',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background-color 0.25s ease',
          boxShadow: isEnabled ? '0 0 14px rgba(245, 45, 131, 0.5)' : 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#F8F5F8',
            position: 'absolute',
            top: '3px',
            left: isEnabled ? '25px' : '3px',
            transition: 'left 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.35)',
          }}
        />
      </div>
    </div>
  );
}
