import type { TripItemRecord } from '@/db/schema/trip-items';

function isDropOffItem(item: { category?: string | null }): boolean {
  if (!item?.category) return false;
  const cat = item.category.trim().toLowerCase();
  return cat === 'drop off' || cat === 'drop-off' || cat === 'dropoff';
}

export function unresolvedReturnItems<T extends Pick<TripItemRecord, 'state' | 'category'>>(items: T[]): T[] {
  return items.filter((item) => {
    // Drop Off items that were used / dropped off do not need to be returned
    if (isDropOffItem(item) && item.state === 'used') {
      return false;
    }
    return item.state !== 'returned' && item.state !== 'missing';
  });
}

export function requireFinalItemStatuses(items: Pick<TripItemRecord, 'state' | 'category'>[]): void {
  if (unresolvedReturnItems(items).length > 0) throw new Error('Review every item: choose returned or missing before closing the trip.');
}
