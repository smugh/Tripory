import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'expo-router';
import { tripRepository } from '@/db/repositories/trip.repository';
import { TripRecord } from '@/db/schema/trips';
import { logger } from '@/core/utils';

export function useTrips(isDatabaseReady: boolean) {
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  const fetchTrips = useCallback(async () => {
    if (!isDatabaseReady) return;
    try {
      setIsLoading(true);
      const data = await tripRepository.getAll();
      setTrips(data);
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
    isLoading,
    refreshTrips: fetchTrips,
  };
}
