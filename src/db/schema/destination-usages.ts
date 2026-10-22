import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { destinations } from './destinations';
import { tripItems } from './trip-items';

/**
 * Destination Usages (Actual Usage Event)
 * Menjawab perbedaan Planned vs Actual (Skenario Baju C di PRD/IA):
 * Item direncanakan untuk destinasi 3 tapi dipakai di destinasi 2.
 */
export const destinationUsages = sqliteTable('destination_usages', {
  id: text('id').primaryKey(),
  destinationId: text('destination_id').notNull().references(() => destinations.id, { onDelete: 'cascade' }),
  tripItemId: text('trip_item_id').notNull().references(() => tripItems.id, { onDelete: 'cascade' }),
  usedAt: text('used_at').notNull(),
  notes: text('notes'),
});

export type DestinationUsageRecord = typeof destinationUsages.$inferSelect;
export type NewDestinationUsageRecord = typeof destinationUsages.$inferInsert;
