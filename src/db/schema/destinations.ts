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
  isVisited: integer('is_visited', { mode: 'boolean' }).notNull().default(false),
  plannedTime: text('planned_time'), // contoh: '08:00', '14:30'
  plannedDate: text('planned_date'), // YYYY-MM-DD, independent of the stop order
  activity: text('activity'),
  locationLabel: text('location_label'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  imageUri: text('image_uri'),
  notes: text('notes'),
  todos: text('todos'), // JSON array string: [{"id":"1","text":"beli tiket","completed":false}]
  createdAt: text('created_at').notNull(),
});

export type DestinationRecord = typeof destinations.$inferSelect;
export type NewDestinationRecord = typeof destinations.$inferInsert;
