import { TripItemEntity, PackingSummary, PackingState } from './types';
import { packingRepository } from '@/db/repositories/packing.repository';
import { computeReadiness } from './readiness';

export const packingService = {
  async getTripItems(tripId: string): Promise<TripItemEntity[]> {
    const records = await packingRepository.getByTripId(tripId);
    return records.map((r) => ({
      ...r,
      state: r.state as PackingState,
      priority: r.priority as TripItemEntity['priority'],
    }));
  },

  async togglePacked(tripItemId: string, currentState: PackingState): Promise<PackingState> {
    const nextState: PackingState = currentState === 'planned' ? 'packed' : 'planned';
    await packingRepository.updateItemState(tripItemId, nextState);
    return nextState;
  },

  computeReadiness(items: TripItemEntity[], language: 'en' | 'id' = 'en'): PackingSummary {
    return computeReadiness(items, language);
  },
};
