import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { agendas } from './agendas';

export const agendaItems = sqliteTable('agenda_items', {
  id: text('id').primaryKey(),
  agendaId: text('agenda_id').notNull().references(() => agendas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: real('quantity').notNull().default(1),
  unit: text('unit'),
  isDone: integer('is_done').notNull().default(0),
  estimatedPrice: integer('estimated_price'),
  shelfPrice: integer('shelf_price'),
  actualPrice: integer('actual_price'),
  notes: text('notes'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type AgendaItemRecord = typeof agendaItems.$inferSelect;
export type NewAgendaItemRecord = typeof agendaItems.$inferInsert;
