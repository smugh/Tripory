import { TripItemEntity, PackingSummary } from './types';

/**
 * Logika perhitungan Kesiapan Barang (Readiness Model)
 * Mengikuti aturan PRD Section 18:
 * "Jangan menjadikan '92% ready' sebagai satu-satunya informasi.
 * 'Ready, tetapi charger belum packed' lebih actionable daripada angka presisi yang menyembunyikan blocker."
 */
export function computeReadiness(
  items: TripItemEntity[],
  language: 'en' | 'id' = 'en'
): PackingSummary {
  const hasGroupsWithChildren = items.some((i) => i.isGroup === 1 && items.some((c) => c.parentId === i.id));
  const countableItems = hasGroupsWithChildren
    ? items.filter((i) => i.isGroup !== 1)
    : items;
  const totalItems = countableItems.length;
  if (totalItems === 0) {
    return {
      totalItems: 0,
      packedCount: 0,
      percentage: 0,
      criticalBlockers: [],
      isReadyForDeparture: false,
      statusLabel: language === 'en' ? 'No registered items' : 'Belum ada barang terdaftar',
    };
  }

  const packedItems = countableItems.filter((i) => i.state !== 'planned' && i.state !== 'missing');
  const packedCount = packedItems.length;
  const percentage = Math.round((packedCount / totalItems) * 100);

  // Blocker kritis: barang must_have yang statusnya masih 'planned'
  const criticalBlockers = countableItems.filter((i) => i.priority === 'must_have' && (i.state === 'planned' || i.state === 'missing'));
  const isReadyForDeparture = criticalBlockers.length === 0;

  let statusLabel = language === 'en' ? 'Ready to Go' : 'Siap Berangkat';
  if (criticalBlockers.length > 0) {
    statusLabel =
      language === 'en'
        ? `${criticalBlockers.length} essential ${criticalBlockers.length === 1 ? 'item needs' : 'items need'} attention (unpacked or missing)`
        : `${criticalBlockers.length} barang penting perlu diperiksa (belum dipacking atau hilang)`;
  } else if (packedCount < totalItems) {
    statusLabel =
      language === 'en'
        ? 'Core items ready, optional items remain'
        : 'Barang utama siap, barang opsional masih tersisa';
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
