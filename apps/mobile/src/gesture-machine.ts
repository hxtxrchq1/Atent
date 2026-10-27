export type GestureState =
  | 'IDLE'
  | 'PREPARING'
  | 'CANCELLING'
  | 'ACTIVATING'
  | 'ACTIVE'
  | 'ERROR_OFFLINE';

export interface GestureCoordinates {
  x: number;
  y: number;
}

export interface EmergencyGestureConfig {
  cancelZoneThresholdY: number;
  cancelZoneTargetX: number; // e.g. +110px to top right
  cancelZoneTargetY: number; // e.g. -190px towards top right
  cancelZoneRadius: number;  // e.g. 50px radius
  requiredHoldDurationMs: number;
  cancelGracePeriodMs: number;
}

export class EmergencyGestureMachine {
  private state: GestureState = 'IDLE';
  private startTimestamp: number = 0;
  private cancelHovered: boolean = false;
  private distanceToCancel: number = 999;
  private readonly config: EmergencyGestureConfig;
  private isProcessingActivation: boolean = false;

  constructor(
    config: Partial<EmergencyGestureConfig> = {},
    private readonly onStateChange?: (state: GestureState) => void
  ) {
    this.config = {
      cancelZoneThresholdY: config.cancelZoneThresholdY ?? -90,
      cancelZoneTargetX: config.cancelZoneTargetX ?? 110,
      cancelZoneTargetY: config.cancelZoneTargetY ?? -190,
      cancelZoneRadius: config.cancelZoneRadius ?? 55,
      requiredHoldDurationMs: config.requiredHoldDurationMs ?? 3000,
      cancelGracePeriodMs: config.cancelGracePeriodMs ?? 5000,
    };
  }

  public getHoldDurationMs(now = Date.now()): number {
    if (this.state !== 'PREPARING' && this.state !== 'CANCELLING') {
      return 0;
    }
    return Math.max(0, now - this.startTimestamp);
  }

  public getState(): GestureState {
    return this.state;
  }

  public isCancelZoneHovered(): boolean {
    return this.cancelHovered;
  }

  public getDistanceToCancel(): number {
    return this.distanceToCancel;
  }

  /**
   * Called when user touches/clicks and holds the SOS circle
   */
  public handlePressIn(now = Date.now()): void {
    if (this.state === 'ACTIVE' || this.isProcessingActivation) {
      return;
    }
    this.startTimestamp = now;
    this.cancelHovered = false;
    this.distanceToCancel = 999;
    this.transitionTo('PREPARING');
  }

  /**
   * Called when user drags/moves finger
   * Supports both 1D (deltaY) and 2D spatial coordinates (deltaX, deltaY)
   */
  public handleMove(deltaY: number, deltaX: number = 0): void {
    if (this.state !== 'PREPARING' && this.state !== 'CANCELLING') {
      return;
    }

    // Euclidean distance to circular top-right cancel target
    const dx = deltaX - this.config.cancelZoneTargetX;
    const dy = deltaY - this.config.cancelZoneTargetY;
    const distance = Math.hypot(dx, dy);
    this.distanceToCancel = distance;

    // Inside circular cancel zone OR legacy 1D threshold exceeded
    const isInsideCircle = distance <= this.config.cancelZoneRadius;
    const isPastThresholdY = deltaY <= this.config.cancelZoneThresholdY;

    if (isInsideCircle || isPastThresholdY) {
      this.cancelHovered = true;
      if (this.state !== 'CANCELLING') {
        this.transitionTo('CANCELLING');
      }
    } else {
      this.cancelHovered = false;
      if (this.state === 'CANCELLING') {
        this.transitionTo('PREPARING');
      }
    }
  }

  /**
   * Called when user releases finger (touchend / mouseup)
   * Returns 'CANCELLED' if released inside cancel zone,
   * 'ACTIVATED' if released normally outside cancel zone to request emergency,
   * 'IGNORED' if already active or invalid.
   */
  public handlePressOut(): 'CANCELLED' | 'ACTIVATED' | 'IGNORED' {
    if (this.state === 'CANCELLING' || this.cancelHovered) {
      this.cancelHovered = false;
      this.transitionTo('IDLE');
      return 'CANCELLED';
    }

    if (this.state === 'PREPARING') {
      // Guard against double activation
      if (this.isProcessingActivation) {
        return 'IGNORED';
      }
      this.isProcessingActivation = true;
      this.transitionTo('ACTIVATING');
      return 'ACTIVATED';
    }

    return 'IGNORED';
  }

  /**
   * System interruption (call incoming, screen lock, modal pop)
   */
  public handleSystemInterrupt(): void {
    if (this.state === 'PREPARING' || this.state === 'CANCELLING') {
      this.cancelHovered = false;
      this.transitionTo('IDLE');
    }
  }

  /**
   * Backend confirms activation
   */
  public confirmActive(): void {
    this.isProcessingActivation = false;
    this.transitionTo('ACTIVE');
  }

  /**
   * Backend rejects or offline error
   */
  public setOfflineOrError(): void {
    this.isProcessingActivation = false;
    this.transitionTo('ERROR_OFFLINE');
  }

  /**
   * Reset / resolve back to IDLE
   */
  public reset(): void {
    this.isProcessingActivation = false;
    this.cancelHovered = false;
    this.transitionTo('IDLE');
  }

  private transitionTo(newState: GestureState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }
}
