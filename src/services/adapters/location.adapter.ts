/**
 * Adapter Boundary: Location & GPS
 * Mengisolasi dependensi hardware/native dari domain inti aplikasi.
 */
import * as Location from 'expo-location';
import { logger } from '@/core/utils/logger';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface GeocodedAddress {
  label: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface LocationService {
  requestPermissions(): Promise<boolean>;
  getCurrentPosition(): Promise<GeoCoordinates | null>;
  reverseGeocode(coords: GeoCoordinates): Promise<GeocodedAddress | null>;
}

export class DefaultLocationService implements LocationService {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      const granted = status === 'granted';
      logger.info(`Izin lokasi: ${granted ? 'DIBERIKAN' : 'DITOLAK'}`, { category: 'location' });
      return granted;
    } catch (error) {
      logger.error('Gagal meminta izin lokasi GPS', {
        category: 'location',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async getCurrentPosition(): Promise<GeoCoordinates | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      // Coba last known position terlebih dahulu agar respons cepat
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          logger.info('Menggunakan posisi terakhir yang tersimpan di perangkat', { category: 'location' });
          return {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy,
          };
        }
      } catch {
        // Abaikan dan lanjutkan ke getCurrentPositionAsync
      }

      // Ambil posisi baru dengan akurasi balanced
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    } catch (error) {
      logger.error('Gagal mengambil koordinat lokasi saat ini', {
        category: 'location',
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async reverseGeocode(coords: GeoCoordinates): Promise<GeocodedAddress | null> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (results && results.length > 0) {
        const item = results[0];
        const parts = [item.name, item.district || item.subregion, item.city || item.region]
          .filter(Boolean);
        const label = parts.length > 0 ? parts.join(', ') : `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

        return {
          label,
          city: item.city,
          region: item.region,
          country: item.country,
        };
      }
      return {
        label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      };
    } catch (error) {
      logger.error('Gagal reverse geocode koordinat GPS', {
        category: 'location',
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
      };
    }
  }
}

export const locationService: LocationService = new DefaultLocationService();
