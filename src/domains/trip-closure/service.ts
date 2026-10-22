import { CloseTripOptions, ClosureResult } from './types';
import { tripRepository } from '@/db/repositories/trip.repository';
import { packingRepository } from '@/db/repositories/packing.repository';

export const tripClosureService = {
  /**
   * Menutup perjalanan.
   * Tetap dapat ditutup meskipun ada barang yang belum ditemukan (missing),
   * dan mencatatnya sebagai arsip trip dengan warning.
   */
  async closeTrip(options: CloseTripOptions): Promise<ClosureResult> {
    const tripItems = await packingRepository.getByTripId(options.tripId);
    
    // Barang yang belum ditandai 'returned'
    const unreturnedItems = tripItems.filter((item) => item.state !== 'returned');
    const hasMissingItems = unreturnedItems.length > 0;

    // Jika ada barang belum kembali, tandai statusnya sebagai 'missing' di trip items
    if (hasMissingItems) {
      for (const item of unreturnedItems) {
        if (item.state !== 'missing') {
          await packingRepository.updateItemState(item.id, 'missing');
        }
      }
    }

    // Perbarui status trip ke 'completed' dan simpan flag missing items
    await tripRepository.updateStatus(options.tripId, 'completed', {
      isArchived: 1,
      hasMissingItems: hasMissingItems ? 1 : 0,
    });

    return {
      success: true,
      hasMissingItems,
      missingItemsCount: unreturnedItems.length,
      closedAt: new Date().toISOString(),
    };
  },
};
