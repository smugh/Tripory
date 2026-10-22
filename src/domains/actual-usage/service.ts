import { ActualUsageRecord, RecordUsageInput } from './types';
import { packingRepository } from '@/db/repositories/packing.repository';

export const actualUsageService = {
  /**
   * Mencatat barang yang benar-benar dipakai di destinasi tertentu (Skenario Baju C).
   */
  async recordUsage(input: RecordUsageInput): Promise<ActualUsageRecord> {
    return packingRepository.recordActualUsage(input.destinationId, input.tripItemId, input.notes);
  },

  async getUsagesAtDestination(destinationId: string): Promise<ActualUsageRecord[]> {
    return packingRepository.getActualUsages(destinationId);
  },
};
