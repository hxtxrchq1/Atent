import React, { useState, useEffect, useRef } from 'react';
import { ATENT_TOKENS } from '@atent/shared/tokens';
import {
  ScreenId,
  CharacterMood,
  FullBodyCharacter,
  VectorIcon,
} from './components/AppCommon';
import { AuthScreens } from './components/AuthScreens';
import { AvatarSetupScreen } from './components/AvatarSetupScreen';
import { TripModeSwitch } from './components/TripModeSwitch';
import { AlertsPanel, AlertDetailModal, EmergencyAlertItem } from './components/AlertsPanel';
import { GoogleMapView } from './components/GoogleMapView';
import { SettingsScreen } from './components/SettingsScreen';
import { ContactsScreen, TrustedContact, ContactRequest } from './components/ContactsScreen';
import { SosDragCancelButton } from './components/SosDragCancelButton';
import { supabase } from './supabaseClient';
import { AvailableUpdate, checkForLatestUpdate } from './update-checker';

export function DesignShowcaseApp() {
  const tokens = ATENT_TOKENS;

  // Local storage keys
  const STORAGE_KEY_AUTH = 'atent_auth_user_v2';
  const STORAGE_KEY_ONBOARDED = 'atent_onboarded_v2';
  const STORAGE_KEY_TRIP_MODE = 'atent_trip_mode_v2';
  const STORAGE_KEY_SOS_ACTIVE = 'atent_sos_active_v2';
  const STORAGE_KEY_SECURITY_SETUP = 'atent_security_setup_v1';

  // Sesión de Usuario
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  // Navegación
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!savedUser) return 'welcome';
    const onboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED) === 'true';
    const securitySetup = localStorage.getItem(STORAGE_KEY_SECURITY_SETUP) === 'true';
    return onboarded && securitySetup ? 'home' : 'onboarding';
  });
  const [onboardingStep, setOnboardingStep] = useState<'permissions' | 'tutorial'>('permissions');

  const [activeTab, setActiveTab] = useState<'home' | 'location' | 'contacts' | 'alerts' | 'settings'>('home');

  // Personaje y Estado Emocional
  const [characterMood, setCharacterMood] = useState<CharacterMood>(() => currentUser?.avatar_url || 'FELIZ');
  const [characterSpeech, setCharacterSpeech] = useState<string | null>('Estoy aquí para acompañarte');

  // MODO VIAJE: Switch Único Persistente (Requisito 2)
  const [isTripModeEnabled, setIsTripModeEnabled] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_TRIP_MODE) === 'true';
  });

  // ESTADO SOS: Activación Inmediata y Botón de Cancelación (Requisito 1)
  const [isSosActive, setIsSosActive] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_SOS_ACTIVE) === 'true';
  });
  const [isPressingSos, setIsPressingSos] = useState(false);
  const [activeEmergencyAlertId, setActiveEmergencyAlertId] = useState<string | null>(null);
  const activeEmergencyAlertIdRef = useRef<string | null>(null);
  const currentUserRef = useRef<any>(null);

  // RED DE CONTACTOS Y SOLICITUDES MUTUAS (Requisito 7)
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<ContactRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ContactRequest[]>([]);
  const [pickedContact, setPickedContact] = useState<{ name: string; phone: string } | null>(null);

  // ALERTAS DE CONTACTOS (Requisito 8)
  const [alerts, setAlerts] = useState<EmergencyAlertItem[]>([]);
  const [isRefreshingAlerts, setIsRefreshingAlerts] = useState(false);
  const [selectedAlertForDetail, setSelectedAlertForDetail] = useState<EmergencyAlertItem | null>(null);
  const notifiedAlertIdsRef = useRef<Set<string>>(new Set());

  // UBICACIÓN REAL (Requisito 3)
  const [realLocation, setRealLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'IDLE' | 'FETCHING' | 'AVAILABLE' | 'UNAVAILABLE' | 'PERMISSION_DENIED'>('IDLE');
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);
  const locationRequestIdRef = useRef<string | null>(null);
  const locationRequestInFlightRef = useRef(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const currentScreenRef = useRef<ScreenId>(currentScreen);
  const onboardingStepRef = useRef<'permissions' | 'tutorial'>(onboardingStep);
  const permissionModalShownRef = useRef(false);

  // BATERÍA NATIVA
  const [batteryState, setBatteryState] = useState<{ level: number; isCharging: boolean } | null>(null);
  const batteryStateRef = useRef<{ level: number; isCharging: boolean } | null>(null);
  const tripModeRef = useRef(false);
  activeEmergencyAlertIdRef.current = activeEmergencyAlertId;
  currentUserRef.current = currentUser;
  batteryStateRef.current = batteryState;
  tripModeRef.current = isTripModeEnabled;
  currentScreenRef.current = currentScreen;
  onboardingStepRef.current = onboardingStep;

  // PERMISOS DE ANDROID
  const [permissionsState, setPermissionsState] = useState<{
    location: boolean;
    backgroundLocation: boolean;
    contacts: boolean;
    notifications: boolean;
    notificationPolicyAccess: boolean;
  }>({
    location: false,
    backgroundLocation: false,
    contacts: false,
    notifications: false,
    notificationPolicyAccess: false,
  });

  // MODALES Y TOAST
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableUpdate | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const checkAppUpdate = async (openModal = true) => {
    try {
      const update = await checkForLatestUpdate();
      setAvailableUpdate(update);
      if (update && openModal) setShowUpdateModal(true);
      if (!update && openModal) showToast('Ya tienes la versión más reciente de Atent.');
    } catch {
      if (openModal) showToast('No se pudo comprobar actualizaciones. Inténtalo más tarde.');
    }
  };

  useEffect(() => {
    void checkAppUpdate(false);
    const interval = window.setInterval(() => { void checkAppUpdate(false); }, 6 * 60 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const openUpdateDownload = () => {
    if (!availableUpdate) return;
    if (window.AndroidBridge?.openExternalUrl) window.AndroidBridge.openExternalUrl(availableUpdate.downloadUrl);
    else window.open(availableUpdate.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  const applyPermissionState = (parsed: Record<string, boolean>) => {
    const next = {
      location: Boolean(parsed.location),
      backgroundLocation: parsed.backgroundLocation ?? !window.AndroidBridge,
      contacts: Boolean(parsed.contacts),
      notifications: Boolean(parsed.notifications),
      notificationPolicyAccess: parsed.notificationPolicyAccess ?? !window.AndroidBridge,
    };
    setPermissionsState(next);
    // La ubicación en segundo plano y el acceso de No molestar son
    // capacidades opcionales de Android. No deben bloquear el acceso al
    // inicio: muchos usuarios eligen "solo mientras se usa la app".
    const ready = next.location && next.contacts && next.notifications;
    if (ready) {
      // Android es la fuente de verdad. Si todos los permisos siguen
      // concedidos, no mostramos el modal de confirmación al volver a abrir
      // la app: marcamos la configuración como completa y entramos al inicio.
      setConfirmModal(null);
      permissionModalShownRef.current = false;
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
      localStorage.setItem(STORAGE_KEY_SECURITY_SETUP, 'true');
      if (currentScreenRef.current === 'onboarding') {
        setCurrentScreen('home');
        setActiveTab('home');
      }
    } else {
      // No abrir modales ni diálogos automáticamente. El usuario puede
      // conceder lo que desee desde el onboarding o Ajustes sin quedar en un
      // ciclo cuando Android devuelve permisos parciales.
      permissionModalShownRef.current = false;
    }
  };

  // Guardar Modo Viaje en configuración
  const handleToggleTripMode = (nextState: boolean) => {
    setIsTripModeEnabled(nextState);
    localStorage.setItem(STORAGE_KEY_TRIP_MODE, nextState ? 'true' : 'false');
    if (nextState) {
      showToast('Modo viaje activado.');
      requestDeviceLocation();
    } else {
      showToast('Modo viaje desactivado.');
    }
  };

  // Actualizar batería nativa
  const refreshBattery = () => {
    if (window.AndroidBridge?.getBatteryStatus) {
      try {
        const raw = window.AndroidBridge.getBatteryStatus();
        const parsed = JSON.parse(raw);
        if (parsed.level >= 0) {
          setBatteryState({ level: parsed.level, isCharging: Boolean(parsed.isCharging) });
        }
      } catch {
        // ignore
      }
    } else if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((b: any) => {
        setBatteryState({ level: Math.round(b.level * 100), isCharging: Boolean(b.charging) });
      });
    }
  };

  // Consultar contactos y solicitudes desde Supabase
  const loadContactsAndRequests = async () => {
    if (!currentUser?.id) return;

    try {
      // 1. Contactos confiables aceptados
      const { data: contactsData } = await supabase
        .from('trusted_contacts')
        .select('*, trusted_user:trusted_user_id(display_name, phone_normalized, avatar_url)')
        .eq('user_id', currentUser.id);

      if (contactsData) {
        setContacts(
          contactsData.map((c: any) => ({
            id: c.id,
            user_id: c.user_id,
            trusted_user_id: c.trusted_user_id,
            display_name: c.trusted_user?.display_name || 'Contacto de auxilio',
            phone_normalized: c.trusted_user?.phone_normalized || '',
            avatar_url: c.trusted_user?.avatar_url || 'FELIZ',
            relationship: c.relationship || 'Amigo',
            created_at: c.created_at,
          }))
        );
      }

      // 2. Solicitudes recibidas pendientes
      const { data: recData } = await supabase
        .from('trusted_contact_requests')
        .select('*, sender:sender_user_id(display_name, phone_normalized, avatar_url)')
        .eq('recipient_user_id', currentUser.id);

      if (recData) {
        setReceivedRequests(
          recData.map((r: any) => ({
            id: r.id,
            sender_user_id: r.sender_user_id,
            recipient_user_id: r.recipient_user_id,
            sender_name: r.sender?.display_name || 'Usuario Atent',
            sender_phone: r.sender?.phone_normalized || '',
            sender_avatar: r.sender?.avatar_url || 'FELIZ',
            status: r.status,
            created_at: r.created_at,
          }))
        );
      }

      // 3. Solicitudes enviadas
      const { data: sentData } = await supabase
        .from('trusted_contact_requests')
        .select('*')
        .eq('sender_user_id', currentUser.id);

      if (sentData) {
        setSentRequests(sentData);
      }
    } catch {
      // Fallback local silencioso si aún no se ejecutan las migraciones
    }
  };

  const loadTrustedAlerts = async () => {
    if (!currentUser?.id) return;
    const { data, error } = await supabase.rpc('get_trusted_alerts', {
      p_viewer_user_id: currentUser.id,
    });
    if (error || !data) return;
    const nextAlerts = data.map((alert: any) => ({
      id: alert.id,
      owner_user_id: alert.owner_user_id,
      owner_name: alert.owner_name || 'Contacto de auxilio',
      owner_avatar: alert.owner_avatar || 'FELIZ',
      status: alert.status,
      created_at: alert.created_at,
      last_latitude: alert.last_latitude ?? undefined,
      last_longitude: alert.last_longitude ?? undefined,
      last_accuracy: alert.last_accuracy ?? undefined,
      last_battery_level: alert.last_battery_level ?? undefined,
      last_battery_charging: alert.last_battery_charging ?? undefined,
      is_in_vehicle: Boolean(alert.is_in_vehicle),
      last_updated_at: alert.updated_at,
      last_recorded_at: alert.last_recorded_at ?? undefined,
    }));
    setAlerts(nextAlerts);
    // Mantener abierto el detalle con la última posición recibida. Sin esta
    // actualización el usuario 2 veía una copia congelada del alerta aunque
    // el registro ya hubiera cambiado en Supabase.
    setSelectedAlertForDetail((current) => {
      if (!current) return current;
      return nextAlerts.find((alert: EmergencyAlertItem) => alert.id === current.id) || current;
    });
    const newActiveAlert = nextAlerts.find((alert: EmergencyAlertItem) =>
      alert.status === 'active' && !notifiedAlertIdsRef.current.has(alert.id)
    );
    if (newActiveAlert && currentScreen !== 'alerts') {
      notifiedAlertIdsRef.current.add(newActiveAlert.id);
      window.AndroidBridge?.showIncomingEmergencyAlert?.(newActiveAlert.owner_name);
    }
  };

  const refreshTrustedAlerts = async () => {
    setIsRefreshingAlerts(true);
    try {
      await Promise.all([loadTrustedAlerts(), loadContactsAndRequests()]);
      showToast('Alertas y solicitudes actualizadas.');
    } finally {
      setIsRefreshingAlerts(false);
    }
  };

  useEffect(() => {
    if (currentScreen === 'alerts') {
      window.AndroidBridge?.stopIncomingEmergencyAlert?.();
    }
  }, [currentScreen]);

  // Cargar periódicamente alertas y solicitudes
  useEffect(() => {
    if (currentUser?.id) {
      window.AndroidBridge?.configureTrustedAlertReceiver?.(currentUser.id);
      loadContactsAndRequests();
      loadTrustedAlerts();
    }
  }, [currentUser]);

  // La suscripción notifica cambios cuando Supabase Realtime está habilitado;
  // el sondeo corto mantiene el panel actualizado en instalaciones sin Realtime.
  useEffect(() => {
    if (!currentUser?.id) return;
    const refresh = () => { void loadTrustedAlerts(); };
    const interval = window.setInterval(refresh, 5000);
    const channel = supabase
      .channel(`trusted-alerts-${currentUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, async (payload: any) => {
        refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_locations' }, refresh)
      .subscribe();
    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Escuchadores de Android Bridge
  useEffect(() => {
    refreshBattery();

    window.onAndroidContactPicked = (pickedName: string, pickedPhone: string) => {
      if (!pickedName && !pickedPhone) return;
      setPickedContact({ name: pickedName, phone: pickedPhone });
      showToast(`Contacto seleccionado: ${pickedName}`);
    };

    window.onAndroidPermissionsResult = (res: Record<string, boolean>) => {
      let status: Record<string, boolean> = res;
      try {
        if (window.AndroidBridge?.checkPermissionsStatus) {
          status = JSON.parse(window.AndroidBridge.checkPermissionsStatus());
        }
      } catch {
        // Usar el resultado puntual si Android aún no expone el estado completo.
      }
      const loc = Boolean(status.location || status['android.permission.ACCESS_FINE_LOCATION'] || status['android.permission.ACCESS_COARSE_LOCATION']);
      const cnt = Boolean(status.contacts || status['android.permission.READ_CONTACTS']);
      const not = status.notifications ?? status['android.permission.POST_NOTIFICATIONS'] ?? !('android.permission.POST_NOTIFICATIONS' in res);
      applyPermissionState({
        location: loc,
        backgroundLocation: Boolean(status.backgroundLocation),
        contacts: cnt,
        notifications: not,
        notificationPolicyAccess: status.notificationPolicyAccess ?? (window.AndroidBridge?.isNotificationPolicyAccessGranted?.() || false),
      });
      if (loc) {
        requestDeviceLocation();
      }
    };

    window.onAndroidLocationReceived = (loc) => {
      if (loc.requestId && loc.requestId !== locationRequestIdRef.current) return;
      locationRequestInFlightRef.current = false;
      setRealLocation(loc);
      setLocationStatus('AVAILABLE');
      setLocationErrorMessage(null);
      void syncActiveEmergencyTelemetry(loc);
    };

    window.onAndroidLocationError = (err) => {
      locationRequestInFlightRef.current = false;
      if (err === 'PERMISSION_DENIED') {
        setLocationStatus('PERMISSION_DENIED');
        setLocationErrorMessage('Permiso de ubicación denegado.');
      } else if (err === 'GPS_DISABLED') {
        setLocationStatus('UNAVAILABLE');
        setLocationErrorMessage('GPS_DISABLED');
      } else {
        setLocationStatus('UNAVAILABLE');
        setLocationErrorMessage('Señal GPS no disponible.');
      }
    };

    window.onAndroidAppResumed = () => {
      // Al volver a la app desde los ajustes de Android, comprobar nuevamente ubicación
      requestDeviceLocation();
      refreshBattery();
      if (currentUser?.id) {
        loadContactsAndRequests();
      }
      if (window.AndroidBridge?.checkPermissionsStatus) {
        try {
          applyPermissionState(JSON.parse(window.AndroidBridge.checkPermissionsStatus()));
        } catch {
          // Android puede estar terminando de actualizar el permiso especial.
        }
      }
    };

    if (window.AndroidBridge?.checkPermissionsStatus) {
      try {
        const parsed = JSON.parse(window.AndroidBridge.checkPermissionsStatus());
        applyPermissionState(parsed);
      } catch {
        // ignore
      }
    }

    return () => {
      delete window.onAndroidContactPicked;
      delete window.onAndroidPermissionsResult;
      delete window.onAndroidLocationReceived;
      delete window.onAndroidLocationError;
      delete window.onAndroidAppResumed;
    };
  }, []);

  // Actualiza la bandeja de solicitudes sin obligar al usuario a cerrar/abrir
  // la pantalla. Realtime solo entrega metadatos de la solicitud; los perfiles
  // se consultan con las políticas existentes al recargar.
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`trusted-requests-${currentUser.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'trusted_contact_requests',
        filter: `recipient_user_id=eq.${currentUser.id}`,
      }, () => {
        loadContactsAndRequests();
        showToast('Tienes una nueva solicitud para tu red de confianza.');
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentUser?.id]);

  const syncActiveEmergencyTelemetry = async (loc: { latitude: number; longitude: number; accuracy: number; timestamp: number }) => {
    const user = currentUserRef.current;
    const alertId = activeEmergencyAlertIdRef.current;
    if (!user?.id || !alertId) return;
    // La pantalla del propietario se actualiza inmediatamente, mientras que
    // el usuario 2 recibe el mismo punto mediante emergency_alerts + Realtime
    // (con sondeo de respaldo cada 5 s).
    setRealLocation(loc);
    setLocationStatus('AVAILABLE');
    setLocationErrorMessage(null);
    const telemetry = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      battery_level: batteryStateRef.current?.level ?? null,
      is_charging: batteryStateRef.current?.isCharging ?? false,
      is_in_vehicle: tripModeRef.current,
      recorded_at: new Date(loc.timestamp).toISOString(),
    };
    const { error: locationError } = await supabase
      .from('emergency_locations')
      .insert([{ emergency_alert_id: alertId, ...telemetry }]);
    const { error: alertError } = await supabase.from('emergency_alerts').update({
      last_latitude: loc.latitude,
      last_longitude: loc.longitude,
      last_accuracy: loc.accuracy,
      last_battery_level: batteryStateRef.current?.level ?? null,
      last_battery_charging: batteryStateRef.current?.isCharging ?? false,
      is_in_vehicle: tripModeRef.current,
      updated_at: new Date().toISOString(),
    }).eq('id', alertId).eq('owner_user_id', user.id).eq('status', 'active');
    if (locationError || alertError) {
      showToast('La ubicación se mostró aquí, pero aún no pudo sincronizarse con tu contacto.');
      return;
    }
    // Reflejar la escritura inmediatamente en el dispositivo propietario.
    void loadTrustedAlerts();
  };

  const requestDeviceLocation = () => {
    if (locationRequestInFlightRef.current) return;
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    locationRequestIdRef.current = requestId;
    locationRequestInFlightRef.current = true;
    setLocationStatus('FETCHING');
    setLocationErrorMessage(null);
    refreshBattery();

    if (window.AndroidBridge?.isGpsEnabled && !window.AndroidBridge.isGpsEnabled()) {
      locationRequestInFlightRef.current = false;
      setLocationStatus('UNAVAILABLE');
      setLocationErrorMessage('GPS_DISABLED');
      return;
    }

    if (window.AndroidBridge?.getRealLocation) {
      window.AndroidBridge.getRealLocation(requestId);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          locationRequestInFlightRef.current = false;
          const nextLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setRealLocation(nextLocation);
          setLocationStatus('AVAILABLE');
          void syncActiveEmergencyTelemetry(nextLocation);
        },
        (err) => {
          locationRequestInFlightRef.current = false;
          setLocationStatus('UNAVAILABLE');
          setLocationErrorMessage(err.message || 'No fue posible obtener coordenadas');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      locationRequestInFlightRef.current = false;
      setLocationStatus('UNAVAILABLE');
      setLocationErrorMessage('Geolocalización no soportada en este entorno');
    }
  };

  // Programar actualizaciones de ubicación periódicas y al entrar a la pestaña Ubicación
  useEffect(() => {
    let intervalId: any = null;
    if (activeTab === 'location' || isSosActive || isTripModeEnabled) {
      // Si el permiso no está concedido en Android, pedirlo automáticamente
      if (window.AndroidBridge?.checkPermissionsStatus) {
        try {
          const st = JSON.parse(window.AndroidBridge.checkPermissionsStatus());
          if (!st.location && window.AndroidBridge.requestAppPermissions) {
            window.AndroidBridge.requestAppPermissions();
          }
        } catch {
          // ignore
        }
      }
      requestDeviceLocation();
      intervalId = setInterval(requestDeviceLocation, 10000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab, isSosActive, isTripModeEnabled]);

  // ==========================================
  // REQUISITO 1: MÁQUINA DE ESTADOS SOS Y ACTIVACIÓN TRAS GESTO RESUELTO
  // ==========================================
  const handleEmergencyTriggered = async () => {
    if (isSosActive) return;

    // 1. Activar en la interfaz
    setIsSosActive(true);
    localStorage.setItem(STORAGE_KEY_SOS_ACTIVE, 'true');
    setCurrentScreen('home');
    setCharacterMood('ENOJADO');
    setCharacterSpeech('Alerta registrada');

    // 2. Iniciar servicio en segundo plano de Android
    window.AndroidBridge?.startEmergencyForegroundService();

    // 3. Registrar alerta en Supabase con coordenadas reales actuales
    if (currentUser?.id) {
      try {
        const { data: newAlert } = await supabase
          .from('emergency_alerts')
          .insert([
            {
              owner_user_id: currentUser.id,
              status: 'active',
              trigger_source: 'INSTANT_TAP',
              initial_latitude: realLocation?.latitude || null,
              initial_longitude: realLocation?.longitude || null,
              initial_accuracy: realLocation?.accuracy || null,
              last_latitude: realLocation?.latitude || null,
              last_longitude: realLocation?.longitude || null,
              last_battery_level: batteryState?.level || null,
              last_battery_charging: batteryState?.isCharging || false,
              is_in_vehicle: isTripModeEnabled,
            },
          ])
          .select()
          .maybeSingle();

        if (newAlert?.id) {
          setActiveEmergencyAlertId(newAlert.id);
          activeEmergencyAlertIdRef.current = newAlert.id;
          await supabase.from('emergency_locations').insert([{
            emergency_alert_id: newAlert.id,
            latitude: realLocation?.latitude,
            longitude: realLocation?.longitude,
            accuracy: realLocation?.accuracy,
            battery_level: batteryState?.level ?? null,
            is_charging: batteryState?.isCharging ?? false,
            is_in_vehicle: isTripModeEnabled,
            recorded_at: realLocation?.timestamp ? new Date(realLocation.timestamp).toISOString() : new Date().toISOString(),
          }]);
        }
      } catch {
        // Continuar en modo offline seguro
      }
    }

    if (contacts.length === 0) {
      showToast('Alerta registrada. (Nota: No tienes contactos de confianza configurados)');
    } else {
      showToast(`Alerta de auxilio compartida con tus ${contacts.length} contacto(s)`);
    }
  };

  // CANCELACIÓN DE LA EMERGENCIA: Arrastre al círculo con sincronización real en servidor
  const handlePerformCancelEmergency = async (): Promise<boolean> => {
    // 1. Intentar actualizar en Supabase si el usuario está online
    if (currentUser?.id) {
      try {
        const { error } = await supabase
          .from('emergency_alerts')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('owner_user_id', currentUser.id)
          .eq('status', 'active');

        if (error) {
          showToast(`Error al sincronizar con el servidor: ${error.message}`);
          return false; // No simular éxito si el servidor rechaza o falla
        }
      } catch (err: any) {
        showToast(`Fallo de conexión: ${err.message || 'No se pudo cancelar en la nube'}`);
        return false; // Mantener alerta activa
      }
    }

    // 2. Detener servicio en segundo plano nativo
    window.AndroidBridge?.stopEmergencyForegroundService();

    // 3. Actualizar estado local sólo tras éxito o modo offline verificado
    setIsSosActive(false);
    localStorage.removeItem(STORAGE_KEY_SOS_ACTIVE);
    setCharacterMood('TRANQUILO');
    setCharacterSpeech('Alerta cancelada');

    showToast('Alerta de emergencia finalizada correctamente.');
    setTimeout(() => {
      setCharacterMood(currentUser?.avatar_url || 'FELIZ');
      setCharacterSpeech('Estoy aquí para acompañarte');
    }, 3500);

    return true;
  };

  // ==========================================
  // REQUISITO 7: GESTIÓN DE SOLICITUDES MUTUAS DE CONTACTOS
  // ==========================================
  const handleSendContactRequest = async (phoneNormalized: string, name: string) => {
    if (!currentUser?.id) {
      return { success: false, message: 'Debes iniciar sesión.' };
    }

    if (phoneNormalized === currentUser.phone_normalized) {
      return { success: false, message: 'No puedes enviarte una solicitud a ti mismo.' };
    }

    try {
      // Buscar perfil por teléfono normalizado
      // La búsqueda directa en profiles está limitada por RLS. La RPC valida
      // el número en servidor sin exponer perfiles completos a otros usuarios.
      const { data: recipientProfile, error: lookupError } = await supabase.rpc('find_profile_by_phone', {
        p_phone_normalized: phoneNormalized,
      });

      if (lookupError) {
        return { success: false, message: 'No se pudo validar el número. Inténtalo de nuevo.' };
      }

      // PostgREST serializa RETURNS TABLE como un arreglo, incluso cuando la
      // consulta devuelve una sola coincidencia. Usar el arreglo directamente
      // dejaba recipient_user_id en null y disparaba la restricción NOT NULL.
      const recipient = Array.isArray(recipientProfile) ? recipientProfile[0] : recipientProfile;

      if (!recipient?.id) {
        return {
          success: false,
          message: 'El número aún no tiene una cuenta de Atent. Comparte la app para que se registre.',
        };
      }

      // Evitar duplicados
      const { error: reqError } = await supabase.from('trusted_contact_requests').insert([
        {
          sender_user_id: currentUser.id,
          recipient_user_id: recipient.id,
          status: 'pending',
        },
      ]);

      if (reqError) {
        if (reqError.message?.includes('duplicate') || reqError.message?.includes('unique')) {
          return { success: false, message: 'Ya existe una solicitud pendiente con este usuario.' };
        }
        return { success: false, message: reqError.message };
      }

      loadContactsAndRequests();
      return { success: true, message: `Solicitud enviada a ${name}. Debe aceptarla para ser contacto confiable.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error de conexión.' };
    }
  };

  const handleAcceptContactRequest = async (requestId: string) => {
    try {
      const { data: result, error } = await supabase.rpc('accept_contact_request', {
        request_id: requestId,
      });

      if (error) {
        showToast('Error al aceptar la solicitud.');
        return;
      }

      showToast('¡Contacto de auxilio confirmado mutuamente!');
      loadContactsAndRequests();
    } catch {
      showToast('Error de conexión.');
    }
  };

  const handleRejectContactRequest = async (requestId: string) => {
    try {
      await supabase
        .from('trusted_contact_requests')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      showToast('Solicitud rechazada.');
      loadContactsAndRequests();
    } catch {
      showToast('Error al rechazar solicitud.');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar contacto de auxilio',
      description: '¿Deseas revocar la relación de confianza? Ya no compartirán alertas de auxilio.',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        window.AndroidBridge?.stopTrustedAlertReceiver?.();
        try {
          await supabase.from('trusted_contacts').delete().eq('id', contactId);
          setContacts((prev) => prev.filter((c) => c.id !== contactId));
          setConfirmModal(null);
          showToast('Contacto eliminado.');
        } catch {
          setConfirmModal(null);
        }
      },
    });
  };

  const handleLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Cerrar sesión',
      description: '¿Deseas salir de tu cuenta de Atent en este dispositivo?',
      confirmText: 'Cerrar sesión',
      onConfirm: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        localStorage.removeItem(STORAGE_KEY_AUTH);
        setCurrentUser(null);
        setCurrentScreen('welcome');
        setConfirmModal(null);
        showToast('Sesión cerrada correctamente.');
      },
    });
  };

  const isAuthFlow =
    currentScreen === 'welcome' ||
    currentScreen === 'register' ||
    currentScreen === 'login' ||
    currentScreen === 'avatar_setup';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: '#09080D',
        color: '#F8F5F8',
        fontFamily: tokens.typography.fontFamily.base,
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '430px',
          minHeight: '100vh',
          backgroundColor: '#09080D',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Glow Superior Reactivo */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '220px',
            background: isSosActive
              ? 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(255, 48, 79, 0.5) 0%, rgba(9, 8, 13, 0) 100%)'
              : 'radial-gradient(ellipse 90% 60% at 50% -10%, rgba(245, 45, 131, 0.22) 0%, rgba(9, 8, 13, 0) 100%)',
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'background 0.3s ease',
          }}
        />

        {/* Dynamic Toast Feedback */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              left: '20px',
              right: '20px',
              maxWidth: '390px',
              margin: '0 auto',
              backgroundColor: '#1E1925',
              color: '#FF83B9',
              border: '1px solid #F52D83',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 999,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
            }}
          >
            <span>{toastMessage}</span>
            <VectorIcon name="check" size={14} color="#FF83B9" />
          </div>
        )}

        {/* CONTENIDO PRINCIPAL POR PANTALLA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, overflowY: 'auto' }}>

          {/* 1. AUTENTICACIÓN: BIENVENIDA, REGISTRO, LOGIN */}
          {(currentScreen === 'welcome' || currentScreen === 'register' || currentScreen === 'login') && (
            <AuthScreens
              mode={currentScreen}
              onNavigateToLogin={() => setCurrentScreen('login')}
              onNavigateToRegister={() => setCurrentScreen('register')}
              onAuthSuccess={(userProfile) => {
                localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(userProfile));
                setCurrentUser(userProfile);
                if (userProfile.isNew) {
                  setCurrentScreen('avatar_setup');
                } else {
                  const onboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED) === 'true';
                  const securitySetup = localStorage.getItem(STORAGE_KEY_SECURITY_SETUP) === 'true';
                  setCurrentScreen(onboarded && securitySetup ? 'home' : 'onboarding');
                }
                showToast(`Bienvenido, ${userProfile.display_name || userProfile.legal_name}`);
              }}
            />
          )}

          {/* 2. PRESENTACIÓN PERSONAL / AVATAR */}
          {currentScreen === 'avatar_setup' && (
            <AvatarSetupScreen
              initialDisplayName={currentUser?.display_name || currentUser?.legal_name || ''}
              initialAvatar={currentUser?.avatar_url || 'FELIZ'}
              userId={currentUser?.id || ''}
              onCompleted={(finalName, selectedAvatar) => {
                const updated = { ...currentUser, display_name: finalName, avatar_url: selectedAvatar };
                setCurrentUser(updated);
                localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updated));
                setCharacterMood(selectedAvatar);
                setCurrentScreen('onboarding');
              }}
            />
          )}

          {/* 3. PERMISOS DE ANDROID (ONBOARDING) */}
          {currentScreen === 'onboarding' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '36px 24px 28px 24px',
              }}
            >
              {onboardingStep === 'permissions' ? (
                <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <FullBodyCharacter mood={characterMood} height={155} speechText="¡Listo para protegerte!" />
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: 900, textAlign: 'center', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                  Permisos de Seguridad
                </h1>
                <p style={{ color: '#AAA4B0', fontSize: '13px', textAlign: 'center', margin: '0 0 24px 0', lineHeight: 1.45 }}>
                  Atent requiere estos accesos nativos en tu teléfono Android para actuar de inmediato:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ padding: '14px', backgroundColor: '#1E1925', borderRadius: '16px', border: '1px solid #2B2436', display: 'flex', gap: '12px' }}>
                    <VectorIcon name="map-pin" size={20} color="#FF83B9" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>Ubicación en tiempo real</div>
                      <div style={{ color: '#AAA4B0', fontSize: '12px', marginTop: '2px' }}>
                        Comparte tus coordenadas por satélite al activar el SOS.
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '14px', backgroundColor: '#1E1925', borderRadius: '16px', border: '1px solid #2B2436', display: 'flex', gap: '12px' }}>
                    <VectorIcon name="users" size={20} color="#FF83B9" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>Agenda de contactos</div>
                      <div style={{ color: '#AAA4B0', fontSize: '12px', marginTop: '2px' }}>
                        Importa personas de confianza con el selector nativo de tu teléfono.
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '14px', backgroundColor: '#2A1820', borderRadius: '16px', border: '1px solid #FF304F', display: 'flex', gap: '12px' }}>
                    <VectorIcon name="alert-triangle" size={20} color="#FF83B9" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>Alertas incluso con No molestar</div>
                      <div style={{ color: '#DDD6E3', fontSize: '12px', marginTop: '2px' }}>
                        Android abrirá sus ajustes para que concedas manualmente este acceso especial.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '28px' }}>
                <button
                  id="btn-onboarding-grant-permissions"
                  onClick={() => {
                    if (window.AndroidBridge?.requestAppPermissions) {
                      window.AndroidBridge.requestAppPermissions();
                    }
                    setOnboardingStep('permissions');
                    showToast('¡Configuración completada!');
                  }}
                  style={{
                    width: '100%',
                    padding: '16px',
                    backgroundColor: '#F52D83',
                    color: '#F8F5F8',
                    border: 'none',
                    borderRadius: '16px',
                    fontWeight: 800,
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 0 28px rgba(245, 45, 131, 0.45)',
                  }}
                >
                  Conceder permisos y continuar
                </button>
              </div>
                </>
              ) : (
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <FullBodyCharacter mood="TRANQUILO" height={145} speechText="Ya estás preparado" />
                  </div>
                  <h1 style={{ fontSize: '24px', fontWeight: 900, textAlign: 'center', margin: '0 0 8px 0' }}>
                    Cómo usar Atent
                  </h1>
                  <p style={{ color: '#AAA4B0', fontSize: '13px', textAlign: 'center', margin: '0 0 22px 0', lineHeight: 1.45 }}>
                    Tres pasos para que la ayuda llegue cuando la necesites.
                  </p>
                  {[
                    ['1', 'Configura tu red', 'Agrega y confirma tus contactos de confianza.'],
                    ['2', 'Activa el SOS', 'Mantén pulsado el botón hasta que la alerta quede registrada.'],
                    ['3', 'Finaliza con seguridad', 'Cuando estés a salvo, entra a Alertas o confirma que ya estás seguro.'],
                  ].map(([number, title, description]) => (
                    <div key={number} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px', marginBottom: '10px', backgroundColor: '#1E1925', border: '1px solid #2B2436', borderRadius: '16px' }}>
                      <span style={{ width: '28px', height: '28px', flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', backgroundColor: '#F52D83', color: '#FFF', fontWeight: 900 }}>{number}</span>
                      <div><div style={{ fontWeight: 800, fontSize: '14px' }}>{title}</div><div style={{ color: '#AAA4B0', fontSize: '12px', marginTop: '3px', lineHeight: 1.4 }}>{description}</div></div>
                    </div>
                  ))}
                  <button
                    id="btn-onboarding-finish-tutorial"
                    type="button"
                    onClick={() => {
                      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
                      localStorage.setItem(STORAGE_KEY_SECURITY_SETUP, 'true');
                      setCurrentScreen('home');
                      setActiveTab('home');
                      showToast('Configuración completada.');
                    }}
                    style={{ width: '100%', marginTop: '18px', padding: '16px', backgroundColor: '#F52D83', color: '#F8F5F8', border: 'none', borderRadius: '16px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}
                  >
                    Empezar a usar Atent
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. PANTALLA PRINCIPAL: INICIO (SOS + BOTÓN DE CANCELACIÓN + MODO VIAJE SWITCH) */}
          {currentScreen === 'home' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px 20px 16px 20px',
              }}
            >
              {/* Encabezado */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 900, fontSize: '22px', letterSpacing: '-0.4px', color: '#F8F5F8' }}>
                    Atent
                  </span>
                  <div style={{ fontSize: '11px', color: '#AAA4B0' }}>
                    Hola, {currentUser?.display_name || currentUser?.legal_name || 'Usuario'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {batteryState && batteryState.level >= 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#AAA4B0' }}>
                      <VectorIcon name="battery" size={14} color="#AAA4B0" />
                      <span>{batteryState.level}%</span>
                    </div>
                  )}
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: locationStatus === 'AVAILABLE' ? '#238636' : '#D29922',
                    }}
                  />
                </div>
              </div>

              {/* Personaje y Mensaje */}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                <FullBodyCharacter mood={characterMood} height={145} speechText={characterSpeech} />
              </div>

              {/* REQUISITO 1: SOS INMEDIATO + GESTO DE ARRASTRE TÁCTIL AL CÍRCULO SECUNDARIO SUPERIOR DERECHO */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  margin: '8px 0',
                }}
              >
                <SosDragCancelButton
                  isSosActive={isSosActive}
                  onEmergencyTriggered={handleEmergencyTriggered}
                  onCancelActiveEmergency={handlePerformCancelEmergency}
                  onGestureStateChange={(gState) => {
                    if (gState === 'PRESSING') {
                      setCharacterMood('ENOJADO');
                      requestDeviceLocation();
                    } else if (gState === 'CANCELLED') {
                      setCharacterMood('TRANQUILO');
                    } else if (gState === 'IDLE' && !isSosActive) {
                      setCharacterMood(currentUser?.avatar_url || 'FELIZ');
                    }
                  }}
                />
              </div>

              {/* BOTÓN "YA ESTOY SEGURO" CUANDO LA ALERTA ESTÁ ACTIVA (ARRIBA DEL MODO VIAJE) */}
              {isSosActive && (
                <div style={{ margin: '4px 0 8px 0' }}>
                  <button
                    id="btn-confirm-safe-cancel"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: '¿Finalizar emergencia?',
                        description: '¿Confirmas que ya estás en un lugar seguro y deseas desactivar la alerta para ti y tus contactos?',
                        confirmText: 'Sí, estoy seguro',
                        onConfirm: async () => {
                          setConfirmModal(null);
                          await handlePerformCancelEmergency();
                          showToast('Emergencia finalizada. Te encuentras a salvo.');
                        },
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#1E1925',
                      color: '#3FB950',
                      border: '2px solid #238636',
                      borderRadius: '16px',
                      fontWeight: 800,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 0 18px rgba(35, 134, 54, 0.35)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <VectorIcon name="check" size={18} color="#3FB950" />
                    <span>Ya estoy seguro — Finalizar alerta</span>
                  </button>
                </div>
              )}

              {/* REQUISITO 2: MODO VIAJE COMO SWITCH ÚNICO (Sin formularios ni inputs adicionales) */}
              <TripModeSwitch
                isEnabled={isTripModeEnabled}
                onToggle={handleToggleTripMode}
                hasLocationPermission={permissionsState.location || locationStatus === 'AVAILABLE'}
                onRequestPermissions={() => {
                  if (window.AndroidBridge?.requestAppPermissions) {
                    window.AndroidBridge.requestAppPermissions();
                  } else {
                    requestDeviceLocation();
                  }
                }}
              />
            </div>
          )}

          {/* 5. PANTALLA: UBICACIÓN (REQUISITO 3: GOOGLE MAPS REAL CON PUNTO ROJO CENTRADO) */}
          {currentScreen === 'location' && (
            <GoogleMapView
              latitude={realLocation?.latitude || null}
              longitude={realLocation?.longitude || null}
              accuracy={realLocation?.accuracy || null}
              timestamp={realLocation?.timestamp || null}
              locationStatus={locationStatus}
              errorMessage={locationErrorMessage}
              onRefreshLocation={requestDeviceLocation}
            />
          )}

          {/* 6. PANTALLA: CONTACTOS (REQUISITO 7: SOLICITUDES Y CONFIRMACIÓN MUTUA) */}
          {currentScreen === 'contacts' && (
            <ContactsScreen
              contacts={contacts}
              receivedRequests={receivedRequests}
              sentRequests={sentRequests}
              currentUserId={currentUser?.id || ''}
              onSendRequest={handleSendContactRequest}
              onAcceptRequest={handleAcceptContactRequest}
              onRejectRequest={handleRejectContactRequest}
              onDeleteContact={handleDeleteContact}
              onOpenNativePicker={() => {
                if (window.AndroidBridge?.pickPhoneContact) {
                  window.AndroidBridge.pickPhoneContact();
                } else {
                  showToast('El selector nativo está disponible en Android');
                }
              }}
              pickedContact={pickedContact}
              onPickedContactApplied={() => setPickedContact(null)}
              showToast={showToast}
            />
          )}

          {/* 7. PANTALLA: ALERTAS Y PANEL DE EMERGENCIAS */}
          {currentScreen === 'alerts' && (
            <AlertsPanel
              alerts={alerts}
              onSelectAlert={(alert) => setSelectedAlertForDetail(alert)}
              onRefresh={() => { void refreshTrustedAlerts(); }}
              isRefreshing={isRefreshingAlerts}
            />
          )}

          {/* 8. PANTALLA: AJUSTES (REQUISITOS 4 y 5: SIN PANTALLA NEGRA + CUENTA Y CAMBIO DE CONTRASEÑA) */}
          {currentScreen === 'settings' && (
            <SettingsScreen
              currentUser={currentUser}
              onOpenAvatarSetup={() => setCurrentScreen('avatar_setup')}
              onOpenTutorial={() => setShowTutorial(true)}
              onCheckForUpdates={() => {
                if (availableUpdate) setShowUpdateModal(true);
                else void checkAppUpdate(true);
              }}
              updateVersion={availableUpdate?.version ?? null}
              onLogout={handleLogout}
              onUpdateDisplayName={(newName) => {
                const updated = { ...currentUser, display_name: newName };
                setCurrentUser(updated);
                localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updated));
              }}
              showToast={showToast}
            />
          )}

        </div>

        {/* BARRA DE NAVEGACIÓN INFERIOR (5 PESTAÑAS) */}
        {!isAuthFlow && (
          <nav
            style={{
              height: '62px',
              backgroundColor: '#09080D',
              borderTop: '1px solid #201A29',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 4px',
              zIndex: 10,
            }}
          >
            {(
              [
                ['home', 'Inicio', 'shield'],
                ['location', 'Ubicación', 'map-pin'],
                ['contacts', 'Contactos', 'users'],
                ['alerts', 'Alertas', 'alert-triangle'],
                ['settings', 'Ajustes', 'settings'],
              ] as const
            ).map(([tab, label, iconName]) => {
              const isTabActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  id={`tab-btn-${tab}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentScreen(tab);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px',
                    cursor: 'pointer',
                    padding: '6px 8px',
                    color: isTabActive ? '#FF83B9' : '#706877',
                    transition: 'color 0.15s ease',
                  }}
                >
                  <VectorIcon name={iconName} size={18} color={isTabActive ? '#FF83B9' : '#706877'} />
                  <span style={{ fontSize: '10px', fontWeight: 700 }}>{label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* MODAL: DETALLE DE ALERTA */}
        <AlertDetailModal
          alert={selectedAlertForDetail}
          onClose={() => setSelectedAlertForDetail(null)}
        />

        {showUpdateModal && availableUpdate && (
          <div role="dialog" aria-modal="true" aria-labelledby="atent-update-title" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(9, 8, 13, 0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 360 }}>
            <div style={{ width: '100%', maxWidth: '380px', backgroundColor: '#1E1925', border: '1px solid #FF83B9', borderRadius: '22px', padding: '22px', boxShadow: '0 18px 50px rgba(0,0,0,.45)' }}>
              <div style={{ color: '#FF83B9', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>NUEVA VERSIÓN</div>
              <h3 id="atent-update-title" style={{ margin: '6px 0 8px', fontSize: 21 }}>{availableUpdate.title}</h3>
              <p style={{ color: '#AAA4B0', fontSize: 13, lineHeight: 1.45, margin: '0 0 16px' }}>Ya puedes actualizar Atent a la versión {availableUpdate.version}. La descarga se realizará desde el servidor de Atent y Android te pedirá confirmar la instalación.</p>
              {availableUpdate.notes && <p style={{ color: '#DDD6E3', fontSize: 12, lineHeight: 1.4, margin: '0 0 18px', whiteSpace: 'pre-line' }}>{availableUpdate.notes.slice(0, 500)}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowUpdateModal(false)} style={{ flex: 1, padding: 12, backgroundColor: '#151219', color: '#AAA4B0', border: '1px solid #2B2436', borderRadius: 11, fontWeight: 700, cursor: 'pointer' }}>Más tarde</button>
                <button type="button" onClick={openUpdateDownload} style={{ flex: 1, padding: 12, backgroundColor: '#F52D83', color: '#FFF', border: 0, borderRadius: 11, fontWeight: 800, cursor: 'pointer' }}>Descargar APK</button>
              </div>
            </div>
          </div>
        )}

        {showTutorial && (
          <div role="dialog" aria-modal="true" aria-labelledby="atent-tutorial-title" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(9, 8, 13, 0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 350 }}>
            <div style={{ width: '100%', maxWidth: '380px', maxHeight: '80vh', overflowY: 'auto', backgroundColor: '#1E1925', border: '1px solid #382F45', borderRadius: '22px', padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div><div style={{ color: '#FF83B9', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>GUÍA RÁPIDA</div><h3 id="atent-tutorial-title" style={{ margin: '5px 0 0', fontSize: 20 }}>Cómo usar Atent</h3></div>
                <button type="button" aria-label="Cerrar guía" onClick={() => setShowTutorial(false)} style={{ background: 'none', border: 0, color: '#AAA4B0', fontSize: 24, cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ color: '#AAA4B0', fontSize: 13, lineHeight: 1.45, margin: '12px 0 16px' }}>Una guía breve para saber qué ocurre en cada momento.</p>
              {[
                ['01', 'Configura tu red', 'Agrega y confirma contactos de confianza para que puedan recibir tus alertas.'],
                ['02', 'Activa el SOS', 'Mantén pulsado el botón de emergencia durante 3 segundos para evitar toques accidentales.'],
                ['03', 'Revisa tu ubicación', 'En Ubicación puedes ver el mapa y actualizar la lectura GPS manualmente o cada 10 segundos.'],
                ['04', 'Cierra la alerta', 'Cuando estés a salvo, abre Alertas y confirma la finalización para detener el seguimiento.'],
              ].map(([step, title, description]) => (
                <div key={step} style={{ display: 'flex', gap: 12, padding: '13px 0', borderTop: '1px solid #2B2436' }}><span style={{ color: '#FF83B9', fontWeight: 900, fontSize: 12, minWidth: 24 }}>{step}</span><div><div style={{ fontWeight: 800, fontSize: 14 }}>{title}</div><div style={{ color: '#AAA4B0', fontSize: 12, lineHeight: 1.4, marginTop: 3 }}>{description}</div></div></div>
              ))}
              <button type="button" onClick={() => setShowTutorial(false)} style={{ width: '100%', marginTop: 12, padding: 13, backgroundColor: '#F52D83', color: '#FFF', border: 0, borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>Entendido</button>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN */}
        {confirmModal && confirmModal.isOpen && (
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
              zIndex: 400,
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '360px',
                backgroundColor: '#1E1925',
                borderRadius: '20px',
                border: '1px solid #382F45',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800 }}>{confirmModal.title}</h3>
              <p style={{ color: '#AAA4B0', fontSize: '13px', margin: '0 0 20px 0', lineHeight: 1.4 }}>
                {confirmModal.description}
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setConfirmModal(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#151219',
                    color: '#AAA4B0',
                    border: '1px solid #2B2436',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Regresar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#FF304F',
                    color: '#F8F5F8',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
