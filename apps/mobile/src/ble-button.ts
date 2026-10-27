/**
 * ATENT BLE Emergency Hardware Button Integration
 *
 * Implements the BLE adapter interface and BleButtonManager for pairing and
 * receiving events from a hardware Bluetooth LE emergency button accessory.
 *
 * IMPORTANT CAVEATS (Rule 8 — Honestidad Técnica):
 * - This module defines contracts and a MockBleAdapter for automated testing.
 * - Real BLE scanning requires a native Android/iOS module (e.g., react-native-ble-plx).
 * - Background BLE connection on Android ≥ 12 requires BLUETOOTH_SCAN + BLUETOOTH_CONNECT
 *   runtime permissions, and is subject to Doze Mode restrictions.
 * - Accidental BLE disconnection MUST NOT trigger false alarms (see handleConnectionChange).
 */

export interface BleDeviceAdvertisement {
  id: string;
  name: string;
  rssi: number;
  serviceUuids: string[];
}

export type BleConnectionState =
  | 'DISCONNECTED'
  | 'SCANNING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTING';

export interface BleButtonPressEvent {
  deviceId: string;
  pressType: 'SINGLE' | 'DOUBLE' | 'LONG_PRESS';
  batteryLevel?: number;
  timestamp: number;
}

export interface BleScanOptions {
  timeoutMs?: number;
  serviceUuidFilter?: string[];
}

export interface BleAdapter {
  isAvailable(): Promise<boolean>;
  startScan(options?: BleScanOptions): Promise<void>;
  stopScan(): Promise<void>;
  connect(deviceId: string): Promise<boolean>;
  disconnect(deviceId: string): Promise<void>;
  getConnectionState(deviceId: string): BleConnectionState;
  onButtonPress(listener: (event: BleButtonPressEvent) => void): () => void;
  onConnectionChange(listener: (deviceId: string, state: BleConnectionState) => void): () => void;
}

/**
 * ATENT Standard Emergency Button GATT Service Definitions
 * Follows 128-bit standard UUID pattern for custom Bluetooth LE peripherals
 */
export const ATENT_BLE_CONSTANTS = {
  SERVICE_UUID: '0000fe50-0000-1000-8000-00805f9b34fb',
  CHAR_TRIGGER_UUID: '0000fe51-0000-1000-8000-00805f9b34fb',
  CHAR_BATTERY_UUID: '00002a19-0000-1000-8000-00805f9b34fb',
  CHAR_STATUS_UUID: '0000fe52-0000-1000-8000-00805f9b34fb',
};

export class BleButtonManager {
  private buttonPressListeners: Array<(e: BleButtonPressEvent) => void> = [];
  private connectionChangeListeners: Array<(deviceId: string, state: BleConnectionState) => void> = [];
  private connectedDeviceId: string | null = null;
  private connectionState: BleConnectionState = 'DISCONNECTED';
  private triggerEmergencyCallback?: (source: 'HARDWARE_KEY', event: BleButtonPressEvent) => void;

  constructor(
    private readonly adapter: BleAdapter,
    options: {
      onEmergencyTrigger?: (source: 'HARDWARE_KEY', event: BleButtonPressEvent) => void;
    } = {}
  ) {
    this.triggerEmergencyCallback = options.onEmergencyTrigger;
    // Listen to adapter events
    this.adapter.onButtonPress((event) => this.handleButtonPress(event));
    this.adapter.onConnectionChange((deviceId, state) => this.handleConnectionChange(deviceId, state));
  }

  async initialize(): Promise<boolean> {
    return this.adapter.isAvailable();
  }

  async connectButton(deviceId: string): Promise<boolean> {
    this.connectionState = 'CONNECTING';
    const success = await this.adapter.connect(deviceId);
    if (success) {
      this.connectedDeviceId = deviceId;
      this.connectionState = 'CONNECTED';
    } else {
      this.connectionState = 'DISCONNECTED';
      this.connectedDeviceId = null;
    }
    return success;
  }

  async disconnectButton(): Promise<void> {
    if (this.connectedDeviceId) {
      this.connectionState = 'DISCONNECTING';
      await this.adapter.disconnect(this.connectedDeviceId);
      this.connectedDeviceId = null;
      this.connectionState = 'DISCONNECTED';
    }
  }

  getConnectedDeviceId(): string | null {
    return this.connectedDeviceId;
  }

  getConnectionState(): BleConnectionState {
    return this.connectionState;
  }

  private handleButtonPress(event: BleButtonPressEvent): void {
    // Only accept events from the verified paired device
    if (this.connectedDeviceId && event.deviceId !== this.connectedDeviceId) {
      return;
    }
    // Rule: Double click or Long press triggers SOS; single click can be keep-alive or ping
    if (event.pressType === 'DOUBLE' || event.pressType === 'LONG_PRESS') {
      if (this.triggerEmergencyCallback) {
        this.triggerEmergencyCallback('HARDWARE_KEY', event);
      }
    }
    for (const listener of this.buttonPressListeners) {
      listener(event);
    }
  }

  private handleConnectionChange(deviceId: string, state: BleConnectionState): void {
    if (deviceId === this.connectedDeviceId) {
      this.connectionState = state;
      if (state === 'DISCONNECTED') {
        // Critical Safety Rule: Accidental BLE disconnection MUST NOT trigger false alarms.
        // It should silently update state and notify UI without firing SOS.
        this.connectedDeviceId = null;
      }
    }
    for (const listener of this.connectionChangeListeners) {
      listener(deviceId, state);
    }
  }
}

/**
 * MockBleAdapter for deterministic local test verification and simulation
 */
export class MockBleAdapter implements BleAdapter {
  private available = true;
  private scanning = false;
  private connections = new Map<string, BleConnectionState>();
  private buttonListeners: Array<(e: BleButtonPressEvent) => void> = [];
  private stateListeners: Array<(deviceId: string, state: BleConnectionState) => void> = [];

  setAvailable(available: boolean): void {
    this.available = available;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  isScanning(): boolean {
    return this.scanning;
  }

  async startScan(): Promise<void> {
    this.scanning = true;
  }

  async stopScan(): Promise<void> {
    this.scanning = false;
  }

  async connect(deviceId: string): Promise<boolean> {
    if (!this.available) return false;
    this.connections.set(deviceId, 'CONNECTED');
    this.notifyState(deviceId, 'CONNECTED');
    return true;
  }

  async disconnect(deviceId: string): Promise<void> {
    this.connections.set(deviceId, 'DISCONNECTED');
    this.notifyState(deviceId, 'DISCONNECTED');
  }

  getConnectionState(deviceId: string): BleConnectionState {
    return this.connections.get(deviceId) ?? 'DISCONNECTED';
  }

  onButtonPress(listener: (event: BleButtonPressEvent) => void): () => void {
    this.buttonListeners.push(listener);
    return () => {
      this.buttonListeners = this.buttonListeners.filter((l) => l !== listener);
    };
  }

  onConnectionChange(listener: (deviceId: string, state: BleConnectionState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  // Simulation test helpers
  simulateButtonPress(event: BleButtonPressEvent): void {
    for (const l of this.buttonListeners) {
      l(event);
    }
  }

  simulateDisconnect(deviceId: string): void {
    this.connections.set(deviceId, 'DISCONNECTED');
    this.notifyState(deviceId, 'DISCONNECTED');
  }

  private notifyState(deviceId: string, state: BleConnectionState): void {
    for (const l of this.stateListeners) {
      l(deviceId, state);
    }
  }
}
