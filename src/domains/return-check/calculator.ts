import { ReturnSummary } from './types';
import { TripItemEntity } from '../packing/types';

/**
 * Logika evaluasi Return Check saat perjalanan selesai
 */
export function calculateReturnSummary(items: TripItemEntity[]): ReturnSummary {
  const totalItems = items.length;
  const accountedCount = items.filter((i) => i.state === 'returned').length;
  const missingItems = items.filter((i) => i.state === 'missing');
  const missingCount = missingItems.length;

  return {
    totalItems,
    accountedCount,
    missingCount,
    allAccounted: accountedCount === totalItems && totalItems > 0,
    missingItems,
  };
}
