import { TranslationDictionary } from './en';

/**
 * Kamus Bahasa Indonesia
 */
export const id: TranslationDictionary = {
  // Brand
  tagline: 'Plan • Explore • Capture • Remember',

  // Navigasi Tabs
  tabs: {
    home: 'Beranda',
    trips: 'Perjalanan',
    create: 'Buat Trip',
    inventory: 'Inventaris',
    settings: 'Pengaturan',
    tripsHeader: 'Semua Perjalanan & Roadmap',
    inventoryHeader: 'Inventaris Pribadi',
    settingsHeader: 'Pengaturan & Sistem',
  },

  // Beranda
  home: {
    totalTrips: 'Total Trip',
    activeTrips: 'Aktif / Siap',
    completedTrips: 'Arsip Selesai',
    ongoingTripHeading: 'Perjalanan Sedang Berlangsung',
    upcomingTripHeading: 'Perjalanan Terdekat',
    statusOngoing: 'Dalam Perjalanan',
    statusReady: 'Siap Berangkat',
    statusPreparing: 'Persiapan',
    statusDraft: 'Rencana',
    openRoadmapBtn: 'Buka Roadmap & Checklist Perjalanan →',
    startPlanningTitle: 'Mulai Rencanakan Perjalanan',
    startPlanningDesc: 'Gunakan template kilat 1-sentuh di bawah untuk langsung membuat rute dan checklist starter.',
    albumTitle: 'Album Kenangan Perjalanan',
    photosBadge: '{count} Foto',
    onePhotoBadge: '1 Foto',
    emptyAlbumTitle: 'Belum Ada Foto di Album',
    emptyAlbumDesc: 'Abadikan foto atau pilih dari galeri saat perjalanan untuk memajang album kenangan di sini.',
  },

  // Pengaturan
  settings: {
    title: 'Pengaturan & Sistem',
    profileName: 'Penjelajah Tripory',
    profileRole: 'Akun Lokal • Privasi Offline-First',
    localBadge: 'Lokal',
    profileDesc: 'Data tersimpan di perangkat tanpa pelacakan cloud.',
    
    // Pencadangan Gmail
    gmailSection: 'Destinasi Pencadangan Gmail',
    gmailAccountLabel: 'Akun Gmail',
    gmailConnected: 'Terhubung',
    gmailNotSet: 'Belum Diatur',
    gmailPlaceholder: 'penjelajah@gmail.com',
    saveEmail: 'Simpan',
    editEmail: 'Ubah',
    lastBackup: 'Terakhir dicadangkan: {time}',
    neverBackedUp: 'Belum pernah dicadangkan',
    btnBackupNow: 'Cadangkan Data ke Gmail',
    btnRestoreData: 'Unduh / Pulihkan Data',
    backupSuccessTitle: 'Cadangan Siap',
    backupSuccessMsg: 'Data lokal berhasil diekstrak dan siap dikirim ke {email}.',
    restoreModalTitle: 'Pulihkan Data Perjalanan',
    restoreModalSubtitle: 'Pilih sumber berkas cadangan:',
    restoreFromEmail: 'Ambil dari Email (Gmail)',
    restoreFromEmailDesc: 'Pilih file tripory-backup.json dari unduhan Gmail',
    restoreFromLocal: 'Dari Penyimpanan Lokal',
    restoreFromLocalDesc: 'Pilih berkas cadangan dari dokumen perangkat',
    restoreSuccessTitle: 'Pemulihan Berhasil',
    restoreSuccessMsg: 'Berhasil memulihkan {trips} perjalanan, {destinations} destinasi, dan {items} barang.',
    restoreFailTitle: 'Pemulihan Gagal',
    restoreFailMsg: 'File yang dipilih bukan berkas cadangan valid Tripory.',
    cancel: 'Batal',

    // Bahasa
    languageSection: 'Bahasa & Wilayah',
    languageLabel: 'Bahasa Aplikasi',
    languageEn: 'English (Default)',
    languageId: 'Bahasa Indonesia',
    
    // Tampilan & Aksesibilitas
    appearanceSection: 'Tampilan & Aksesibilitas',
    darkMode: 'Mode Gelap',
    darkModeDesc: 'Tema malam nyaman untuk cahaya redup',
    haptics: 'Getaran Haptik',
    hapticsDesc: 'Umpan balik getar saat mencentang koper',
    contrast: 'Kontras Tinggi',
    contrastDesc: 'Keterbacaan optimal di bawah sinar matahari',
    
    // Info Perangkat
    deviceSection: 'Informasi Perangkat & Sistem',
    os: 'Sistem Operasi',
    database: 'Basis Data Lokal',
    databaseVal: 'SQLite v2 + Drizzle',
    mediaStorage: 'Penyimpanan Foto & Media',
    operationMode: 'Mode Operasi',
    offlineOnly: '100% Offline (No Cloud)',
    
    // Data & Privasi
    dataSection: 'Data & Privasi Lokal',
    securityBackup: 'Informasi Keamanan & Backup',
    securityBackupDesc: 'Data tersimpan aman di file tripory.db lokal',
    exportSummary: 'Ekspor Ringkasan Catatan',
    exportSummaryDesc: 'Simpan ringkasan arsip perjalanan yang telah selesai',
    
    // Tentang
    aboutSection: 'Tentang Tripory',
    aboutSubtitle: 'Versi {version} (Build MVP EAS)',
    aboutText: 'Tripory adalah pendamping perjalanan mobile lokal-pertama untuk Android dan iOS. Didesain untuk memudahkan persiapan, navigasi roadmap, dan kenangan foto Anda.',
    
    // Dialogs
    backupAlertTitle: 'Cadangkan Data Offline',
    backupAlertDesc: 'Seluruh data perjalanan, rute destinasi, dan foto momen Anda tersimpan di basis data lokal perangkat SQLite (tripory.db). Tidak ada data yang dikirim ke cloud demi privasi maksimal Anda.',
    exportAlertTitle: 'Ekspor Ringkasan Trip',
    exportAlertDesc: 'Fitur ekspor catatan perjalanan lokal siap diarsipkan ke format dokumen lokal perangkat Anda.',
    ok: 'OK',
    understood: 'Mengerti',
  },

  // Detail Perjalanan & Workspace
  trip: {
    details: 'Detail Perjalanan',
    back: 'Kembali',
    tabDestinations: 'Destinasi',
    tabPacking: 'Kemas',
    tabMoments: 'Momen',
    roadmapProgress: 'Roadmap Perjalanan',
    stagePrefix: 'Tahap {current} dari {total}',
    activeStagePrefix: 'Tahap Aktif: {stage}',
    
    // Co-Pilot Guide
    copilotHeading: 'PANDUAN LANGKAH BERIKUTNYA',
    copilotPack: 'Kemas {count} barang sebelum berangkat',
    copilotReady: 'Persiapan lengkap! Siap memulai perjalanan?',
    copilotOngoing: 'Perjalanan sedang aktif. Jelajahi roadmap & abadikan momen',
    copilotCompleted: 'Perjalanan siap ditutup dan diarsipkan',
    openChecklistBtn: 'Buka Checklist Kemas',
    markAllPackedBtn: '✓ Centang Semua Siap',
    startTripBtn: '🚀 Mulai Perjalanan (Jelajah Sekarang)',
    addMomentPhotoBtn: '📸 Tambah Foto Momen',
    finishTripBtn: '📦 Selesai & Cek Kepulangan',
    
    // Momen
    memoriesHeading: 'Kenangan Perjalanan',
    memoriesSubtitle: 'Foto & catatan tersimpan offline secara lokal di perangkat Anda.',
    addMemoryTitle: 'Abadikan Foto & Catatan Momen',
    cameraBtn: 'Ambil Kamera',
    cameraDesc: 'Foto langsung',
    galleryBtn: 'Pilih Galeri',
    galleryDesc: 'Buka foto tersimpan',
    captionLabel: 'Cerita atau Catatan Momen',
    captionPlaceholder: 'Contoh: Menikmati udara sejuk kebun teh & pemandangan...',
    locationTagLabel: 'Tag Lokasi Momen',
    locationTagPlaceholder: 'Nama tempat / daerah...',
    gpsBtn: 'GPS',
    saveMomentBtn: '💾 Simpan Kenangan Lokal',
    galleryTitle: 'Galeri Kenangan ({count})',
    noMemoriesYet: 'Belum ada kenangan tersimpan',
    noMemoriesDesc: 'Gunakan tombol kamera atau galeri di atas untuk mulai mengabadikan momen perjalanan Anda secara offline.',
    deleteMomentConfirmTitle: 'Hapus Momen',
    deleteMomentConfirmDesc: 'Apakah Anda yakin ingin menghapus kenangan momen ini?',
    cancel: 'Batal',
    delete: 'Hapus',
    
    // Kemas / Packing
    readinessTitle: 'Kesiapan Barang Bawaan',
    readinessSubtitle: '{packed} dari {total} Barang Siap',
    unpackedNotice: '{count} barang penting belum disiapkan',
    allPackedNotice: 'Semua barang sudah siap di koper!',
    packingProgress: 'Progres Packing Koper',
    blockersTitle: 'Blocker Kritis ({count} barang wajib belum siap)',
    quickBundlesTitle: 'Tambah Paket Barang Cepat (1-Tap):',
    filterAll: 'Semua ({count})',
    filterUnpacked: 'Perlu Disiapkan ({count})',
    filterPacked: 'Sudah Dikemas ({count})',
    manualAddTitle: 'Tambah Barang Manual',
    manualAddPlaceholder: 'Ketik nama barang lalu tekan tombol di bawah...',
    addChecklistBtn: '+ Tambahkan ke Checklist',
    
    // Destinasi
    destProgressTitle: 'Progres Kunjungan Destinasi',
    destProgressSubtitle: '{visited} dari {total} Titik Selesai',
    visitedPercent: '{percent}% Tercapai',
    markVisitedBtn: 'Tandai Dikunjungi',
    visitedBtn: 'Dikunjungi ✓',
    activeStopBadge: 'Titik Aktif',
    dayPrefix: 'HARI {day}',
    addDestinationBtn: '+ Tambah Titik Kunjungan',
  },

  // Siklus
  stages: {
    plan: 'Rencana',
    pack: 'Kemas',
    explore: 'Jelajah',
    return: 'Cek Balik',
    completed: 'Selesai',
  },
};
