import { TripEntity, TripStatus } from '../domains/trip/types';
import { ItineraryDestination } from '../domains/itinerary/types';
import { PersonalItem } from '../domains/item/types';
import { TripItemEntity, PackingState, ItemPriority } from '../domains/packing/types';
import { MomentEntity } from '../domains/moment/types';

export type {
  TripEntity,
  TripStatus,
  ItineraryDestination,
  PersonalItem,
  TripItemEntity,
  PackingState,
  ItemPriority,
  MomentEntity,
};

export interface AppInitializationState {
  isDatabaseReady: boolean;
  schemaVersion: number;
  error?: string | null;
  retry?: () => void;
}
