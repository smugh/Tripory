import { getNativeDatabase } from '../client';

export function assertTripEditable(tripId: string) {
  const trip = getNativeDatabase().getFirstSync<{ status: string }>('SELECT status FROM trips WHERE id = ?', tripId);
  if (!trip || trip.status === 'completed') throw new Error('This trip is closed and read-only.');
}

export function assertTripRecordEditable(table: 'destinations' | 'trip_items' | 'moments', id: string) {
  const record = getNativeDatabase().getFirstSync<{ trip_id: string }>(`SELECT trip_id FROM ${table} WHERE id = ?`, id);
  if (!record) throw new Error('Trip record not found.');
  assertTripEditable(record.trip_id);
}
