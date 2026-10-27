import { AlertStatus, AlertTriggerSource } from '@atent/types';
import { isValidGeoPoint } from '@atent/validation';

export interface MobileTelemetryState {
  currentStatus: AlertStatus;
  triggerSource: AlertTriggerSource | null;
  batteryLevel: number;
  lastKnownCoordinates: {
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null;
  foregroundServiceActive: boolean;
}

export class MobileAlertController {
  private state: MobileTelemetryState = {
    currentStatus: 'PENDING',
    triggerSource: null,
    batteryLevel: 100,
    lastKnownCoordinates: null,
    foregroundServiceActive: false,
  };

  public triggerEmergency(source: AlertTriggerSource): void {
    this.state.currentStatus = 'ACTIVE';
    this.state.triggerSource = source;
    this.state.foregroundServiceActive = true;
  }

  public resolveEmergency(): void {
    this.state.currentStatus = 'RESOLVED';
    this.state.foregroundServiceActive = false;
  }

  public updateCoordinates(lat: number, lng: number): boolean {
    const point = { latitude: lat, longitude: lng, timestamp: Date.now() };
    if (!isValidGeoPoint(point)) {
      return false;
    }
    this.state.lastKnownCoordinates = point;
    return true;
  }

  public getState(): MobileTelemetryState {
    return { ...this.state };
  }
}

export * from './offline-sync.js';
