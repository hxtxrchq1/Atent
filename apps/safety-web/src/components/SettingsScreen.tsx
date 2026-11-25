import React, { useEffect, useState } from 'react';
import { CharacterMood, MOOD_IMAGES, VectorIcon } from './AppCommon';
import { supabase } from '../supabaseClient';
import { disableWebPush, enableWebPush, getClientPlatform, getPushSupport, getWebPushSubscriptionState, sendWebPushTest, isEmergencySoundEnabled, setEmergencySoundEnabled, isEmergencyVibrationEnabled, isEmergencyVibrationSupported, setEmergencyVibrationEnabled, playEmergencySound } from '../pwa';

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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushTestBusy, setPushTestBusy] = useState(false);
  const [pushTestStatus, setPushTestStatus] = useState<'idle' | 'queued' | 'sent' | 'failed'>('idle');
  const [soundEnabled, setSoundEnabled] = useState(isEmergencySoundEnabled);
  const [vibrationEnabled, setVibrationEnabled] = useState(isEmergencyVibrationEnabled);
  const [focusGuideOpen, setFocusGuideOpen] = useState(false);
  const isIos = getClientPlatform().startsWith('ios-');

  useEffect(() => {
    let active = true;
    void getWebPushSubscriptionState().then((state) => {
      if (!active) return;
      setPushEnabled(state === 'enabled');
      if (currentUser?.id && state === 'enabled') localStorage.setItem(`atent_web_push_enabled_${currentUser.id}`, 'true');
    });
    return () => { active = false; };
  }, [currentUser?.id]);

  const handlePushToggle = async () => {
    if (!currentUser?.web_session_token) {
      showToast('Cierra sesión e inicia nuevamente para actualizar la seguridad de esta sesión.');
      return;
    }
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disableWebPush(currentUser.web_session_token);
        if (currentUser?.id) localStorage.removeItem(`atent_web_push_enabled_${currentUser.id}`);
        setPushEnabled(false);
        showToast('Notificaciones desactivadas en este dispositivo.');
      } else {
        await enableWebPush(currentUser.id, currentUser.web_session_token);
        const state = await getWebPushSubscriptionState();
        setPushEnabled(state === 'enabled');
        showToast(state === 'enabled' ? 'Notificaciones activadas y registradas en este dispositivo.' : 'El navegador no confirmó la suscripción Push.');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No fue posible cambiar las notificaciones.');
    } finally {
      setPushBusy(false);
    }
  };

  const handlePushTest = async () => {
    if (!currentUser?.web_session_token) {
      showToast('Cierra sesión e inicia nuevamente para actualizar la seguridad de esta sesión.');
      return;
    }
    setPushTestBusy(true);
    setPushTestStatus('queued');
    try {
      await sendWebPushTest(currentUser.web_session_token, setPushTestStatus);
      await getWebPushSubscriptionState().then((state) => setPushEnabled(state === 'enabled'));
      showToast('Apple aceptó la notificación de prueba. El sonido depende de los ajustes de iOS para Atent.');
    } catch (error) {
      setPushTestStatus('failed');
      showToast(error instanceof Error ? error.message : 'No se pudo enviar la notificación de prueba.');
    } finally {
      setPushTestBusy(false);
    }
  };

  const handleSoundToggle = async () => {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    await setEmergencySoundEnabled(nextEnabled);
    showToast(nextEnabled ? 'Sonido de alertas activado. Escucha la prueba.' : 'Sonido de alertas desactivado.');
  };

  const handleVibrationToggle = () => {
    if (!isEmergencyVibrationSupported()) return;
    const nextEnabled = !vibrationEnabled;
    setVibrationEnabled(nextEnabled);
    setEmergencyVibrationEnabled(nextEnabled);
    if (nextEnabled) navigator.vibrate([120, 70, 120]);
    showToast(nextEnabled ? 'Vibración activada cuando este navegador la permita.' : 'Vibración desactivada.');
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
          <p style={{ margin: '6px 0 10px' }}>{pushSupport.supported ? (pushEnabled ? 'Este dispositivo tiene una suscripción Push activa.' : 'Activa el permiso del sistema y registra este dispositivo en tu cuenta.') : pushSupport.reason}</p>
          {pushSupport.supported && (
            <>
              {!currentUser?.web_session_token && <p style={{ margin: '0 0 8px', color: '#FFB4CF' }}>Inicia sesión de nuevo una vez para vincular este dispositivo de forma segura.</p>}
              <button type="button" disabled={pushBusy || !currentUser?.web_session_token} onClick={() => void handlePushToggle()} style={{ width: '100%', minHeight: 44, padding: 11, backgroundColor: pushEnabled ? '#2A1820' : '#F52D83', color: '#F8F5F8', border: '1px solid #382F45', borderRadius: 10, fontWeight: 700, opacity: pushBusy || !currentUser?.web_session_token ? 0.7 : 1 }}>
                {pushBusy ? 'Actualizando…' : pushEnabled ? 'Desactivar notificaciones' : 'Permitir notificaciones'}
              </button>
              {pushEnabled && (
                <button type="button" disabled={pushTestBusy || !currentUser?.web_session_token} onClick={() => void handlePushTest()} style={{ width: '100%', marginTop: 8, minHeight: 44, padding: 11, backgroundColor: '#151219', color: '#FF83B9', border: '1px solid #382F45', borderRadius: 10, fontWeight: 700, opacity: pushTestBusy || !currentUser?.web_session_token ? 0.7 : 1 }}>
                  {pushTestBusy ? pushTestStatus === 'queued' ? 'Esperando confirmación de Apple…' : 'Enviando prueba…' : 'Probar notificación'}
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ padding: 14, marginBottom: 10, backgroundColor: '#151219', color: '#DDD6E3', border: '1px solid #382F45', borderRadius: 12, fontSize: 12, lineHeight: 1.5 }}>
          <strong style={{ color: '#F8F5F8' }}>Sonido mientras Atent está abierta</strong>
          <button type="button" role="switch" aria-checked={soundEnabled} onClick={() => void handleSoundToggle()} style={{ width: '100%', minHeight: 44, marginTop: 8, padding: 11, backgroundColor: soundEnabled ? '#2A1820' : '#09080D', color: soundEnabled ? '#FF83B9' : '#DDD6E3', border: '1px solid #382F45', borderRadius: 10, fontWeight: 700, textAlign: 'left' }}>
            Sonido de alerta en la app: {soundEnabled ? 'Activado' : 'Desactivado'}
          </button>
          <button type="button" disabled={!isEmergencyVibrationSupported()} role="switch" aria-checked={vibrationEnabled && isEmergencyVibrationSupported()} onClick={handleVibrationToggle} style={{ width: '100%', minHeight: 44, marginTop: 8, padding: 11, backgroundColor: '#09080D', color: isEmergencyVibrationSupported() ? '#DDD6E3' : '#827B88', border: '1px solid #382F45', borderRadius: 10, fontWeight: 700, textAlign: 'left', opacity: isEmergencyVibrationSupported() ? 1 : 0.72 }}>
            Vibración: {isEmergencyVibrationSupported() ? (vibrationEnabled ? 'Activada' : 'Desactivada') : 'La controla iOS'}
          </button>
          {!isEmergencyVibrationSupported() && <p style={{ margin: '7px 0 0', color: '#AAA4B0' }}>Una PWA no puede mantener vibración repetida hasta abrir Alertas. iOS controla la vibración de cada notificación desde Ajustes.</p>}
          {soundEnabled && <button type="button" onClick={() => void playEmergencySound(true)} style={{ width: '100%', minHeight: 40, marginTop: 8, padding: 9, backgroundColor: 'transparent', color: '#FF83B9', border: '1px solid #382F45', borderRadius: 10, fontWeight: 700 }}>Probar sonido en esta app</button>}
          <p style={{ margin: '7px 0 0', color: '#AAA4B0' }}>Con Atent en segundo plano o el iPhone bloqueado, el sonido estándar de la notificación depende de Ajustes → Notificaciones → Atent → Sonidos, el modo silencio y Enfoque. La PWA no puede elegir un tono propio ni insistir hasta que abras Alertas.</p>
        </div>

        {isIos ? (
          <div style={{ marginBottom: 10 }}>
            <button type="button" onClick={() => setFocusGuideOpen((open) => !open)} style={{ minHeight: 42, padding: '8px 10px', background: 'transparent', color: '#FF83B9', border: '1px solid #382F45', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
              {focusGuideOpen ? 'Ocultar pasos de Enfoque' : 'Cómo permitir Atent en Enfoque'}
            </button>
            {focusGuideOpen && <p style={{ margin: '8px 2px', color: '#AAA4B0', fontSize: 12, lineHeight: 1.5 }}>Abre Ajustes del iPhone → Enfoque → elige un modo → Apps → Añadir apps → Atent. iOS no permite que una PWA abra esta pantalla ni se agregue por sí sola.</p>}
          </div>
        ) : (
          <div style={{ padding: 14, backgroundColor: '#2A1820', border: '1px solid #FF304F', borderRadius: 12, display: 'flex', gap: 12 }}>
            <VectorIcon name="alert-triangle" size={20} color="#FF83B9" />
            <div><strong style={{ fontSize: 13 }}>Alertas durante No molestar</strong><p style={{ color: '#DDD6E3', fontSize: 12, margin: '4px 0 0' }}>Configura manualmente en Android el acceso especial de Atent. La entrega depende de los ajustes del sistema.</p></div>
          </div>
        )}

        {window.AndroidBridge?.getAppVersion && <button
          type="button"
          onClick={onCheckForUpdates}
          disabled={isCheckingUpdates}
          style={{ width: '100%', padding: '12px 14px', marginBottom: '10px', backgroundColor: updateVersion ? '#2A1820' : '#151219', color: updateVersion ? '#FF83B9' : '#F8F5F8', border: `1px solid ${updateVersion ? '#FF304F' : '#382F45'}`, borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: isCheckingUpdates ? 'wait' : 'pointer', opacity: isCheckingUpdates ? 0.7 : 1 }}
        >
          {isCheckingUpdates ? 'Buscando actualizaciones…' : updateVersion ? `Buscar / actualizar a Atent ${updateVersion}` : 'Buscar actualizaciones'}
        </button>}

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
