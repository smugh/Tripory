import { CloseTripOptions, ClosureResult } from './types';
import { tripRepository } from '@/db/repositories/trip.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { archiveRepository } from '@/db/repositories/archive.repository';
import { getNativeDatabase } from '@/db/client';
import { assertTripEditable } from '@/db/repositories/trip-editability';
import { requireFinalItemStatuses } from './validation';

export const tripClosureService = {
  /**
   * Menutup perjalanan.
   * Tetap dapat ditutup meskipun ada barang yang belum ditemukan (missing),
   * dan mencatatnya sebagai arsip trip dengan warning.
   */
  async closeTrip(options: CloseTripOptions): Promise<ClosureResult> {
    assertTripEditable(options.tripId);
    let result: ClosureResult | undefined;
    await getNativeDatabase().withTransactionAsync(async () => {
    const tripItems = await packingRepository.getByTripId(options.tripId);
    requireFinalItemStatuses(tripItems);
    const unreturnedItems = tripItems.filter((item) => item.state === 'missing');
    const hasMissingItems = unreturnedItems.length > 0;

    const closedAt = new Date().toISOString();
    await tripRepository.update(options.tripId, { hasMissingItems: hasMissingItems ? 1 : 0 });
    await archiveRepository.capture(options.tripId, closedAt);
    // Perbarui status trip ke 'completed' dan simpan flag missing items
    await tripRepository.updateStatus(options.tripId, 'completed', {
      isArchived: 1,
      hasMissingItems: hasMissingItems ? 1 : 0,
    });

    result = {
      success: true,
      hasMissingItems,
      missingItemsCount: unreturnedItems.length,
      closedAt,
    };
    });
    if (!result) throw new Error('Trip closure did not complete.');
    return result;
  },
};
