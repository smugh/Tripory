import { TripEntity, TripStatus, CreateTripInput } from './types';
import { tripRepository } from '@/db/repositories/trip.repository';
import { calculateDurationDays } from '@/core/utils/date';
import { validateTripDates, canTransitionTripStatus } from './rules';

export const tripService = {
  validateTripDates(startDate: string, endDate: string) {
    return validateTripDates(startDate, endDate);
  },

  canTransitionStatus(from: TripStatus, to: TripStatus): boolean {
    return canTransitionTripStatus(from, to);
  },

  async createTrip(input: CreateTripInput): Promise<TripEntity> {
    const dateValidation = this.validateTripDates(input.startDate, input.endDate);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }

    const durationDays = calculateDurationDays(input.startDate, input.endDate);

    const record = await tripRepository.create({
      name: input.name.trim(),
      destination: input.destination.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      durationDays,
      status: 'preparing',
      notes: input.notes?.trim() ?? null,
      coverPhotoPath: null,
      isArchived: 0,
      hasMissingItems: 0,
    });

    return {
      ...record,
      isArchived: Boolean(record.isArchived),
      hasMissingItems: Boolean(record.hasMissingItems),
    };
  },

  async getActiveOrUpcomingTrip(): Promise<TripEntity | null> {
    const all = await tripRepository.getForPlanning();
    const active = all.find((t) => t.status === 'ongoing');
    if (active) {
      return {
        ...active,
        isArchived: Boolean(active.isArchived),
        hasMissingItems: Boolean(active.hasMissingItems),
      };
    }

    const upcoming = all.find((t) => t.status === 'ready' || t.status === 'preparing' || t.status === 'draft');
    if (upcoming) {
      return {
        ...upcoming,
        isArchived: Boolean(upcoming.isArchived),
        hasMissingItems: Boolean(upcoming.hasMissingItems),
      };
    }

    return null;
  },
};
