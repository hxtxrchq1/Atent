import React, { useState } from 'react';
import { CharacterMood, MOOD_IMAGES } from './AppCommon';
import { supabase } from '../supabaseClient';

interface AvatarSetupScreenProps {
  initialDisplayName: string;
  initialAvatar: CharacterMood;
  userId: string;
  onCompleted: (displayName: string, avatar: CharacterMood) => void;
}

const AVATAR_OPTIONS: { mood: CharacterMood; label: string; desc: string }[] = [
  { mood: 'FELIZ', label: 'Protector', desc: 'Alegre, dinámico y siempre alerta' },
  { mood: 'TRANQUILO', label: 'Guardián', desc: 'Sereno, firme y enfocado en la calma' },
  { mood: 'DUDOSO', label: 'Cauteloso', desc: 'Atento a los detalles y prevenido' },
  { mood: 'ENOJADO', label: 'Defensor', desc: 'Intransigente ante el peligro y resolutivo' },
];

export function AvatarSetupScreen({
  initialDisplayName,
  initialAvatar,
  userId,
  onCompleted,
}: AvatarSetupScreenProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName || '');
  const [selectedMood, setSelectedMood] = useState<CharacterMood>(initialAvatar || 'FELIZ');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    const finalName = displayName.trim() || initialDisplayName || 'Usuario Atent';
    setIsSaving(true);

    try {
      // Actualizar metadata del usuario en Supabase Auth
      await supabase.auth.updateUser({
        data: {
          display_name: finalName,
          avatar_url: selectedMood,
        },
      });

      // Intentar actualizar tabla pública si existe
      try {
        await supabase
          .from('profiles')
          .update({
            display_name: finalName,
            avatar_url: selectedMood,
          })
          .eq('id', userId);
      } catch {
        // Ignorar si la tabla aún no se ha creado
      }
    } catch {
      // Ignorar fallas de red silenciosamente para no bloquear al usuario
    } finally {
      setIsSaving(false);
      onCompleted(finalName, selectedMood);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '32px 24px 28px 24px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 6px 0', letterSpacing: '-0.4px', textAlign: 'center' }}>
          Personaliza tu perfil
        </h2>
        <p style={{ fontSize: '13px', color: '#AAA4B0', margin: '0 0 24px 0', textAlign: 'center' }}>
          Configura cómo te verán tus contactos de confianza en caso de alerta.
        </p>

        {/* Input: ¿Cómo quieres que te llamemos? */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: '#FF83B9', display: 'block', marginBottom: '8px', fontWeight: 700 }}>
            ¿Cómo quieres que te llamemos?
          </label>
          <input
            id="input-display-name"
            type="text"
            placeholder="Ej. Alonso, Ale, Papá..."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#1E1925',
              border: '1.5px solid #F52D83',
              borderRadius: '14px',
              color: '#F8F5F8',
              fontSize: '15px',
              fontWeight: 600,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Selector de Avatares 3D Originales */}
        <div>
          <label style={{ fontSize: '13px', color: '#AAA4B0', display: 'block', marginBottom: '12px', fontWeight: 700 }}>
            Elige tu avatar oficial de Atent:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {AVATAR_OPTIONS.map((opt) => {
              const isSelected = selectedMood === opt.mood;
              return (
                <div
                  key={opt.mood}
                  id={`avatar-option-${opt.mood}`}
                  onClick={() => setSelectedMood(opt.mood)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(245, 45, 131, 0.15)' : '#1E1925',
                    border: `2px solid ${isSelected ? '#F52D83' : '#282133'}`,
                    borderRadius: '16px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 20px rgba(245, 45, 131, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <img
                    src={MOOD_IMAGES[opt.mood]}
                    alt={opt.label}
                    style={{
                      height: '85px',
                      objectFit: 'contain',
                      filter: isSelected ? 'drop-shadow(0 4px 14px rgba(245, 45, 131, 0.4))' : 'none',
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#F8F5F8', marginTop: '8px' }}>
                    {opt.label}
                  </span>
                  <span style={{ fontSize: '10px', color: '#AAA4B0', textAlign: 'center', marginTop: '2px', lineHeight: 1.3 }}>
                    {opt.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '28px' }}>
        <button
          id="btn-continue-avatar-setup"
          onClick={handleContinue}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: isSaving ? '#706877' : '#F52D83',
            color: '#F8F5F8',
            border: 'none',
            borderRadius: '16px',
            fontWeight: 800,
            fontSize: '15px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 28px rgba(245, 45, 131, 0.45)',
          }}
        >
          {isSaving ? 'Guardando preferencias...' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
