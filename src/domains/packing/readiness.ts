import { TripItemEntity, PackingSummary } from './types';

/**
 * Logika perhitungan Kesiapan Barang (Readiness Model)
 * Mengikuti aturan PRD Section 18:
 * "Jangan menjadikan '92% ready' sebagai satu-satunya informasi.
 * 'Ready, tetapi charger belum packed' lebih actionable daripada angka presisi yang menyembunyikan blocker."
 */
export function computeReadiness(items: TripItemEntity[]): PackingSummary {
  const totalItems = items.length;
  if (totalItems === 0) {
    return {
      totalItems: 0,
      packedCount: 0,
      percentage: 0,
      criticalBlockers: [],
      isReadyForDeparture: false,
      statusLabel: 'Belum ada barang terdaftar',
    };
  }

  const packedItems = items.filter((i) => i.state !== 'planned');
  const packedCount = packedItems.length;
  const percentage = Math.round((packedCount / totalItems) * 100);

  // Blocker kritis: barang must_have yang statusnya masih 'planned'
  const criticalBlockers = items.filter((i) => i.priority === 'must_have' && i.state === 'planned');
  const isReadyForDeparture = criticalBlockers.length === 0;

  let statusLabel = 'Siap Berangkat';
  if (criticalBlockers.length > 0) {
    statusLabel = `${criticalBlockers.length} barang penting belum disiapkan`;
  } else if (packedCount < totalItems) {
    statusLabel = 'Barang utama siap, barang opsional masih tersisa';
  }

  return {
    totalItems,
    packedCount,
    percentage,
    criticalBlockers,
    isReadyForDeparture,
    statusLabel,
  };
}
