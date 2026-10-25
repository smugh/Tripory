/**
 * Tripory Domain & Readiness Verification Test
 * Memverifikasi logika bisnis inti, status perjalanan, kesiapan barang, dan penutupan trip
 */

import { calculateDurationDays, formatTripDurationLabel, formatDateRange } from '../src/core/utils/date';
import { validateTripDates, canTransitionTripStatus } from '../src/domains/trip/rules';
import { computeReadiness } from '../src/domains/packing/readiness';
import { calculateReturnSummary } from '../src/domains/return-check/calculator';
import { TripItemEntity } from '../src/domains/packing/types';

function runTests() {
  console.log('🧪 Memulai Verifikasi Logika Domain Tripory...\n');

  // Test 1: Hitungan durasi perjalanan (Studi kasus 3D2N Puncak sesuai PRD)
  const startDate = '2026-11-12';
  const endDate = '2026-11-14';
  const days = calculateDurationDays(startDate, endDate);
  const label = formatTripDurationLabel(startDate, endDate, 'id');
  const range = formatDateRange(startDate, endDate, 'id');

  console.log(`✓ Hitungan durasi: ${days} hari -> "${label}" (${range})`);
  if (days !== 3 || label !== '3 Hari 2 Malam') {
    throw new Error(`Durasi tidak sesuai: ${days} hari, label: ${label}`);
  }

  // Test 2: Validasi tanggal perjalanan (Tanggal pulang tidak boleh lebih awal dari keberangkatan)
  const invalidValidation = validateTripDates('2026-11-15', '2026-11-12');
  console.log(`✓ Validasi tanggal kepulangan tidak valid: ${!invalidValidation.isValid ? 'Lulus' : 'Gagal'}`);
  if (invalidValidation.isValid) {
    throw new Error('Validasi gagal mendeteksi tanggal tidak valid');
  }

  // Test 3: Transisi status perjalanan (Pemisahan status perjalanan dari status barang)
  const canStart = canTransitionTripStatus('preparing', 'ongoing');
  const invalidTransition = canTransitionTripStatus('completed', 'draft');
  console.log(`✓ Transisi status trip (preparing -> ongoing: ${canStart}, completed -> draft: ${!invalidTransition})`);
  if (!canStart || invalidTransition) {
    throw new Error('Logika transisi status trip gagal');
  }

  // Test 4: Model Kesiapan Barang (Readiness Model sesuai PRD)
  // Aturan: jangan menjadikan "92% ready" sebagai satu-satunya info.
  // Blocker kritis (must_have yang belum packed) harus terdeteksi secara eksplisit.
  const mockItems: TripItemEntity[] = [
    {
      id: 'item_1',
      tripId: 'trip_puncak',
      customName: 'Kamera Mirrorless',
      category: 'Electronics',
      state: 'packed',
      priority: 'must_have',
      quantity: 1,
      createdAt: '2026-10-22',
      updatedAt: '2026-10-22',
    },
    {
      id: 'item_2',
      tripId: 'trip_puncak',
      customName: 'Charger HP & Kabel',
      category: 'Electronics',
      state: 'planned', // Belum packed! (Critical Blocker)
      priority: 'must_have',
      quantity: 1,
      createdAt: '2026-10-22',
      updatedAt: '2026-10-22',
    },
    {
      id: 'item_3',
      tripId: 'trip_puncak',
      customName: 'Topi Santai',
      category: 'Clothing',
      state: 'packed',
      priority: 'optional',
      quantity: 1,
      createdAt: '2026-10-22',
      updatedAt: '2026-10-22',
    },
  ];

  const readiness = computeReadiness(mockItems);
  console.log(`✓ Kesiapan barang: ${readiness.percentage}% (${readiness.packedCount}/${readiness.totalItems})`);
  console.log(`✓ Status label kesiapan: "${readiness.statusLabel}"`);
  console.log(`✓ Blocker kritis terdeteksi: ${readiness.criticalBlockers.map((b) => b.customName).join(', ')}`);
  
  if (readiness.isReadyForDeparture === true) {
    throw new Error('Readiness model gagal mendeteksi must-have blocker (charger belum packed)!');
  }
  if (readiness.criticalBlockers.length !== 1 || readiness.criticalBlockers[0].customName !== 'Charger HP & Kabel') {
    throw new Error('Blocker kritis tidak terdaftar dengan tepat!');
  }

  // Test 5: Return Check & Penutupan Trip dengan Barang Hilang (Missing Items)
  // Aturan: trip dapat ditutup meskipun ada barang yang belum ditemukan,
  // dan dicatat sebagai barang hilang pada arsip trip.
  const returnSummary = calculateReturnSummary([
    { ...mockItems[0], state: 'returned' },
    { ...mockItems[1], state: 'missing' },
    { ...mockItems[2], state: 'returned' },
  ]);

  console.log(`✓ Return check summary: Accounted: ${returnSummary.accountedCount}, Missing: ${returnSummary.missingCount}`);
  if (returnSummary.allAccounted === true || returnSummary.missingCount !== 1) {
    throw new Error('Return check calculation error');
  }

  console.log('\n🎉 Seluruh verifikasi domain & aturan bisnis Tripory LULUS dengan sukses!');
}

runTests();
