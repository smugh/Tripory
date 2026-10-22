/**
 * Domain: Itinerary / Destinasi
 */

export interface ItineraryDestination {
  id: string;
  tripId: string;
  name: string;
  dayNumber: number;
  orderIndex: number;
  plannedTime?: string | null;
  activity?: string | null;
  locationLabel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
}

export interface AddDestinationInput {
  tripId: string;
  name: string;
  dayNumber: number;
  orderIndex?: number;
  plannedTime?: string;
  activity?: string;
  locationLabel?: string;
}
