import { ReturnSummary } from './types';
import { TripItemEntity } from '../packing/types';
import { packingRepository } from '@/db/repositories/packing.repository';
import { calculateReturnSummary } from './calculator';

export const returnCheckService = {
  calculateReturnSummary(items: TripItemEntity[]): ReturnSummary {
    return calculateReturnSummary(items);
  },

  async markItemReturned(tripItemId: string): Promise<void> {
    await packingRepository.updateItemState(tripItemId, 'returned');
  },

  async markItemMissing(tripItemId: string): Promise<void> {
    await packingRepository.updateItemState(tripItemId, 'missing');
  },
};
