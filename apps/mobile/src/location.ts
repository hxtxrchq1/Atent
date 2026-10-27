import type { GeoPoint } from '@atent/types';

export type LocationPermissionStatus = 'GRANTED' | 'DENIED' | 'PROMPT' | 'RESTRICTED';

export interface LocationWatchOptions {
  enableHighAccuracy?: boolean;
  distanceFilterMeters?: number;
  intervalMs?: number;
}

export interface ILocationService {
  requestForegroundPermission(): Promise<LocationPermissionStatus>;
  requestBackgroundPermission(): Promise<LocationPermissionStatus>;
  getCurrentPosition(): Promise<GeoPoint>;
  startWatchingPosition(
    onLocation: (location: GeoPoint) => void,
    onError: (error: Error) => void,
    options?: LocationWatchOptions
  ): () => void;
  isGpsProviderEnabled(): Promise<boolean>;
}

export class AndroidLocationService implements ILocationService {
  private permission: LocationPermissionStatus = 'PROMPT';
  private backgroundPermission: LocationPermissionStatus = 'PROMPT';
  private gpsEnabled = true;

  constructor(
    private nativeGeoProvider?: {
      requestPermissions: () => Promise<'granted' | 'denied'>;
      getCurrentLocation: () => Promise<{ latitude: number; longitude: number; accuracy: number }>;
      watchLocation: (cb: (loc: any) => void) => () => void;
    }
  ) {}

  async requestForegroundPermission(): Promise<LocationPermissionStatus> {
    if (this.nativeGeoProvider) {
      const res = await this.nativeGeoProvider.requestPermissions();
      this.permission = res === 'granted' ? 'GRANTED' : 'DENIED';
      return this.permission;
    }
    this.permission = 'GRANTED';
    return this.permission;
  }

  async requestBackgroundPermission(): Promise<LocationPermissionStatus> {
    if (this.permission !== 'GRANTED') {
      this.backgroundPermission = 'DENIED';
      return 'DENIED';
    }
    this.backgroundPermission = 'GRANTED';
    return this.backgroundPermission;
  }

  async isGpsProviderEnabled(): Promise<boolean> {
    return this.gpsEnabled;
  }

  setGpsProviderEnabled(enabled: boolean): void {
    this.gpsEnabled = enabled;
  }

  async getCurrentPosition(): Promise<GeoPoint> {
    if (this.permission !== 'GRANTED') {
      throw new Error('PERMISSION_DENIED: Location permission not granted by user');
    }
    if (!this.gpsEnabled) {
      throw new Error('GPS_DISABLED: Device GNSS/Location hardware is turned off');
    }

    if (this.nativeGeoProvider) {
      const loc = await this.nativeGeoProvider.getCurrentLocation();
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        timestamp: Date.now(),
      };
    }

    // Default reference coordinates (Lima, Perú: Plaza Mayor)
    return {
      latitude: -12.046374,
      longitude: -77.042793,
      accuracy: 8.5,
      timestamp: Date.now(),
    };
  }

  startWatchingPosition(
    onLocation: (location: GeoPoint) => void,
    onError: (error: Error) => void,
    options: LocationWatchOptions = {}
  ): () => void {
    if (this.permission !== 'GRANTED') {
      onError(new Error('PERMISSION_DENIED: Location permission must be granted before watching'));
      return () => {};
    }

    if (this.nativeGeoProvider) {
      return this.nativeGeoProvider.watchLocation((loc) => {
        onLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy,
          timestamp: Date.now(),
        });
      });
    }

    const interval = options.intervalMs || 5000;
    const timer = setInterval(async () => {
      try {
        const pt = await this.getCurrentPosition();
        onLocation(pt);
      } catch (err: any) {
        onError(err);
      }
    }, interval);

    return () => clearInterval(timer);
  }
}
