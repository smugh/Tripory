import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { trips } from './trips';

/**
 * Album Customizations & Privacy Entity
 * Menyimpan kustomisasi album kenangan (judul, catatan/cerita, cover khusus)
 * serta status privasi (tersembunyi/hidden dari halaman depan).
 */
export const albumCustomizations = sqliteTable('album_customizations', {
  tripId: text('trip_id').primaryKey().references(() => trips.id, { onDelete: 'cascade' }),
  customTitle: text('custom_title'),
  customNotes: text('custom_notes'),
  customCoverPath: text('custom_cover_path'),
  isHidden: integer('is_hidden').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
});

export type AlbumCustomizationRecord = typeof albumCustomizations.$inferSelect;
export type NewAlbumCustomizationRecord = typeof albumCustomizations.$inferInsert;
