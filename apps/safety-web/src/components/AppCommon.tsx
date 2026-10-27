import React, { useState, useEffect, useRef } from 'react';
import { ATENT_TOKENS } from '@atent/shared/tokens';
import { supabase, normalizePhoneNumber, deriveAuthEmailFromPhone } from './supabaseClient';

export type ScreenId =
  | 'welcome'
  | 'register'
  | 'login'
  | 'avatar_setup'
  | 'onboarding'
  | 'home'
  | 'location'
  | 'contacts'
  | 'alerts'
  | 'settings'
  | 'active_sos';

export type CharacterMood = 'FELIZ' | 'DUDOSO' | 'ENOJADO' | 'TRANQUILO';

export interface CountryOption {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'PE', dialCode: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: 'CO', dialCode: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: 'MX', dialCode: '+52', flag: '🇲🇽', name: 'México' },
  { code: 'CL', dialCode: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: 'AR', dialCode: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'España' },
];

export const MOOD_IMAGES: Record<CharacterMood, string> = {
  FELIZ: './assets/character/Feliz.png',
  DUDOSO: './assets/character/dudoso.png',
  ENOJADO: './assets/character/enojado.png',
  TRANQUILO: './assets/character/tranquilo.png',
};

// Global Android Native Bridge Interface
declare global {
  interface Window {
    AndroidBridge?: {
      pickPhoneContact: () => void;
      requestAppPermissions: () => void;
      requestBackgroundLocationPermission?: () => void;
      checkPermissionsStatus: () => string;
      openAppSettings: () => void;
      openExternalUrl?: (url: string) => void;
      getRealLocation: (requestId?: string) => void;
      isGpsEnabled: () => boolean;
      startEmergencyForegroundService: () => void;
      stopEmergencyForegroundService: () => void;
      getBatteryStatus: () => string;
      openLocationSettings?: () => void;
      showIncomingEmergencyAlert?: (ownerName: string) => void;
      stopIncomingEmergencyAlert?: () => void;
      configureTrustedAlertReceiver?: (userId: string) => void;
      stopTrustedAlertReceiver?: () => void;
      openNotificationPolicySettings?: () => void;
      isNotificationPolicyAccessGranted?: () => boolean;
      getAppVersion: () => string;
    };
    onAndroidContactPicked?: (name: string, phoneNumber: string) => void;
    onAndroidPermissionsResult?: (result: Record<string, boolean>) => void;
    onAndroidLocationReceived?: (loc: { latitude: number; longitude: number; accuracy: number; timestamp: number; requestId?: string }) => void;
    onAndroidLocationError?: (err: string) => void;
  }
}

// Personaje 3D Oficial a Cuerpo Completo y Fondo Transparente
export function FullBodyCharacter({
  mood = 'FELIZ',
  height = 160,
  speechText = null,
}: {
  mood?: CharacterMood;
  height?: number;
  speechText?: string | null;
}) {
  const imgSrc = MOOD_IMAGES[mood] || MOOD_IMAGES.FELIZ;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        gap: '12px',
      }}
    >
      <div
        className="atent-floating-character"
        style={{
          position: 'relative',
          height: `${height}px`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          filter:
            mood === 'ENOJADO'
              ? 'drop-shadow(0 14px 28px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 20px rgba(255, 48, 79, 0.35))'
              : 'drop-shadow(0 14px 28px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 18px rgba(245, 45, 131, 0.25))',
        }}
      >
        <img
          src={imgSrc}
          alt={`Atent ${mood}`}
          style={{
            height: '100%',
            width: 'auto',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
      </div>

      {speechText && (
        <div
          className="atent-floating-bubble"
          style={{
            position: 'relative',
            background:
              mood === 'ENOJADO'
                ? 'linear-gradient(135deg, rgba(60, 14, 20, 0.92) 0%, rgba(30, 25, 37, 0.95) 100%)'
                : 'linear-gradient(135deg, rgba(42, 28, 52, 0.9) 0%, rgba(27, 23, 34, 0.95) 100%)',
            border: `1.5px solid ${
              mood === 'ENOJADO' ? '#FF304F' : mood === 'DUDOSO' ? '#D29922' : '#F52D83'
            }`,
            borderRadius: '18px',
            padding: '10px 16px',
            boxShadow:
              mood === 'ENOJADO'
                ? '0 10px 28px rgba(255, 48, 79, 0.25), 0 4px 12px rgba(0, 0, 0, 0.6)'
                : '0 10px 28px rgba(245, 45, 131, 0.2), 0 4px 12px rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            maxWidth: '175px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '-7px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: `7px solid ${
                mood === 'ENOJADO' ? '#FF304F' : mood === 'DUDOSO' ? '#D29922' : '#F52D83'
              }`,
            }}
          />
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#F8F5F8',
              lineHeight: 1.35,
              letterSpacing: '-0.2px',
              userSelect: 'none',
            }}
          >
            {speechText}
          </div>
        </div>
      )}
    </div>
  );
}

// Iconografía vectorial consistente (Cero emojis en navegación y botones)
export function VectorIcon({ name, size = 18, color = '#AAA4B0' }: { name: string; size?: number; color?: string }) {
  if (name === 'shield') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    );
  }
  if (name === 'map-pin') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  if (name === 'users') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (name === 'alert-triangle') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  if (name === 'eye') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (name === 'eye-off') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  if (name === 'cross') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (name === 'phone-book') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z" />
        <line x1="8" y1="2" x2="8" y2="22" />
        <circle cx="14" cy="10" r="2" />
        <path d="M11 16a3 3 0 0 1 6 0" />
      </svg>
    );
  }
  if (name === 'navigation') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    );
  }
  if (name === 'battery') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="18" height="12" rx="2" ry="2" />
        <line x1="23" y1="13" x2="23" y2="11" />
      </svg>
    );
  }
  return null;
}
