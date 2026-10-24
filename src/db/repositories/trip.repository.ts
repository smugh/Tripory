import { eq, desc } from 'drizzle-orm';
import { db, getNativeDatabase } from '../client';
import { trips, TripRecord, NewTripRecord } from '../schema/trips';
import { generateId } from '@/core/utils/id';
import { assertTripEditable } from './trip-editability';
import * as FileSystem from 'expo-file-system/legacy';

export const tripRepository = {
  async getAll(): Promise<TripRecord[]> {
    return db.select().from(trips).orderBy(desc(trips.createdAt)).all();
  },

  async getPlanningRemovalIds(): Promise<string[]> {
    return getNativeDatabase().getAllSync<{ trip_id: string }>('SELECT trip_id FROM planning_removals').map((entry) => entry.trip_id);
  },

  async getForPlanning(): Promise<TripRecord[]> {
    const removed = new Set(await this.getPlanningRemovalIds());
    return (await this.getAll()).filter((trip) => !removed.has(trip.id));
  },

  /** Remove the planning entry only; the trip, archive and owned photos remain. */
  async removeFromPlanning(id: string): Promise<void> {
    getNativeDatabase().runSync('INSERT OR IGNORE INTO planning_removals (trip_id, removed_at) VALUES (?, ?)', id, new Date().toISOString());
  },

  async getById(id: string): Promise<TripRecord | undefined> {
    const results = db.select().from(trips).where(eq(trips.id, id)).all();
    return results[0];
  },

  async getActiveTrip(): Promise<TripRecord | undefined> {
    return (await this.getForPlanning()).filter((trip) => trip.status === 'ongoing').sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
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
    assertTripEditable(id);
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
    assertTripEditable(id);
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
    await FileSystem.deleteAsync(`${FileSystem.documentDirectory}trip-archives/${encodeURIComponent(id)}/`, { idempotent: true }).catch(() => undefined);
  },
};
