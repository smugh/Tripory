import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import { trips, TripRecord, NewTripRecord } from '../schema/trips';
import { generateId } from '@/core/utils/id';

export const tripRepository = {
  async getAll(): Promise<TripRecord[]> {
    return db.select().from(trips).orderBy(desc(trips.createdAt)).all();
  },

  async getById(id: string): Promise<TripRecord | undefined> {
    const results = db.select().from(trips).where(eq(trips.id, id)).all();
    return results[0];
  },

  async getActiveTrip(): Promise<TripRecord | undefined> {
    const results = db
      .select()
      .from(trips)
      .where(eq(trips.status, 'ongoing'))
      .orderBy(desc(trips.startDate))
      .limit(1)
      .all();
    return results[0];
  },

  async create(data: Omit<NewTripRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<TripRecord> {
    const now = new Date().toISOString();
    const newRecord: NewTripRecord = {
      ...data,
      id: generateId('trip'),
      createdAt: now,
      updatedAt: now,
    };
    db.insert(trips).values(newRecord).run();
    return newRecord as TripRecord;
  },

  async update(id: string, updates: Partial<Omit<NewTripRecord, 'id' | 'createdAt'>>): Promise<void> {
    db.update(trips)
      .set({ ...updates, updatedAt: new Date().toISOString() })
      .where(eq(trips.id, id))
      .run();
  },

  async updateStatus(
    id: string,
    status: TripRecord['status'],
    extras?: { isArchived?: number; hasMissingItems?: number }
  ): Promise<void> {
    const now = new Date().toISOString();
    db.update(trips)
      .set({
        status,
        updatedAt: now,
        ...(extras?.isArchived !== undefined ? { isArchived: extras.isArchived } : {}),
        ...(extras?.hasMissingItems !== undefined ? { hasMissingItems: extras.hasMissingItems } : {}),
      })
      .where(eq(trips.id, id))
      .run();
  },

  async delete(id: string): Promise<void> {
    db.delete(trips).where(eq(trips.id, id)).run();
  },
};
