/**
 * Adapter Boundary: Maps & Places
 * Memastikan produk tidak terikat langsung ke vendor (Google Maps vs Mapbox vs Apple Maps).
 */

export interface PlaceResult {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
}

export interface MapService {
  searchPlaces(query: string): Promise<PlaceResult[]>;
  getPlaceDetails(placeId: string): Promise<PlaceResult | null>;
}

export class DefaultMapService implements MapService {
  async searchPlaces(_query: string): Promise<PlaceResult[]> {
    // Offline-first graceful fallback: mengembalikan array kosong saat offline atau belum dikonfigurasi
    return [];
  }

  async getPlaceDetails(_placeId: string): Promise<PlaceResult | null> {
    return null;
  }
}

export const mapService: MapService = new DefaultMapService();
