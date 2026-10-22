import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import { items, ItemRecord, NewItemRecord } from '../schema/items';
import { generateId } from '@/core/utils/id';

export const itemRepository = {
  async getAll(): Promise<ItemRecord[]> {
    return db.select().from(items).orderBy(desc(items.createdAt)).all();
  },

  async getById(id: string): Promise<ItemRecord | undefined> {
    const results = db.select().from(items).where(eq(items.id, id)).all();
    return results[0];
  },

  async create(data: Omit<NewItemRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ItemRecord> {
    const now = new Date().toISOString();
    const newRecord: NewItemRecord = {
      ...data,
      id: generateId('item'),
      createdAt: now,
      updatedAt: now,
    };
    db.insert(items).values(newRecord).run();
    return newRecord as ItemRecord;
  },

  async delete(id: string): Promise<void> {
    db.delete(items).where(eq(items.id, id)).run();
  },
};
