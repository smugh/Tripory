import { eq, and } from 'drizzle-orm';
import { db } from '../client';
import { tripItems, TripItemRecord, NewTripItemRecord } from '../schema/trip-items';
import { destinationUsages, DestinationUsageRecord } from '../schema/destination-usages';
import { generateId } from '@/core/utils/id';

export const packingRepository = {
  async getByTripId(tripId: string): Promise<TripItemRecord[]> {
    return db.select().from(tripItems).where(eq(tripItems.tripId, tripId)).all();
  },

  async addTripItem(data: Omit<NewTripItemRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<TripItemRecord> {
    const now = new Date().toISOString();
    const newRecord: NewTripItemRecord = {
      ...data,
      id: generateId('tr_item'),
      createdAt: now,
      updatedAt: now,
    };
    db.insert(tripItems).values(newRecord).run();
    return newRecord as TripItemRecord;
  },

  async updateItemState(id: string, state: TripItemRecord['state']): Promise<void> {
    const now = new Date().toISOString();
    db.update(tripItems)
      .set({ state, updatedAt: now })
      .where(eq(tripItems.id, id))
      .run();
  },

  /**
   * Skenario Baju C: Mencatat actual usage di sebuah destinasi
   */
  async recordActualUsage(destinationId: string, tripItemId: string, notes?: string): Promise<DestinationUsageRecord> {
    const now = new Date().toISOString();
    const usageRecord: DestinationUsageRecord = {
      id: generateId('usage'),
      destinationId,
      tripItemId,
      usedAt: now,
      notes: notes ?? null,
    };
    db.insert(destinationUsages).values(usageRecord).run();

    // Perbarui status trip_item menjadi 'used'
    await this.updateItemState(tripItemId, 'used');
    return usageRecord;
  },

  async getActualUsages(destinationId: string): Promise<DestinationUsageRecord[]> {
    return db
      .select()
      .from(destinationUsages)
      .where(eq(destinationUsages.destinationId, destinationId))
      .all();
  },
};
