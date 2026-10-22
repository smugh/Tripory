/**
 * Domain: Trip Closure & Archive
 * Menutup perjalanan dan mengarsipkannya dengan rekam jejak barang hilang (jika ada).
 */

export interface CloseTripOptions {
  tripId: string;
  allowMissingItems?: boolean;
}

export interface ClosureResult {
  success: boolean;
  hasMissingItems: boolean;
  missingItemsCount: number;
  closedAt: string;
}
