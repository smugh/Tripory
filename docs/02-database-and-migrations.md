# Database & Skema SQLite (Drizzle ORM)

Tripory menggunakan **SQLite lokal** melalui driver `expo-sqlite` dan dimodelkan secara terstruktur dengan **Drizzle ORM**.

## Skema Entitas Relasional

| Tabel | Tujuan | Kunci Utama / Relasi |
|---|---|---|
| `trips` | Identitas perjalanan, destinasi utama, rentang tanggal, status siklus, dan status arsip. | `id` (PK) |
| `destinations` | Titik singgah/itinerary berurutan per hari dalam suatu perjalanan. | `id` (PK), `trip_id` (FK -> trips.id ON DELETE CASCADE) |
| `items` | Inventaris personal persisten milik pengguna (pakaian, obat, elektronik). | `id` (PK) |
| `trip_items` | Penugasan (assignment) item ke trip tertentu, status packing, dan prioritas. | `id` (PK), `trip_id` (FK), `item_id` (FK), `planned_destination_id` (FK) |
| `destination_usages` | Rekam jejak pemakaian nyata barang di destinasi tertentu (Planned vs Actual). | `id` (PK), `destination_id` (FK), `trip_item_id` (FK) |
| `moments` | Catatan memori kontekstual (foto + catatan) yang terikat ke trip/destinasi. | `id` (PK), `trip_id` (FK), `destination_id` (FK) |
| `app_metadata` | Menyimpan versi skema aktif (`schema_version`) untuk eksekusi migrasi idempoten. | `key` (PK) |

## Alur Migrasi Database

1. **Otomatis Saat Aplikasi Dibuka**:
   File `src/db/migrations/migrator.ts` memeriksa tabel `app_metadata` untuk melihat `schema_version` saat ini. Jika terdapat langkah migrasi yang versinya lebih baru, migrasi DDL dieksekusi secara berurutan dalam satu sesi transaksi SQLite.

2. **Drizzle Kit (Development)**:
   Perintah:
   ```bash
   npm run db:generate
   ```
   Akan membaca seluruh skema di `src/db/schema/index.ts` dan menghasilkan artefak migrasi SQL baru di direktori `src/db/migrations/` bila ada perubahan skema.

3. **Integritas Relasional (Foreign Keys)**:
   Database Tripory selalu mengaktifkan pragma:
   ```sql
   PRAGMA foreign_keys = ON;
   PRAGMA journal_mode = WAL;
   ```
   Menghapus suatu `trip` akan secara otomatis membersihkan seluruh `destinations`, `trip_items`, `moments`, dan `destination_usages` yang terhubung (`ON DELETE CASCADE`).
