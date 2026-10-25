/**
 * Domain: Packing & Readiness
 * Status item per trip: 'planned' | 'packed' | 'available' | 'used' | 'returned' | 'missing'
 */

export type PackingState = 'planned' | 'packed' | 'available' | 'used' | 'returned' | 'missing';
export type ItemPriority = 'must_have' | 'conditional' | 'optional';

export interface TripItemEntity {
  id: string;
  tripId: string;
  itemId?: string | null;
  customName: string;
  category: string;
  plannedDestinationId?: string | null;
  state: PackingState;
  priority: ItemPriority;
  quantity: number;
  notes?: string | null;
  parentId?: string | null;
  isGroup?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PackingSummary {
  totalItems: number;
  packedCount: number;
  percentage: number;
  criticalBlockers: TripItemEntity[]; // Must-have items that are still 'planned'
  isReadyForDeparture: boolean;
  statusLabel: string;
}

export function isDropOffItem(item: { category?: string | null }): boolean {
  if (!item?.category) return false;
  const cat = item.category.trim().toLowerCase();
  return cat === 'drop off' || cat === 'drop-off' || cat === 'dropoff';
}
