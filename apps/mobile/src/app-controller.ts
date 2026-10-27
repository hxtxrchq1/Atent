import type { AlertTriggerSource, GeoPoint, EmergencyContact } from '@atent/types';
import { AndroidLocationService } from './location.js';
import { OfflineTelemetrySyncManager, InMemoryStorageAdapter } from './offline-sync.js';
import { BleButtonManager, MockBleAdapter } from './ble-button.js';

export type MobileScreen =
  | 'ONBOARDING'
  | 'AUTH'
  | 'HOME'
  | 'CONTACTS'
  | 'EMERGENCY_COUNTDOWN'
  | 'EMERGENCY_ACTIVE'
  | 'TRIP_MODE';

export interface MobileAppState {
  currentScreen: MobileScreen;
  isAuthenticated: boolean;
  userToken: string | null;
  activeAlertId: string | null;
  lastKnownLocation: GeoPoint | null;
  isForegroundServiceActive: boolean;
  isOnline: boolean;
  contacts: EmergencyContact[];
}

export class AtentMobileAppController {
  private state: MobileAppState = {
    currentScreen: 'ONBOARDING',
    isAuthenticated: false,
    userToken: null,
    activeAlertId: null,
    lastKnownLocation: null,
    isForegroundServiceActive: false,
    isOnline: true,
    contacts: [],
  };

  private locationService: AndroidLocationService;
  private offlineSync: OfflineTelemetrySyncManager;
  private bleManager: BleButtonManager;
  private locationStopWatch?: () => void;

  constructor(
    private readonly apiBaseUrl = 'http://localhost:3000',
    options: {
      locationService?: AndroidLocationService;
      offlineSync?: OfflineTelemetrySyncManager;
      bleManager?: BleButtonManager;
    } = {}
  ) {
    this.locationService = options.locationService || new AndroidLocationService();
    this.offlineSync =
      options.offlineSync ||
      new OfflineTelemetrySyncManager(new InMemoryStorageAdapter());

    this.bleManager =
      options.bleManager ||
      new BleButtonManager(new MockBleAdapter(), {
        onEmergencyTrigger: (source) => {
          this.triggerEmergency(source);
        },
      });
  }

  getBleManager(): BleButtonManager {
    return this.bleManager;
  }

  getState(): MobileAppState {
    return { ...this.state };
  }

  navigateTo(screen: MobileScreen): void {
    this.state.currentScreen = screen;
  }

  async login(token: string): Promise<void> {
    this.state.userToken = token;
    this.state.isAuthenticated = true;
    this.state.currentScreen = 'HOME';
  }

  logout(): void {
    this.state.userToken = null;
    this.state.isAuthenticated = false;
    this.state.currentScreen = 'AUTH';
  }

  setContacts(contacts: EmergencyContact[]): void {
    this.state.contacts = [...contacts];
  }

  async triggerEmergency(source: AlertTriggerSource = 'MANUAL_BUTTON'): Promise<string> {
    this.state.currentScreen = 'EMERGENCY_ACTIVE';
    this.state.isForegroundServiceActive = true;

    // 1. Get current coordinate with fallback
    let coords: GeoPoint | null = null;
    try {
      coords = await this.locationService.getCurrentPosition();
      this.state.lastKnownLocation = coords;
    } catch {
      // Allow emergency trigger to proceed with null coords
    }

    // 2. Call API initiate emergency endpoint
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/emergency/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current_user',
          triggerSource: source,
          initialCoordinates: coords,
          userFullName: 'Usuario Móvil Atent',
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { alert: { id: string } };
        this.state.activeAlertId = data.alert.id;
      } else {
        this.state.activeAlertId = `local_alt_${Date.now()}`;
      }
    } catch {
      this.state.activeAlertId = `local_offline_alt_${Date.now()}`;
    }

    const currentAlertId = this.state.activeAlertId || `alt_fallback_${Date.now()}`;
    this.state.activeAlertId = currentAlertId;

    // 3. Start continuous location stream
    this.locationStopWatch = this.locationService.startWatchingPosition(
      async (loc) => {
        this.state.lastKnownLocation = loc;
        if (this.state.isOnline && this.state.activeAlertId) {
          try {
            await fetch(`${this.apiBaseUrl}/api/emergency/telemetry`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                alertId: this.state.activeAlertId,
                userId: 'current_user',
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: loc.accuracy,
              }),
            });
          } catch {
            await this.offlineSync.enqueue(currentAlertId, 'emergency', {
              latitude: loc.latitude,
              longitude: loc.longitude,
              accuracy: loc.accuracy ?? 10,
              timestamp: loc.timestamp ?? Date.now(),
            });
          }
        } else {
          await this.offlineSync.enqueue(currentAlertId, 'emergency', {
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy ?? 10,
            timestamp: loc.timestamp ?? Date.now(),
          });
        }
      },
      () => {},
      { intervalMs: 3000 }
    );

    return currentAlertId;
  }

  async resolveEmergency(reason = 'USER_SAFE'): Promise<void> {
    if (this.locationStopWatch) {
      this.locationStopWatch();
      this.locationStopWatch = undefined;
    }

    if (this.state.activeAlertId) {
      try {
        await fetch(`${this.apiBaseUrl}/api/emergency/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alertId: this.state.activeAlertId,
            userId: 'current_user',
            reason,
          }),
        });
      } catch {
        // Handle network error
      }
    }

    this.state.activeAlertId = null;
    this.state.isForegroundServiceActive = false;
    this.state.currentScreen = 'HOME';
  }
}
