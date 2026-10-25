import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { trips } from './trips';
import { items } from './items';
import { destinations } from './destinations';

/**
 * Trip Items (Assignment personal item ke trip tertentu)
 * Status barang terpisah dari status trip:
 * 'planned' | 'packed' | 'available' | 'used' | 'returned' | 'missing'
 */
export const tripItems = sqliteTable('trip_items', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => trips.id, { onDelete: 'cascade' }),
  itemId: text('item_id').references(() => items.id, { onDelete: 'set null' }),
  customName: text('custom_name').notNull(),
  category: text('category').notNull(),
  plannedDestinationId: text('planned_destination_id').references(() => destinations.id, { onDelete: 'set null' }),
  state: text('state', {
    enum: ['planned', 'packed', 'available', 'used', 'returned', 'missing'],
  }).notNull().default('planned'),
  priority: text('priority', {
    enum: ['must_have', 'conditional', 'optional'],
  }).notNull().default('must_have'),
  quantity: integer('quantity').notNull().default(1),
  notes: text('notes'),
  parentId: text('parent_id'),
  isGroup: integer('is_group').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type TripItemRecord = typeof tripItems.$inferSelect;
export type NewTripItemRecord = typeof tripItems.$inferInsert;
