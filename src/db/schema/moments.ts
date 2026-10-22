import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';
import { trips } from './trips';
import { destinations } from './destinations';

/**
 * Moments (Memories / Catatan Kejadian Perjalanan)
 * Terikat ke trip dan destinasi kontekstual.
 * Binary foto disimpan di filesystem perangkat; SQLite hanya menyimpan metadata dan path relatif.
 */
export const moments = sqliteTable('moments', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  destinationId: text('destination_id').references(() => destinations.id, { onDelete: 'set null' }),
  caption: text('caption'),
  photoPath: text('photo_path').notNull(),
  locationName: text('location_name'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  capturedAt: text('captured_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export type MomentRecord = typeof moments.$inferSelect;
export type NewMomentRecord = typeof moments.$inferInsert;
