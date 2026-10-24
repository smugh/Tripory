import { eq, asc, and } from 'drizzle-orm';
import { db } from '../client';
import { destinations, DestinationRecord, NewDestinationRecord } from '../schema/destinations';
import { generateId } from '@/core/utils/id';

export const destinationRepository = {
  async getAll(): Promise<DestinationRecord[]> {
    return db
      .select()
      .from(destinations)
      .orderBy(asc(destinations.orderIndex), asc(destinations.dayNumber))
      .all();
  },

  async getByTripId(tripId: string): Promise<DestinationRecord[]> {
    return db
      .select()
      .from(destinations)
      .where(eq(destinations.tripId, tripId))
      .orderBy(asc(destinations.orderIndex), asc(destinations.dayNumber))
      .all();
  },

  async getById(id: string): Promise<DestinationRecord | null> {
    const res = db.select().from(destinations).where(eq(destinations.id, id)).get();
    return res || null;
  },

  async create(data: Omit<NewDestinationRecord, 'id' | 'createdAt'>): Promise<DestinationRecord> {
    const now = new Date().toISOString();
    const newRecord: NewDestinationRecord = {
      ...data,
      id: generateId('dest'),
      createdAt: now,
    };
    db.insert(destinations).values(newRecord).run();
    return newRecord as DestinationRecord;
  },

  async update(id: string, updates: Partial<Omit<NewDestinationRecord, 'id' | 'createdAt'>>): Promise<void> {
    db.update(destinations).set(updates).where(eq(destinations.id, id)).run();
  },

  async delete(id: string): Promise<void> {
    db.delete(destinations).where(eq(destinations.id, id)).run();
  },

  async reorderForTrip(tripId: string, orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => {
      db.update(destinations)
        .set({ orderIndex: index })
        .where(and(eq(destinations.id, id), eq(destinations.tripId, tripId)))
        .run();
    });
  },
};
