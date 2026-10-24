import * as FileSystem from 'expo-file-system/legacy';
import { getNativeDatabase } from '../client';
import { tripRepository } from './trip.repository';
import { destinationRepository } from './destination.repository';
import { packingRepository } from './packing.repository';
import { momentRepository } from './moment.repository';
import { itemRepository } from './item.repository';
import { TripRecord } from '../schema/trips';
import { DestinationRecord } from '../schema/destinations';
import { TripItemRecord } from '../schema/trip-items';
import { MomentRecord } from '../schema/moments';
import { DestinationUsageRecord } from '../schema/destination-usages';
import { generateId } from '@/core/utils/id';

export interface TripArchive {
  trip: TripRecord;
  destinations: DestinationRecord[];
  items: (TripItemRecord & { imageUri: string | null })[];
  moments: MomentRecord[];
  usages: DestinationUsageRecord[];
  closedAt: string;
  events?: { id: string; tripItemId: string; destinationId: string | null; state: string; occurredAt: string }[];
}

export const archiveRepository = {
  get(tripId: string): TripArchive | null {
    const row = getNativeDatabase().getFirstSync<{ payload: string }>('SELECT payload FROM trip_archives WHERE trip_id = ?', tripId);
    return row ? JSON.parse(row.payload) : null;
  },

  async capture(tripId: string, closedAt = new Date().toISOString()): Promise<TripArchive> {
    const existing = this.get(tripId);
    if (existing) return existing;
    const trip = await tripRepository.getById(tripId);
    if (!trip) throw new Error('Trip not found.');
    const [destinations, items, moments, inventory] = await Promise.all([
      destinationRepository.getByTripId(tripId), packingRepository.getByTripId(tripId),
      momentRepository.getByTripId(tripId), itemRepository.getAll(),
    ]);
    const usages = (await Promise.all(destinations.map((stop) => packingRepository.getActualUsages(stop.id)))).flat();
    const events = getNativeDatabase().getAllSync<NonNullable<TripArchive['events']>[number]>('SELECT id, trip_item_id AS tripItemId, destination_id AS destinationId, state, occurred_at AS occurredAt FROM item_events WHERE trip_id = ? ORDER BY occurred_at, rowid', tripId);
    const copies = new Map<string, string>();
    const directory = `${FileSystem.documentDirectory}trip-archives/${encodeURIComponent(tripId)}/`;
    async function preservePhoto(uri: string | null): Promise<string | null> {
      if (!uri || uri.startsWith('local://')) return uri;
      if (copies.has(uri)) return copies.get(uri)!;
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return null;
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const extension = uri.match(/\.(png|jpe?g|webp|heic)$/i)?.[1] ?? 'jpg';
      const savedUri = `${directory}${generateId('photo')}.${extension}`;
      await FileSystem.copyAsync({ from: uri, to: savedUri });
      copies.set(uri, savedUri);
      return savedUri;
    }
    // Preserve owned copies so inventory photo changes cannot alter an old trip.
    const archivedItems: TripArchive['items'] = [];
    for (const item of items) archivedItems.push({ ...item, imageUri: await preservePhoto(inventory.find((entry) => entry.id === item.itemId)?.imageUri ?? null) });
    const archivedStops: DestinationRecord[] = [];
    for (const stop of destinations) archivedStops.push({ ...stop, imageUri: await preservePhoto(stop.imageUri) });
    const archivedMoments: MomentRecord[] = [];
    for (const moment of moments) archivedMoments.push({ ...moment, photoPath: await preservePhoto(moment.photoPath) ?? '' });
    const archive: TripArchive = {
      trip: { ...trip, status: 'completed', isArchived: 1, updatedAt: closedAt, coverPhotoPath: await preservePhoto(trip.coverPhotoPath) },
      destinations: archivedStops, items: archivedItems, moments: archivedMoments, usages, events, closedAt,
    };
    getNativeDatabase().runSync('INSERT OR IGNORE INTO trip_archives (trip_id, payload, closed_at) VALUES (?, ?, ?)', tripId, JSON.stringify(archive), closedAt);
    return this.get(tripId)!;
  },

  async getCompleted(tripId: string): Promise<TripArchive> {
    const trip = await tripRepository.getById(tripId);
    if (!trip || trip.status !== 'completed') throw new Error('This trip is not closed.');
    return this.get(tripId) ?? this.capture(tripId, trip.updatedAt);
  },
};
