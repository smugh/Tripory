# Tripory — Architecture Decision Records (ADR)

Dokumen ini mencatat keputusan arsitektural fundamental yang melandasi struktur kode dan alur data Tripory.

---

### ADR-001: Local-First / Offline-First
* **Status**: Diterima
* **Konteks**: Traveler sering berada pada area dengan konektivitas buruk (pegunungan, pesawat, pedalaman). Mengandalkan server cloud untuk operasi checklist harian menimbulkan latensi dan risiko kegagalan akses saat genting.
* **Keputusan**: Seluruh data inti perjalanan (Trip, Destinasi, Barang bawaan, Status pemakaian, dan Catatan momen) disimpan langsung di database SQLite lokal perangkat.
* **Konsekuensi**: Tidak ada layar "No Internet" yang memblokir akses ke checklist dan jadwal. Internet hanya menjadi dependensi opsional untuk peta atau backup.

---

### ADR-002: Pemisahan Status Perjalanan vs Status Barang
* **Status**: Diterima
* **Konteks**: Sering terjadi kebingungan saat status trip dicampuradukkan dengan status checklist. Misalnya, apakah sebuah barang berstatus "used" secara permanen di inventaris global atau hanya pada trip tertentu?
* **Keputusan**:
  - **Status Perjalanan (Trip Status)**: `draft` -> `preparing` -> `ready` -> `ongoing` -> `completed`.
  - **Inventaris Global (Personal Item)**: Objek persisten milik pengguna (`name`, `category`, `quantity`, `notes`).
  - **Status Barang dalam Trip (Trip Item)**: `planned` -> `packed` -> `available` -> `used` -> `returned` -> `missing`.
* **Konsekuensi**: Barang yang sama dapat dipakai di berbagai perjalanan tanpa duplikasi data, dan riwayat pemakaian dapat dilacak secara bersih.

---

### ADR-003: Skenario "Planned vs Actual" (Kasus Baju C)
* **Status**: Diterima
* **Konteks**: Baju C semula direncanakan untuk Destinasi 3, tetapi pada hari kedua ternyata dikenakan di Destinasi 2 karena cuaca berubah.
* **Keputusan**: Menggunakan entitas relasional `destination_usages` yang mencatat kejadian pemakaian nyata di destinasi tertentu.
* **Konsekuensi**: Sistem secara dinamis memperbarui status ketersediaan barang untuk destinasi berikutnya tanpa merusak rencana awal.

---

### ADR-004: SQLite + Drizzle ORM
* **Status**: Diterima
* **Konteks**: Dibutuhkan persistensi relasional lokal dengan type-safety tinggi, query performan, serta kemampuan migrasi skema yang aman.
* **Keputusan**: Menggunakan `expo-sqlite` dengan `drizzle-orm` (driver SQLite).
* **Konsekuensi**: Skema didefinisikan secara deklaratif di TypeScript; query terlindungi dari error runtime tipe; dan migrasi dijalankan secara idempoten saat startup.

---

### ADR-005: Media / Foto di Luar SQLite
* **Status**: Diterima
* **Konteks**: Menyimpan binary gambar resolusi tinggi langsung di dalam SQLite sebagai BLOB memperlambat read/write, memperbesar ukuran database secara drastis, dan menyulitkan backup bertahap.
* **Keputusan**: File gambar disimpan pada filesystem perangkat (`expo-file-system`) dalam direktori aplikasi khusus. SQLite hanya menyimpan path relatif dan metadata.
* **Konsekuensi**: Performa query database tetap stabil dan cepat (target p95 ≤ 2 detik).

---

### ADR-006: Penutupan Trip Toleran Terhadap Barang Hilang
* **Status**: Diterima
* **Konteks**: Pada akhir perjalanan saat return check, pengguna mungkin kehilangan barang. Sistem tidak boleh memblokir pengguna untuk menyelesaikan/menutup trip hanya karena ada barang yang belum ditemukan.
* **Keputusan**: Trip dapat ditutup kapan saja oleh pengguna. Jika ada barang yang belum ditandai `returned`, sistem menandainya sebagai `missing` dan menyimpannya di arsip trip dengan peringatan yang jelas.
* **Konsekuensi**: Pengalaman penutupan perjalanan tidak kaku, dan pengguna memiliki rekam jejak barang yang hilang untuk evaluasi perjalanan berikutnya.

---

### ADR-007: Tanpa Backend Kustom pada MVP
* **Status**: Diterima
* **Konteks**: Mengoperasikan server backend (NestJS/PostgreSQL/Redis) sebelum validasi pasar menambah kompleksitas devops tanpa memberikan nilai tambah langsung bagi traveler offline.
* **Keputusan**: Seluruh fungsionalitas MVP berjalan 100% lokal di perangkat. Layanan eksternal (Google Drive untuk backup, Google Maps/Mapbox untuk peta) diakses melalui antarmuka *adapter* di pinggir sistem.
