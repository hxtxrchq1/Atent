import React, { useState } from 'react';
import { CharacterMood, MOOD_IMAGES, VectorIcon } from './AppCommon';
import { supabase } from '../supabaseClient';
import { disableWebPush, enableWebPush, getClientPlatform, getPushSupport } from '../pwa';

interface SettingsScreenProps {
  currentUser: any;
  onOpenAvatarSetup: () => void;
  onOpenTutorial: () => void;
  onCheckForUpdates: () => void;
  updateVersion: string | null;
  isCheckingUpdates: boolean;
  onLogout: () => void;
  onUpdateDisplayName: (newName: string) => void;
  showToast: (msg: string) => void;
}

export function SettingsScreen({
  currentUser,
  onOpenAvatarSetup,
  onOpenTutorial,
  onCheckForUpdates,
  updateVersion,
  isCheckingUpdates,
  onLogout,
  onUpdateDisplayName,
  showToast,
}: SettingsScreenProps) {
  // Estado para modal de cambio de contraseña
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const pushSupport = getPushSupport();
  const [pushEnabled, setPushEnabled] = useState(() => Boolean(currentUser?.id && localStorage.getItem(`atent_web_push_enabled_${currentUser.id}`) === 'true'));
  const [pushBusy, setPushBusy] = useState(false);
  const [pushPassword, setPushPassword] = useState('');
  const isIos = getClientPlatform().startsWith('ios-');

  const handlePushToggle = async () => {
    if (!pushPassword) {
      showToast('Ingresa tu contraseña para confirmar este cambio.');
      return;
    }
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disableWebPush(currentUser.id, pushPassword);
        if (currentUser?.id) localStorage.removeItem(`atent_web_push_enabled_${currentUser.id}`);
        setPushEnabled(false);
        showToast('Notificaciones desactivadas en este dispositivo.');
      } else {
        await enableWebPush(currentUser.id, pushPassword);
        setPushEnabled(true);
        showToast('Notificaciones activadas en este dispositivo.');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No fue posible cambiar las notificaciones.');
    } finally {
      setPushBusy(false);
      setPushPassword('');
    }
  };

  // Datos seguros del usuario con fallbacks
  const legalName = currentUser?.legal_name || 'Usuario';
  const legalSurname = currentUser?.legal_surname || '';
  const displayName = currentUser?.display_name || legalName;
  const phoneNumber = currentUser?.phone_normalized || currentUser?.phone_national || 'Sin número';
  const avatarMood: CharacterMood = currentUser?.avatar_url || 'FELIZ';
  const avatarImg = MOOD_IMAGES[avatarMood] || MOOD_IMAGES.FELIZ;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Ingresa tu contraseña actual.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las nuevas contraseñas no coinciden.');
      return;
    }

    setIsChangingPassword(true);

    try {
      // 1. Intentar cambiar vía Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        // 2. Intentar vía función RPC en profiles si usa auth directa
        const { data: rpcData, error: rpcError } = await supabase.rpc('app_change_password', {
          p_phone_normalized: currentUser?.phone_normalized,
          p_old_password: currentPassword,
          p_new_password: newPassword,
        });

        if (rpcError || (rpcData && !rpcData.success)) {
          setPasswordError(rpcData?.error || authError.message || 'Error al cambiar la contraseña.');
          setIsChangingPassword(false);
          return;
        }
      }

      showToast('Contraseña cambiada exitosamente.');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Error de conexión al actualizar contraseña.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 20px',
        gap: '16px',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 4px 0', letterSpacing: '-0.3px' }}>
          Ajustes
        </h2>
        <p style={{ fontSize: '12px', color: '#AAA4B0', margin: 0 }}>
          Gestión de cuenta, seguridad y preferencias
        </p>
      </div>

      {/* SECCIÓN 1: CUENTA Y SEGURIDAD */}
      <div
        style={{
          backgroundColor: '#1E1925',
          borderRadius: '20px',
          border: '1px solid #282133',
          padding: '18px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#FF83B9', fontWeight: 800, letterSpacing: '0.5px' }}>
          CUENTA Y SEGURIDAD
        </span>

        {/* Tarjeta de Identidad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '14px' }}>
          <img
            src={avatarImg}
            alt="Avatar"
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 4px 12px rgba(245, 45, 131, 0.35))',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '16px', color: '#F8F5F8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: '13px', color: '#AAA4B0', marginTop: '2px' }}>
              {legalName} {legalSurname}
            </div>
            <div style={{ fontSize: '12px', color: '#FF83B9', marginTop: '2px', fontFamily: 'monospace' }}>
              {phoneNumber}
            </div>
          </div>
        </div>

        {/* Acciones de Perfil */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={onOpenAvatarSetup}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: '#151219',
              color: '#F8F5F8',
              border: '1px solid #382F45',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Cambiar apodo o avatar 3D</span>
            <span style={{ color: '#FF83B9' }}>&rarr;</span>
          </button>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: '#151219',
              color: '#F8F5F8',
              border: '1px solid #382F45',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Cambiar contraseña</span>
            <span style={{ color: '#FF83B9' }}>&rarr;</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN 2: DISPOSITIVO Y NOTIFICACIONES */}
      <div
        style={{
          backgroundColor: '#1E1925',
          borderRadius: '20px',
          border: '1px solid #282133',
          padding: '18px',
        }}
      >
        <span style={{ fontSize: '11px', color: '#AAA4B0', fontWeight: 800, letterSpacing: '0.5px' }}>
          DISPOSITIVO Y PRIVACIDAD
        </span>

        <p style={{ fontSize: '12px', color: '#AAA4B0', margin: '10px 0 14px 0', lineHeight: 1.4 }}>
          Permisos del dispositivo, ubicación y notificaciones de Atent.
        </p>

        <button
          type="button"
          onClick={onOpenTutorial}
          style={{ width: '100%', padding: '12px 14px', marginBottom: '10px', backgroundColor: '#151219', color: '#F8F5F8', border: '1px solid #382F45', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
        >
          Ver guia rapida de Atent
        </button>

        {getClientPlatform() === 'ios-safari' && (
          <div style={{ padding: 14, marginBottom: 10, backgroundColor: '#151219', color: '#DDD6E3', border: '1px solid #382F45', borderRadius: 12, fontSize: 12, lineHeight: 1.5 }}>
            Para instalar Atent: en Safari toca Compartir → Añadir a pantalla de inicio y abre Atent desde el nuevo icono.
          </div>
        )}

        <div style={{ padding: 14, marginBottom: 10, backgroundColor: '#151219', color: '#DDD6E3', border: '1px solid #382F45', borderRadius: 12, fontSize: 12, lineHeight: 1.5 }}>
          <strong style={{ color: '#F8F5F8' }}>Notificaciones de Atent</strong>
          <p style={{ margin: '6px 0 10px' }}>{pushSupport.supported ? 'Actívalas para recibir alertas en este dispositivo.' : pushSupport.reason}</p>
          {pushSupport.supported && (
            <>
              <label style={{ display: 'block', marginBottom: 8 }} htmlFor="push-account-password">Confirma tu contraseña de Atent</label>
              <input id="push-account-password" type="password" autoComplete="current-password" value={pushPassword} onChange={(event) => setPushPassword(event.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8, padding: 11, backgroundColor: '#09080D', color: '#F8F5F8', border: '1px solid #382F45', borderRadius: 10 }} />
              <button type="button" disabled={pushBusy || !pushPassword} onClick={() => void handlePushToggle()} style={{ width: '100%', padding: 11, backgroundColor: pushEnabled ? '#2A1820' : '#F52D83', color: '#F8F5F8', border: '1px solid #382F45', borderRadius: 10, fontWeight: 700, opacity: pushBusy || !pushPassword ? 0.7 : 1 }}>
                {pushBusy ? 'Actualizando…' : pushEnabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
              </button>
            </>
          )}
        </div>

        {isIos ? (
          <div style={{ padding: 14, backgroundColor: '#1E1925', color: '#DDD6E3', border: '1px solid #382F45', borderRadius: 12, fontSize: 12, lineHeight: 1.55 }}>
            <strong style={{ color: '#F8F5F8' }}>Enfoque y No molestar en iOS</strong>
            <p style={{ margin: '6px 0 0' }}>En Ajustes → Notificaciones → Atent, permite notificaciones y sonidos. En Ajustes → Enfoque, añade Atent a las apps permitidas para cada modo si deseas recibir avisos durante ese Enfoque. iOS puede silenciar o retrasar notificaciones según tus ajustes, conexión y estado del dispositivo. La PWA no puede activar No molestar ni usar las Critical Alerts de apps nativas.</p>
          </div>
        ) : (
          <div style={{ padding: 14, backgroundColor: '#2A1820', border: '1px solid #FF304F', borderRadius: 12, display: 'flex', gap: 12 }}>
            <VectorIcon name="alert-triangle" size={20} color="#FF83B9" />
            <div><strong style={{ fontSize: 13 }}>Alertas durante No molestar</strong><p style={{ color: '#DDD6E3', fontSize: 12, margin: '4px 0 0' }}>Configura manualmente en Android el acceso especial de Atent. La entrega depende de los ajustes del sistema.</p></div>
          </div>
        )}

        <button
          type="button"
          onClick={onCheckForUpdates}
          disabled={isCheckingUpdates}
          style={{ width: '100%', padding: '12px 14px', marginBottom: '10px', backgroundColor: updateVersion ? '#2A1820' : '#151219', color: updateVersion ? '#FF83B9' : '#F8F5F8', border: `1px solid ${updateVersion ? '#FF304F' : '#382F45'}`, borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: isCheckingUpdates ? 'wait' : 'pointer', opacity: isCheckingUpdates ? 0.7 : 1 }}
        >
          {isCheckingUpdates ? 'Buscando actualizaciones…' : updateVersion ? `Buscar / actualizar a Atent ${updateVersion}` : 'Buscar actualizaciones'}
        </button>

        {window.AndroidBridge?.openAppSettings && (
          <button
            onClick={() => window.AndroidBridge?.openAppSettings()}
            style={{
              width: '100%',
              padding: '12px 14px',
              backgroundColor: '#151219',
              color: '#FF83B9',
              border: '1px solid #382F45',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Abrir Ajustes de Android
          </button>
        )}
        {window.AndroidBridge?.openNotificationPolicySettings && (
          <button
            onClick={() => window.AndroidBridge?.openNotificationPolicySettings?.()}
            style={{ width: '100%', padding: '12px 14px', marginTop: '10px', backgroundColor: '#2A1820', color: '#FF83B9', border: '1px solid #FF304F', borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Permitir alertas durante No molestar
          </button>
        )}
      </div>

      {/* BOTÓN CERRAR SESIÓN */}
      <button
        id="btn-logout"
        onClick={onLogout}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: 'rgba(255, 48, 79, 0.15)',
          color: '#FF304F',
          border: '1.5px solid #FF304F',
          borderRadius: '14px',
          fontSize: '14px',
          fontWeight: 800,
          cursor: 'pointer',
          marginTop: 'auto',
        }}
      >
        Cerrar sesión
      </button>

      <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: '#706877' }}>
          Atent V1 · v1.9
        </span>
      </div>

      {/* MODAL: CAMBIAR CONTRASEÑA */}
      {isPasswordModalOpen && (
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
            zIndex: 300,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#1E1925',
              borderRadius: '24px',
              border: '1px solid #382F45',
              padding: '24px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>Cambiar contraseña</h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#AAA4B0', cursor: 'pointer' }}
              >
                <VectorIcon name="cross" size={18} color="#AAA4B0" />
              </button>
            </div>

            {passwordError && (
              <div
                style={{
                  backgroundColor: 'rgba(255, 48, 79, 0.15)',
                  border: '1px solid #FF304F',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  color: '#FF83B9',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '14px',
                }}
              >
                {passwordError}
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  Contraseña actual
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 12px',
                      backgroundColor: '#151219',
                      border: '1px solid #2B2436',
                      borderRadius: '12px',
                      color: '#F8F5F8',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#AAA4B0',
                      cursor: 'pointer',
                    }}
                  >
                    <VectorIcon name={showCurrentPassword ? 'eye-off' : 'eye'} size={16} color="#AAA4B0" />
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  Nueva contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 12px',
                      backgroundColor: '#151219',
                      border: '1px solid #2B2436',
                      borderRadius: '12px',
                      color: '#F8F5F8',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#AAA4B0',
                      cursor: 'pointer',
                    }}
                  >
                    <VectorIcon name={showNewPassword ? 'eye-off' : 'eye'} size={16} color="#AAA4B0" />
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#FF83B9', display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                  Confirmar nueva contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 42px 12px 12px',
                      backgroundColor: '#151219',
                      border: '1px solid #2B2436',
                      borderRadius: '12px',
                      color: '#F8F5F8',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#AAA4B0',
                      cursor: 'pointer',
                    }}
                  >
                    <VectorIcon name={showConfirmPassword ? 'eye-off' : 'eye'} size={16} color="#AAA4B0" />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
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
                  disabled={isChangingPassword}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: isChangingPassword ? '#706877' : '#F52D83',
                    color: '#F8F5F8',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isChangingPassword ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isChangingPassword ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
