import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const agendas = sqliteTable('agendas', {
  id: text('id').primaryKey(),
  type: text('agenda_type', { enum: ['shopping', 'short_trip', 'event'] }).notNull(),
  title: text('title').notNull(),
  date: text('date'),
  location: text('location'),
  notes: text('notes'),
  status: text('status', { enum: ['active', 'saved'] }).notNull().default('active'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  closedAt: text('closed_at'),
});

export type AgendaRecord = typeof agendas.$inferSelect;
export type NewAgendaRecord = typeof agendas.$inferInsert;
