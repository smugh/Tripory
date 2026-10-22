/**
 * Domain: Actual Usage
 * Memisahkan pemakaian nyata di destinasi dari apa yang semula direncanakan.
 */

export interface ActualUsageRecord {
  id: string;
  destinationId: string;
  tripItemId: string;
  usedAt: string;
  notes?: string | null;
}

export interface RecordUsageInput {
  destinationId: string;
  tripItemId: string;
  notes?: string;
}
