import { MomentEntity, CreateMomentInput } from './types';
import { momentRepository } from '@/db/repositories/moment.repository';

export const momentService = {
  async getTripMoments(tripId: string): Promise<MomentEntity[]> {
    return momentRepository.getByTripId(tripId);
  },

  async addMoment(input: CreateMomentInput): Promise<MomentEntity> {
    if (!input.photoPath.trim()) {
      throw new Error('Path foto harus disertakan untuk menyimpan momen.');
    }

    const now = new Date().toISOString();
    return momentRepository.create({
      tripId: input.tripId,
      destinationId: input.destinationId ?? null,
      caption: input.caption?.trim() ?? null,
      photoPath: input.photoPath,
      locationName: input.locationName?.trim() ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      capturedAt: now,
    });
  },

  async deleteMoment(id: string): Promise<void> {
    return momentRepository.delete(id);
  },
};
