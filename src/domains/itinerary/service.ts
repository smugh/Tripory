import { ItineraryDestination, AddDestinationInput } from './types';
import { destinationRepository } from '@/db/repositories/destination.repository';

export const itineraryService = {
  async getTripDestinations(tripId: string): Promise<ItineraryDestination[]> {
    const list = await destinationRepository.getByTripId(tripId);
    return list;
  },

  async addDestination(input: AddDestinationInput): Promise<ItineraryDestination> {
    if (!input.name.trim()) {
      throw new Error('Nama destinasi tidak boleh kosong.');
    }

    const currentList = await destinationRepository.getByTripId(input.tripId);
    const dayItems = currentList.filter((d) => d.dayNumber === input.dayNumber);
    const nextOrder = input.orderIndex ?? dayItems.length;

    const created = await destinationRepository.create({
      tripId: input.tripId,
      name: input.name.trim(),
      dayNumber: Math.max(1, input.dayNumber),
      orderIndex: nextOrder,
      plannedTime: input.plannedTime ?? null,
      activity: input.activity?.trim() ?? null,
      locationLabel: input.locationLabel?.trim() ?? null,
      latitude: null,
      longitude: null,
    });

    return created;
  },
};
