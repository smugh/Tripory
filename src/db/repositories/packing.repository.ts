import { eq, and } from 'drizzle-orm';
import { db, getNativeDatabase } from '../client';
import { tripItems, TripItemRecord, NewTripItemRecord } from '../schema/trip-items';
import { destinationUsages, DestinationUsageRecord } from '../schema/destination-usages';
import { generateId } from '@/core/utils/id';
import { assertTripEditable, assertTripRecordEditable } from './trip-editability';

export const packingRepository = {
  async getByTripId(tripId: string): Promise<TripItemRecord[]> {
    return db.select().from(tripItems).where(eq(tripItems.tripId, tripId)).all();
  },

  async addTripItem(data: Omit<NewTripItemRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<TripItemRecord> {
    assertTripEditable(data.tripId);
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

  async updateItemState(id: string, state: TripItemRecord['state'], destinationId?: string): Promise<void> {
    assertTripRecordEditable('trip_items', id);
    if (destinationId) assertTripRecordEditable('destinations', destinationId);
    const now = new Date().toISOString();
    const item = getNativeDatabase().getFirstSync<{ trip_id: string }>('SELECT trip_id FROM trip_items WHERE id = ?', id)!;
    const save = () => {
    db.update(tripItems)
      .set({ state, updatedAt: now })
      .where(eq(tripItems.id, id))
      .run();
    getNativeDatabase().runSync('INSERT INTO item_events (id, trip_id, trip_item_id, destination_id, state, occurred_at) VALUES (?, ?, ?, ?, ?, ?)', generateId('event'), item.trip_id, id, destinationId ?? null, state, now);
    };
    if (getNativeDatabase().isInTransactionSync()) save();
    else getNativeDatabase().withTransactionSync(save);
  },

  async updateItemDestination(id: string, plannedDestinationId: string | null): Promise<void> {
    assertTripRecordEditable('trip_items', id);
    if (plannedDestinationId) assertTripRecordEditable('destinations', plannedDestinationId);
    const now = new Date().toISOString();
    db.update(tripItems)
      .set({ plannedDestinationId, updatedAt: now })
      .where(eq(tripItems.id, id))
      .run();
  },

  async updateItem(id: string, updates: Partial<Omit<NewTripItemRecord, 'id' | 'createdAt'>>): Promise<void> {
    assertTripRecordEditable('trip_items', id);
    if (updates.tripId) assertTripEditable(updates.tripId);
    if (updates.plannedDestinationId) assertTripRecordEditable('destinations', updates.plannedDestinationId);
    const now = new Date().toISOString();
    db.update(tripItems)
      .set({ ...updates, updatedAt: now })
      .where(eq(tripItems.id, id))
      .run();
  },

  async deleteTripItem(id: string): Promise<void> {
    assertTripRecordEditable('trip_items', id);
    // Hapus juga child items jika item ini adalah grup
    db.delete(tripItems).where(eq(tripItems.parentId, id)).run();
    db.delete(tripItems).where(eq(tripItems.id, id)).run();
  },

  async updateGroupState(parentId: string, state: TripItemRecord['state']): Promise<void> {
    assertTripRecordEditable('trip_items', parentId);
    const now = new Date().toISOString();
    const children = db.select().from(tripItems).where(eq(tripItems.parentId, parentId)).all();
    for (const child of children) {
      await this.updateItemState(child.id, state);
    }
    // Update juga status group parent itu sendiri
    db.update(tripItems).set({ state, updatedAt: now }).where(eq(tripItems.id, parentId)).run();
  },

  async updateItemParent(id: string, parentId: string | null): Promise<void> {
    assertTripRecordEditable('trip_items', id);
    const now = new Date().toISOString();
    db.update(tripItems).set({ parentId, updatedAt: now }).where(eq(tripItems.id, id)).run();
  },

  /**
   * Skenario Baju C: Mencatat actual usage di sebuah destinasi
   */
  async recordActualUsage(destinationId: string, tripItemId: string, notes?: string): Promise<DestinationUsageRecord> {
    assertTripRecordEditable('destinations', destinationId);
    assertTripRecordEditable('trip_items', tripItemId);
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
    await this.updateItemState(tripItemId, 'used', destinationId);
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
