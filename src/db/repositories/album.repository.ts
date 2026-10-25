import { eq } from 'drizzle-orm';
import { db, getNativeDatabase } from '../client';
import { albumCustomizations, AlbumCustomizationRecord, NewAlbumCustomizationRecord } from '../schema/album-customizations';
import { tripRepository } from './trip.repository';

export const albumRepository = {
  async getAllCustomizations(): Promise<AlbumCustomizationRecord[]> {
    try {
      return db.select().from(albumCustomizations).all();
    } catch {
      return [];
    }
  },

  async getCustomization(tripId: string): Promise<AlbumCustomizationRecord | null> {
    try {
      const records = db
        .select()
        .from(albumCustomizations)
        .where(eq(albumCustomizations.tripId, tripId))
        .all();
      return records[0] ?? null;
    } catch {
      return null;
    }
  },

  async getHiddenTripIds(): Promise<Set<string>> {
    try {
      const rows = getNativeDatabase().getAllSync<{ trip_id: string }>(
        'SELECT trip_id FROM album_customizations WHERE is_hidden = 1'
      );
      return new Set(rows.map((r) => r.trip_id));
    } catch {
      return new Set();
    }
  },

  async setCustomization(
    tripId: string,
    updates: Partial<Omit<NewAlbumCustomizationRecord, 'tripId' | 'updatedAt'>>
  ): Promise<void> {
    const now = new Date().toISOString();
    const existing = await this.getCustomization(tripId);

    if (existing) {
      db.update(albumCustomizations)
        .set({
          ...updates,
          updatedAt: now,
        })
        .where(eq(albumCustomizations.tripId, tripId))
        .run();
    } else {
      const newRecord: NewAlbumCustomizationRecord = {
        tripId,
        customTitle: updates.customTitle ?? null,
        customNotes: updates.customNotes ?? null,
        customCoverPath: updates.customCoverPath ?? null,
        isHidden: updates.isHidden ?? 0,
        updatedAt: now,
      };
      db.insert(albumCustomizations).values(newRecord).run();
    }
  },

  async toggleHide(tripId: string): Promise<boolean> {
    const existing = await this.getCustomization(tripId);
    const newHiddenState = existing?.isHidden === 1 ? 0 : 1;
    await this.setCustomization(tripId, { isHidden: newHiddenState });
    return newHiddenState === 1;
  },

  async deleteAlbum(tripId: string): Promise<void> {
    try {
      db.delete(albumCustomizations).where(eq(albumCustomizations.tripId, tripId)).run();
    } catch {
      // ignore
    }
    // Menghapus trip dan arsip kenangannya
    await tripRepository.delete(tripId);
  },
};
