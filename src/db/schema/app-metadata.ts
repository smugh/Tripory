import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * App Metadata & Migrations Tracking
 */
export const appMetadata = sqliteTable('app_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type AppMetadataRecord = typeof appMetadata.$inferSelect;
