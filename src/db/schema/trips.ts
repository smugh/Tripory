import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Trip Entity
 * Status lifecycle: 'draft' | 'preparing' | 'ready' | 'ongoing' | 'completed'
 * Terpisah dari status barang (packing)
 */
export const trips = sqliteTable('trips', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  destination: text('destination').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  durationDays: integer('duration_days').notNull().default(1),
  status: text('status', {
    enum: ['draft', 'preparing', 'ready', 'ongoing', 'completed'],
  }).notNull().default('draft'),
  coverPhotoPath: text('cover_photo_path'),
  notes: text('notes'),
  isArchived: integer('is_archived').notNull().default(0),
  hasMissingItems: integer('has_missing_items').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type TripRecord = typeof trips.$inferSelect;
export type NewTripRecord = typeof trips.$inferInsert;
