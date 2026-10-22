/**
 * Domain: Moment / Memory
 */

export interface MomentEntity {
  id: string;
  tripId: string;
  destinationId?: string | null;
  caption?: string | null;
  photoPath: string;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt: string;
  createdAt: string;
}

export interface CreateMomentInput {
  tripId: string;
  destinationId?: string;
  caption?: string;
  photoPath: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
}
