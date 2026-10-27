import crypto from 'node:crypto';
import type { GeoPoint } from '@atent/types';
import { isValidGeoPoint } from '@atent/validation';

export type TripStatus =
  | 'INITIALIZED'
  | 'IN_TRANSIT'
  | 'CHECKIN_PENDING'
  | 'COMPLETED_SAFE'
  | 'OVERDUE_ALERT'
  | 'CANCELLED';

export interface StartTripDto {
  userId: string;
  destinationName: string;
  expectedDurationMinutes: number;
  initialLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  checkinIntervalMinutes?: number;
  userFullName?: string;
}

export interface TripSession {
  id: string;
  userId: string;
  status: TripStatus;
  destinationName: string;
  expectedDurationMinutes: number;
  startedAt: string;
  expectedArrivalTime: string;
  completedAt?: string | null;
  lastCheckinTime?: string | null;
  nextCheckinDeadline?: string | null;
  trackingToken: string; // Live Trip Safety Link token
  batteryLevel?: number;
}

export interface TripDomainAggregate {
  trip: TripSession;
  routeHistory: GeoPoint[];
  liveTrackingLink: string;
}

export class TripDomainService {
  private trips = new Map<string, TripSession>();
  private tripToToken = new Map<string, string>(); // token -> tripId
  private tripRouteHistory = new Map<string, GeoPoint[]>();

  constructor() {}

  public startTrip(dto: StartTripDto): TripDomainAggregate {
    const tripId = `trip_${crypto.randomUUID()}`;
    const token = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const durationMs = dto.expectedDurationMinutes * 60 * 1000;
    const expectedArrivalTime = new Date(now.getTime() + durationMs).toISOString();

    const intervalMinutes = dto.checkinIntervalMinutes ?? 15;
    const nextCheckin = new Date(now.getTime() + intervalMinutes * 60 * 1000).toISOString();

    const trip: TripSession = {
      id: tripId,
      userId: dto.userId,
      status: 'IN_TRANSIT',
      destinationName: dto.destinationName,
      expectedDurationMinutes: dto.expectedDurationMinutes,
      startedAt: now.toISOString(),
      expectedArrivalTime,
      completedAt: null,
      lastCheckinTime: now.toISOString(),
      nextCheckinDeadline: nextCheckin,
      trackingToken: token,
      batteryLevel: 100,
    };

    const initialRoute: GeoPoint[] = [];
    if (dto.initialLocation) {
      const pt: GeoPoint = {
        latitude: dto.initialLocation.latitude,
        longitude: dto.initialLocation.longitude,
        accuracy: dto.initialLocation.accuracy ?? 10,
        timestamp: now.getTime(),
      };
      if (isValidGeoPoint(pt)) {
        initialRoute.push(pt);
      }
    }

    this.trips.set(tripId, trip);
    this.tripToToken.set(token, tripId);
    this.tripRouteHistory.set(tripId, initialRoute);

    return {
      trip,
      routeHistory: initialRoute,
      liveTrackingLink: `http://localhost:3001/trip-link?token=${token}`,
    };
  }

  public updateTripLocation(tripId: string, userId: string, lat: number, lng: number, accuracy = 8): GeoPoint {
    const trip = this.trips.get(tripId);
    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }
    if (trip.userId !== userId) {
      throw new Error('Unauthorized: cannot update trip location of another user');
    }
    if (trip.status !== 'IN_TRANSIT' && trip.status !== 'CHECKIN_PENDING') {
      throw new Error(`Cannot update location for trip with status: ${trip.status}. Tracking is deactivated.`);
    }

    const point: GeoPoint = {
      latitude: lat,
      longitude: lng,
      accuracy,
      timestamp: Date.now(),
    };

    if (!isValidGeoPoint(point)) {
      throw new Error('Invalid coordinates: outside physical bounds');
    }

    const history = this.tripRouteHistory.get(tripId) ?? [];
    history.push(point);
    this.tripRouteHistory.set(tripId, history);

    return point;
  }

  public checkinSafe(tripId: string, userId: string, intervalMinutes = 15): TripSession {
    const trip = this.trips.get(tripId);
    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }
    if (trip.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const now = new Date();
    trip.lastCheckinTime = now.toISOString();
    trip.nextCheckinDeadline = new Date(now.getTime() + intervalMinutes * 60 * 1000).toISOString();
    trip.status = 'IN_TRANSIT';

    return trip;
  }

  public evaluateOverdue(tripId: string, simulatedCurrentTime?: Date): boolean {
    const trip = this.trips.get(tripId);
    if (!trip || trip.status === 'COMPLETED_SAFE' || trip.status === 'CANCELLED') {
      return false;
    }

    const now = (simulatedCurrentTime ?? new Date()).getTime();
    const arrivalTime = new Date(trip.expectedArrivalTime).getTime();

    if (now > arrivalTime && trip.status !== 'OVERDUE_ALERT') {
      trip.status = 'OVERDUE_ALERT';
      return true; // Alert triggered!
    }

    return false;
  }

  public completeTrip(tripId: string, userId: string): TripSession {
    const trip = this.trips.get(tripId);
    if (!trip) {
      throw new Error(`Trip ${tripId} not found`);
    }
    if (trip.userId !== userId) {
      throw new Error('Unauthorized');
    }

    trip.status = 'COMPLETED_SAFE';
    trip.completedAt = new Date().toISOString();
    trip.nextCheckinDeadline = null;

    // Definitively stop tracking and invalidate public token
    this.tripToToken.delete(trip.trackingToken);

    return trip;
  }

  public getPublicTripTrackingData(token: string) {
    const tripId = this.tripToToken.get(token);
    if (!tripId) {
      return { status: 'INVALID_OR_REVOKED', message: 'El enlace de viaje no es valido o ha sido finalizado.' };
    }

    const trip = this.trips.get(tripId);
    if (!trip) {
      return { status: 'NOT_FOUND', message: 'Viaje no encontrado.' };
    }

    if (trip.status === 'COMPLETED_SAFE') {
      return { status: 'COMPLETED_SAFE', message: 'El usuario llego a salvo a su destino.' };
    }

    const history = this.tripRouteHistory.get(tripId) ?? [];
    const latest = history.length > 0 ? history[history.length - 1] : null;

    return {
      status: trip.status,
      destinationName: trip.destinationName,
      expectedArrivalTime: trip.expectedArrivalTime,
      latestLocation: latest,
      pointsRecorded: history.length,
    };
  }
}
