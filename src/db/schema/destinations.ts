import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { trips } from './trips';

/**
 * Destinations / Itinerary Nodes
 * Menjadi anchor kontekstual perjalanan untuk planned items, actual usage, dan moments.
 */
export const destinations = sqliteTable('destinations', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  dayNumber: integer('day_number').notNull().default(1),
  orderIndex: integer('order_index').notNull().default(0),
  plannedTime: text('planned_time'), // contoh: '08:00', '14:30'
  activity: text('activity'),
  locationLabel: text('location_label'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: text('created_at').notNull(),
});

export type DestinationRecord = typeof destinations.$inferSelect;
export type NewDestinationRecord = typeof destinations.$inferInsert;
