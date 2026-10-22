/**
 * Domain: Return Check
 * Verifikasi kepulangan barang saat perjalanan selesai
 */

import { TripItemEntity } from '../packing/types';

export interface ReturnSummary {
  totalItems: number;
  accountedCount: number;
  missingCount: number;
  allAccounted: boolean;
  missingItems: TripItemEntity[];
}
