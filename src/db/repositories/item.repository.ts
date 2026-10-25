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

  async getGroups(): Promise<ItemRecord[]> {
    return db.select().from(items).where(eq(items.isGroup, 1)).orderBy(desc(items.createdAt)).all();
  },

  async getChildren(parentId: string): Promise<ItemRecord[]> {
    return db.select().from(items).where(eq(items.parentId, parentId)).orderBy(desc(items.createdAt)).all();
  },

  async delete(id: string): Promise<void> {
    // Lepaskan relasi child jika parent group dihapus
    db.update(items).set({ parentId: null }).where(eq(items.parentId, id)).run();
    db.delete(items).where(eq(items.id, id)).run();
  },

  async update(id: string, updates: Partial<Omit<NewItemRecord, 'id' | 'createdAt'>>): Promise<void> {
    const now = new Date().toISOString();
    db.update(items).set({ ...updates, updatedAt: now }).where(eq(items.id, id)).run();
  },

  async updateParent(id: string, parentId: string | null): Promise<void> {
    const now = new Date().toISOString();
    db.update(items).set({ parentId, updatedAt: now }).where(eq(items.id, id)).run();
  },
};
