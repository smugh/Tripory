import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import { moments, MomentRecord, NewMomentRecord } from '../schema/moments';
import { generateId } from '@/core/utils/id';
import { assertTripEditable, assertTripRecordEditable } from './trip-editability';

export const momentRepository = {
  async getAll(): Promise<MomentRecord[]> {
    return db
      .select()
      .from(moments)
      .orderBy(desc(moments.capturedAt))
      .all();
  },

  async getByTripId(tripId: string): Promise<MomentRecord[]> {
    return db
      .select()
      .from(moments)
      .where(eq(moments.tripId, tripId))
      .orderBy(desc(moments.capturedAt))
      .all();
  },

  async create(data: Omit<NewMomentRecord, 'id' | 'createdAt'>): Promise<MomentRecord> {
    assertTripEditable(data.tripId);
    const now = new Date().toISOString();
    const newRecord: NewMomentRecord = {
      ...data,
      id: generateId('moment'),
      createdAt: now,
    };
    db.insert(moments).values(newRecord).run();
    return newRecord as MomentRecord;
  },

  async delete(id: string): Promise<void> {
    assertTripRecordEditable('moments', id);
    db.delete(moments).where(eq(moments.id, id)).run();
  },
};
