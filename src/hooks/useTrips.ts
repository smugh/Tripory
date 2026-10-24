import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'expo-router';
import { tripRepository } from '@/db/repositories/trip.repository';
import { TripRecord } from '@/db/schema/trips';
import { logger } from '@/core/utils';

export function useTrips(isDatabaseReady: boolean) {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  const fetchTrips = useCallback(async () => {
    if (!isDatabaseReady) return;
    try {
      setIsLoading(true);
      const [data, removed] = await Promise.all([tripRepository.getAll(), tripRepository.getPlanningRemovalIds()]);
      setTrips(data);
      setRemovedIds(removed);
    } catch (err) {
      logger.error('Gagal mengambil daftar trip', {
        category: 'trip',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, [isDatabaseReady]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips, pathname]);

  return {
    trips,
    planningTrips: trips.filter((trip) => !removedIds.includes(trip.id)),
    isLoading,
    refreshTrips: fetchTrips,
  };
}
