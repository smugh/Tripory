import type { TripItemRecord } from '@/db/schema/trip-items';

export function unresolvedReturnItems<T extends Pick<TripItemRecord, 'state'>>(items: T[]): T[] {
  return items.filter((item) => item.state !== 'returned' && item.state !== 'missing');
}

export function requireFinalItemStatuses(items: Pick<TripItemRecord, 'state'>[]): void {
  if (unresolvedReturnItems(items).length > 0) throw new Error('Review every item: choose returned or missing before closing the trip.');
}
