import { getNativeDatabase } from '../client';
import { generateId } from '@/core/utils/id';
import { AgendaItemDraft, AgendaType, AgendaWithItems, CreateAgendaInput } from '@/domains/agenda/types';

type AgendaRow = Omit<AgendaWithItems, 'items'>;
type AgendaItemRow = AgendaWithItems['items'][number];

const db = () => getNativeDatabase();

function normalizeAgenda(row: any): AgendaRow {
  return {
    id: row.id, type: row.type, title: row.title, date: row.date, location: row.location,
    notes: row.notes, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt,
    closedAt: row.closedAt,
  };
}

export const agendaRepository = {
  getAll(status?: 'active' | 'saved'): AgendaRow[] {
    const rows = db().getAllSync<any>(
      `SELECT id, agenda_type AS type, title, date, location, notes, status,
       created_at AS createdAt, updated_at AS updatedAt, closed_at AS closedAt
       FROM agendas ${status ? 'WHERE status = ?' : ''} ORDER BY COALESCE(date, created_at) DESC, created_at DESC`,
      ...(status ? [status] : []),
    );
    return rows.map(normalizeAgenda);
  },

  getById(id: string): AgendaWithItems | null {
    const row = db().getFirstSync<any>(
      `SELECT id, agenda_type AS type, title, date, location, notes, status,
       created_at AS createdAt, updated_at AS updatedAt, closed_at AS closedAt
       FROM agendas WHERE id = ?`, id,
    );
    if (!row) return null;
    const items = db().getAllSync<AgendaItemRow>(
      `SELECT id, agenda_id AS agendaId, name, quantity, unit, is_done AS isDone,
       estimated_price AS estimatedPrice, shelf_price AS shelfPrice, actual_price AS actualPrice,
       notes, order_index AS orderIndex, created_at AS createdAt, updated_at AS updatedAt
       FROM agenda_items WHERE agenda_id = ? ORDER BY order_index, created_at`, id,
    );
    return { ...normalizeAgenda(row), items };
  },

  create(input: CreateAgendaInput): string {
    const now = new Date().toISOString();
    const id = generateId('agenda');
    db().withTransactionSync(() => {
      db().runSync(
        `INSERT INTO agendas (id, agenda_type, title, date, location, notes, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        id, input.type, input.title.trim(), input.date || null, input.location?.trim() || null,
        input.notes?.trim() || null, now, now,
      );
      (input.items ?? []).filter((item) => item.name.trim()).forEach((item, index) => {
        this.insertItem(id, item, index, now);
      });
    });
    return id;
  },

  addItem(agendaId: string, item: AgendaItemDraft): string {
    const agenda = db().getFirstSync<{ status: string }>('SELECT status FROM agendas WHERE id = ?', agendaId);
    if (!agenda || agenda.status !== 'active') throw new Error('Agenda ini tidak dapat diubah.');
    const now = new Date().toISOString();
    const max = db().getFirstSync<{ maxOrder: number | null }>(
      'SELECT MAX(order_index) AS maxOrder FROM agenda_items WHERE agenda_id = ?', agendaId,
    );
    const id = this.insertItem(agendaId, item, (max?.maxOrder ?? -1) + 1, now);
    db().runSync('UPDATE agendas SET updated_at = ? WHERE id = ?', now, agendaId);
    return id;
  },

  updateItem(id: string, updates: Partial<AgendaItemDraft & { isDone: boolean }>): void {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    const columnMap: Record<string, string> = {
      name: 'name', quantity: 'quantity', unit: 'unit', estimatedPrice: 'estimated_price',
      shelfPrice: 'shelf_price', actualPrice: 'actual_price', notes: 'notes', isDone: 'is_done',
    };
    for (const [key, value] of Object.entries(updates)) {
      if (key in columnMap) {
        fields.push(`${columnMap[key]} = ?`);
        values.push(key === 'isDone' ? (value ? 1 : 0) : (value as string | number | null));
      }
    }
    if (!fields.length) return;
    fields.push('updated_at = ?');
    values.push(now, id);
    db().runSync(`UPDATE agenda_items SET ${fields.join(', ')} WHERE id = ?`, ...values);
    db().runSync('UPDATE agendas SET updated_at = ? WHERE id = (SELECT agenda_id FROM agenda_items WHERE id = ?)', now, id);
  },

  removeItem(id: string): void {
    const now = new Date().toISOString();
    const row = db().getFirstSync<{ agendaId: string }>('SELECT agenda_id AS agendaId FROM agenda_items WHERE id = ?', id);
    db().runSync('DELETE FROM agenda_items WHERE id = ?', id);
    if (row) db().runSync('UPDATE agendas SET updated_at = ? WHERE id = ?', now, row.agendaId);
  },

  updateDetails(id: string, updates: { title?: string; date?: string | null; location?: string | null; notes?: string | null }): void {
    const now = new Date().toISOString();
    db().runSync(
      `UPDATE agendas SET title = COALESCE(?, title), date = ?, location = ?, notes = ?, updated_at = ?
       WHERE id = ? AND status = 'active'`,
      updates.title?.trim() || null,
      updates.date ?? null,
      updates.location?.trim() || null,
      updates.notes?.trim() || null,
      now,
      id,
    );
  },

  save(id: string): void {
    const now = new Date().toISOString();
    db().runSync("UPDATE agendas SET status = 'saved', closed_at = ?, updated_at = ? WHERE id = ? AND status = 'active'", now, now, id);
  },

  delete(id: string): void {
    db().runSync('DELETE FROM agendas WHERE id = ?', id);
  },

  estimateTotal(agendaId: string): number {
    const rows = db().getAllSync<{ quantity: number; estimatedPrice: number | null; shelfPrice: number | null }>(
      'SELECT quantity, estimated_price AS estimatedPrice, shelf_price AS shelfPrice FROM agenda_items WHERE agenda_id = ?', agendaId,
    );
    return rows.reduce((sum, item) => sum + item.quantity * (item.shelfPrice ?? item.estimatedPrice ?? 0), 0);
  },

  actualTotal(agendaId: string): number {
    const rows = db().getAllSync<{ quantity: number; actualPrice: number | null }>(
      'SELECT quantity, actual_price AS actualPrice FROM agenda_items WHERE agenda_id = ?', agendaId,
    );
    return rows.reduce((sum, item) => sum + item.quantity * (item.actualPrice ?? 0), 0);
  },

  insertItem(agendaId: string, item: AgendaItemDraft, orderIndex: number, now = new Date().toISOString()): string {
    const id = generateId('agenda_item');
    db().runSync(
      `INSERT INTO agenda_items (id, agenda_id, name, quantity, unit, estimated_price, shelf_price, actual_price, notes, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, agendaId, item.name.trim(), item.quantity ?? 1, item.unit?.trim() || null,
      item.estimatedPrice ?? null, item.shelfPrice ?? null, item.actualPrice ?? null,
      item.notes?.trim() || null, orderIndex, now, now,
    );
    return id;
  },
};

export type { AgendaRow };
