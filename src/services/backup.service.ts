/**
 * Tripory Backup & Restore Service
 * Mengelola ekstraksi database SQLite lokal, pengunggahan berkas cadangan ke Gmail via MailComposer/Sharing,
 * serta pemulihan data (restore) dari lampiran email maupun berkas lokal.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { db } from '@/db/client';
import { trips, destinations, items, tripItems, moments } from '@/db/schema';
import { APP_CONFIG } from '@/core/constants';
import { logger } from '@/core/utils';

export interface TriporyBackupPayload {
  app: 'Tripory';
  version: string;
  exportedAt: string;
  targetGmail: string;
  data: {
    trips: any[];
    destinations: any[];
    items: any[];
    tripItems: any[];
    moments: any[];
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  stats?: {
    tripsCount: number;
    destinationsCount: number;
    itemsCount: number;
    tripItemsCount: number;
    momentsCount: number;
  };
}

class BackupService {
  /**
   * Ekstrak seluruh basis data SQLite lokal ke struktur JSON
   */
  async extractLocalData(targetGmail: string): Promise<TriporyBackupPayload> {
    const allTrips = await db.select().from(trips);
    const allDestinations = await db.select().from(destinations);
    const allItems = await db.select().from(items);
    const allTripItems = await db.select().from(tripItems);
    const allMoments = await db.select().from(moments);

    return {
      app: 'Tripory',
      version: APP_CONFIG.version,
      exportedAt: new Date().toISOString(),
      targetGmail,
      data: {
        trips: allTrips,
        destinations: allDestinations,
        items: allItems,
        tripItems: allTripItems,
        moments: allMoments,
      },
    };
  }

  /**
   * Simpan payload JSON ke file lokal dan kembalikan URI file
   */
  async saveBackupToFile(payload: TriporyBackupPayload): Promise<string> {
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `tripory-backup-${dateStr}.json`;
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
    const filePath = `${baseDir}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(payload, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    logger.info(`Berkas cadangan berhasil ditulis ke: ${filePath}`, { category: 'general' });
    return filePath;
  }

  /**
   * Ekstrak data lokal dan kirim/unggah berkas cadangan ke alamat Gmail pengguna
   */
  async backupAndSendToGmail(targetGmail: string): Promise<{ success: boolean; filePath: string; via: 'mail' | 'share' }> {
    const payload = await this.extractLocalData(targetGmail);
    const filePath = await this.saveBackupToFile(payload);

    const isMailAvailable = await MailComposer.isAvailableAsync().catch(() => false);

    if (isMailAvailable && targetGmail.trim()) {
      try {
        await MailComposer.composeAsync({
          recipients: [targetGmail.trim()],
          subject: `[Tripory Backup] Cadangan Data Perjalanan & Inventaris (${new Date().toLocaleDateString()})`,
          body: `Halo!\n\nBerikut terlampir file cadangan data lokal Tripory Anda.\n\nRingkasan Berkas:\n• Total Perjalanan: ${payload.data.trips.length}\n• Destinasi / Roadmap: ${payload.data.destinations.length}\n• Inventaris Barang: ${payload.data.items.length}\n• Foto & Momen: ${payload.data.moments.length}\n\nUntuk memulihkan data, simpan lampiran file 'tripory-backup.json' dan pilih 'Ambil dari Email (Gmail)' pada menu Pengaturan Tripory.\n\nDiekspor pada: ${new Date().toLocaleString()}`,
          attachments: [filePath],
        });
        return { success: true, filePath, via: 'mail' };
      } catch (err) {
        logger.warn('Gagal membuka MailComposer, beralih ke Sharing', { category: 'general', error: String(err) });
      }
    }

    // Fallback: Gunakan expo-sharing untuk upload/kirim berkas via aplikasi Gmail atau email lainnya
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: `Kirim Cadangan Data Tripory ke Gmail (${targetGmail || 'Email'})`,
        UTI: 'public.json',
      });
      return { success: true, filePath, via: 'share' };
    }

    return { success: true, filePath, via: 'share' };
  }

  /**
   * Membuka dokumen picker untuk memilih berkas JSON cadangan dari unduhan email Gmail atau memori lokal
   */
  async pickBackupFile(): Promise<string | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (err) {
      logger.error('Gagal memilih file cadangan:', { category: 'general', error: String(err) });
      return null;
    }
  }

  /**
   * Membaca dan memvalidasi berkas cadangan JSON
   */
  async parseBackupFile(fileUri: string): Promise<TriporyBackupPayload> {
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsed = JSON.parse(content);
    if (!parsed || parsed.app !== 'Tripory' || !parsed.data) {
      throw new Error('Format file bukan berkas cadangan valid Tripory.');
    }

    return parsed as TriporyBackupPayload;
  }

  /**
   * Pulihkan data dari payload JSON ke dalam database SQLite lokal
   */
  async restoreData(payload: TriporyBackupPayload): Promise<RestoreResult> {
    const { data } = payload;
    let tripsCount = 0;
    let destinationsCount = 0;
    let itemsCount = 0;
    let tripItemsCount = 0;
    let momentsCount = 0;

    // 1. Pulihkan items inventaris
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        try {
          await db
            .insert(items)
            .values({
              id: item.id,
              name: item.name,
              category: item.category,
              quantity: item.quantity ?? 1,
              notes: item.notes ?? null,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: items.id,
              set: {
                name: item.name,
                category: item.category,
                quantity: item.quantity ?? 1,
                notes: item.notes ?? null,
                updatedAt: new Date().toISOString(),
              },
            });
          itemsCount++;
        } catch {
          // ignore duplicate conflict
        }
      }
    }

    // 2. Pulihkan trips
    if (Array.isArray(data.trips)) {
      for (const trip of data.trips) {
        try {
          await db
            .insert(trips)
            .values({
              id: trip.id,
              name: trip.name,
              destination: trip.destination,
              startDate: trip.startDate,
              endDate: trip.endDate,
              durationDays: trip.durationDays ?? 1,
              status: trip.status || 'draft',
              coverPhotoPath: trip.coverPhotoPath ?? null,
              notes: trip.notes ?? null,
              isArchived: trip.isArchived ?? 0,
              hasMissingItems: trip.hasMissingItems ?? 0,
              createdAt: trip.createdAt || new Date().toISOString(),
              updatedAt: trip.updatedAt || new Date().toISOString(),
            })
            .onConflictDoUpdate({
              target: trips.id,
              set: {
                name: trip.name,
                destination: trip.destination,
                startDate: trip.startDate,
                endDate: trip.endDate,
                durationDays: trip.durationDays ?? 1,
                status: trip.status || 'draft',
                updatedAt: new Date().toISOString(),
              },
            });
          tripsCount++;
        } catch {
          // ignore
        }
      }
    }

    // 3. Pulihkan destinations
    if (Array.isArray(data.destinations)) {
      for (const dest of data.destinations) {
        try {
          await db
            .insert(destinations)
            .values({
              id: dest.id,
              tripId: dest.tripId,
              name: dest.name,
              dayNumber: dest.dayNumber ?? 1,
              orderIndex: dest.orderIndex ?? 0,
              plannedTime: dest.plannedTime ?? null,
              activity: dest.activity ?? null,
              locationLabel: dest.locationLabel ?? null,
              latitude: dest.latitude ?? null,
              longitude: dest.longitude ?? null,
              createdAt: dest.createdAt || new Date().toISOString(),
            })
            .onConflictDoNothing();
          destinationsCount++;
        } catch {
          // ignore
        }
      }
    }

    // 4. Pulihkan trip items
    if (Array.isArray(data.tripItems)) {
      for (const ti of data.tripItems) {
        try {
          await db
            .insert(tripItems)
            .values({
              id: ti.id,
              tripId: ti.tripId,
              itemId: ti.itemId ?? null,
              customName: ti.customName || 'Item',
              category: ti.category ?? 'Others',
              plannedDestinationId: ti.plannedDestinationId ?? null,
              state: ti.state ?? 'planned',
              priority: ti.priority ?? 'must_have',
              quantity: ti.quantity ?? 1,
              notes: ti.notes ?? null,
              createdAt: ti.createdAt || new Date().toISOString(),
              updatedAt: ti.updatedAt || new Date().toISOString(),
            })
            .onConflictDoNothing();
          tripItemsCount++;
        } catch {
          // ignore
        }
      }
    }

    // 5. Pulihkan moments
    if (Array.isArray(data.moments)) {
      for (const m of data.moments) {
        try {
          await db
            .insert(moments)
            .values({
              id: m.id,
              tripId: m.tripId,
              destinationId: m.destinationId ?? null,
              caption: m.caption ?? null,
              photoPath: m.photoPath,
              locationName: m.locationName ?? null,
              latitude: m.latitude ?? null,
              longitude: m.longitude ?? null,
              capturedAt: m.capturedAt || new Date().toISOString(),
              createdAt: m.createdAt || new Date().toISOString(),
            })
            .onConflictDoNothing();
          momentsCount++;
        } catch {
          // ignore
        }
      }
    }

    return {
      success: true,
      message: 'Pemulihan data berhasil diselesaikan.',
      stats: {
        tripsCount,
        destinationsCount,
        itemsCount,
        tripItemsCount,
        momentsCount,
      },
    };
  }
}

export const backupService = new BackupService();
