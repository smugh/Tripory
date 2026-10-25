import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Items Entity (Persistent Personal Inventory)
 * Item adalah inventaris milik user yang persisten dan dapat digunakan kembali di banyak trip.
 * Global item TIDAK menyimpan status 'used' atau 'packed' secara permanen.
 */
export const items = sqliteTable('items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  quantity: integer('quantity').notNull().default(1),
  notes: text('notes'),
  imageUri: text('image_uri'),
  parentId: text('parent_id'),
  isGroup: integer('is_group').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type ItemRecord = typeof items.$inferSelect;
export type NewItemRecord = typeof items.$inferInsert;
