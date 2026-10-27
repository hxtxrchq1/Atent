import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TripDomainService } from './trip.js';

describe('Trip Mode (Modo Viaje) Domain Service Test Suite', () => {
  it('starts trip, generates unpredictable tracking token, and ingests route points', () => {
    const service = new TripDomainService();
    const aggregate = service.startTrip({
      userId: 'usr_trip_1',
      destinationName: 'Casa Miraflores',
      expectedDurationMinutes: 30,
      initialLocation: {
        latitude: -12.0463,
        longitude: -77.0427,
      },
      checkinIntervalMinutes: 10,
    });

    assert.equal(aggregate.trip.status, 'IN_TRANSIT');
    assert.equal(aggregate.trip.destinationName, 'Casa Miraflores');
    assert.equal(aggregate.routeHistory.length, 1);
    assert.ok(aggregate.trip.trackingToken.length >= 32);

    // Update location along route
    const pt2 = service.updateTripLocation(aggregate.trip.id, 'usr_trip_1', -12.0480, -77.0440);
    assert.equal(pt2.latitude, -12.0480);

    // Public tracking access
    const publicData = service.getPublicTripTrackingData(aggregate.trip.trackingToken);
    assert.equal(publicData.status, 'IN_TRANSIT');
    assert.equal((publicData as any).pointsRecorded, 2);
  });

  it('performs safe check-in and extends deadline', () => {
    const service = new TripDomainService();
    const aggregate = service.startTrip({
      userId: 'usr_trip_2',
      destinationName: 'Oficina San Isidro',
      expectedDurationMinutes: 45,
    });

    const oldDeadline = aggregate.trip.nextCheckinDeadline;
    const updated = service.checkinSafe(aggregate.trip.id, 'usr_trip_2', 20);
    assert.notEqual(updated.nextCheckinDeadline, oldDeadline);
    assert.equal(updated.status, 'IN_TRANSIT');
  });

  it('detects overdue trips when current time exceeds arrival time', () => {
    const service = new TripDomainService();
    const aggregate = service.startTrip({
      userId: 'usr_trip_3',
      destinationName: 'Aeropuerto Jorge Chavez',
      expectedDurationMinutes: 15,
    });

    // Simulated time 20 minutes in the future (> 15 minutes expected)
    const futureTime = new Date(Date.now() + 25 * 60 * 1000);
    const isOverdue = service.evaluateOverdue(aggregate.trip.id, futureTime);
    assert.equal(isOverdue, true);

    const publicData = service.getPublicTripTrackingData(aggregate.trip.trackingToken);
    assert.equal(publicData.status, 'OVERDUE_ALERT');
  });

  it('completes trip safely and definitively terminates tracking and token', () => {
    const service = new TripDomainService();
    const aggregate = service.startTrip({
      userId: 'usr_trip_4',
      destinationName: 'Universidad',
      expectedDurationMinutes: 20,
    });

    const completed = service.completeTrip(aggregate.trip.id, 'usr_trip_4');
    assert.equal(completed.status, 'COMPLETED_SAFE');

    // Token must be invalidated / non-active
    const publicData = service.getPublicTripTrackingData(aggregate.trip.trackingToken);
    assert.equal(publicData.status, 'INVALID_OR_REVOKED');

    // Attempting to update location after completion must be rejected
    assert.throws(() => {
      service.updateTripLocation(aggregate.trip.id, 'usr_trip_4', -12.05, -77.05);
    });
  });
});
