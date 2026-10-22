/**
 * Domain: Trip
 * Status perjalanan independen dari status item
 */

export type TripStatus = 'draft' | 'preparing' | 'ready' | 'ongoing' | 'completed';

export interface TripEntity {
  id: string;
  name: string;
  destination: string;
  startDate: string; // ISO YYYY-MM-DD
  endDate: string; // ISO YYYY-MM-DD
  durationDays: number;
  status: TripStatus;
  coverPhotoPath?: string | null;
  notes?: string | null;
  isArchived: boolean;
  hasMissingItems: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripInput {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes?: string;
}
