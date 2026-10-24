# Tripory — Mobile Travel Companion

Tripory adalah aplikasi mobile (*cross-platform* Android & iOS) yang membantu orang yang suka bepergian dan berpindah-pindah mengelola siklus perjalanan secara utuh: mulai dari perencanaan destinasi, inventaris barang bawaan, pemantauan barang saat digunakan, perekaman momen kontekstual, hingga *return check* dan penutupan perjalanan.

Aplikasi ini dibangun dengan arsitektur **Local-First (Offline-First)** — seluruh data perjalanan disimpan dan dapat dikelola langsung di perangkat tanpa membutuhkan koneksi internet maupun server backend kustom pada tahap MVP.

---

## 🛠️ Stack Teknologi

- **Framework**: React Native + Expo (Expo Router)
- **Bahasa**: TypeScript (Strict mode)
- **Database Lokal**: SQLite (`expo-sqlite`)
- **ORM & Migrasi**: Drizzle ORM
- **State UI Sementara**: Zustand (hanya untuk state antarmuka sementara, bukan database)
- **Penyimpanan Media**: Filesystem lokal perangkat (`expo-file-system`)
- **Cloud Build Pipeline**: EAS Build (Expo Application Services)

---

## 📋 Prasyarat Development

Sebelum memulai, pastikan perangkat kerja Anda telah terpasang:

1. **Node.js**: Versi LTS (>= v18 atau v20+)
2. **NPM**: Versi 9+ atau versi yang disertakan dengan Node
3. **Expo Go atau Development Client**:
   - Untuk Android: Pasang aplikasi **Expo Go** dari Google Play Store atau gunakan Android Emulator di Android Studio.
   - Untuk iOS: Pasang aplikasi **Expo Go** dari App Store atau gunakan Xcode Simulator di macOS.
4. **EAS CLI** (opsional untuk build artefak):
   ```bash
   npm install -g eas-cli
   ```

---

## 🚀 Cara Instalasi

1. **Clone atau buka direktori proyek**:
   ```bash
   cd Tripory
   ```

2. **Instal seluruh dependensi**:
   ```bash
   npm install
   ```

3. **Salin konfigurasi environment**:
   ```bash
   cp .env.example .env
   ```
   *(Secara bawaan file `.env` telah dikonfigurasi untuk lokal dan tidak membutuhkan API secret apa pun untuk menjalankan fitur inti).*

---

## 📱 Cara Menjalankan Proyek

Jalankan perintah start Metro bundler:
```bash
npm run start
```

Pilihan eksekusi cepat:
- **Android**: Tekan tombol `a` di terminal atau jalankan `npm run android`
- **iOS**: Tekan tombol `i` di terminal atau jalankan `npm run ios` *(memerlukan macOS dengan Xcode)*
- **Web**: Tekan tombol `w` di terminal atau jalankan `npm run web`

### Android lewat Wireless Debugging (tanpa kabel)

Pastikan laptop dan ponsel Android berada di jaringan Wi-Fi yang sama. Di ponsel, buka **Developer options → Wireless debugging**, aktifkan fiturnya, lalu pilih **Pair device with pairing code**. Jalankan perintah berikut di terminal dan masukkan kode pairing yang tampil di ponsel:

```bash
adb pair IP_PONSEL:PORT_PAIRING
```

Setelah pairing berhasil, kembali ke halaman **Wireless debugging** utama dan gunakan alamat serta port yang tampil di sana (port ini berbeda dari port pairing):

```bash
adb connect IP_PONSEL:PORT_DEBUG
adb devices
```

Pastikan perangkat muncul dengan status `device`, lalu mulai Metro dalam mode LAN:

```bash
npm run start:lan
```

Untuk Expo Go, scan QR code dari terminal dengan Expo Go di ponsel. Untuk memasang development build native lewat ADB, jalankan `npm run android` setelah koneksi ADB aktif. Jika ponsel dan laptop ada di jaringan berbeda atau Wi-Fi memblokir koneksi antarperangkat, gunakan hotspot yang sama atau `npx expo start --tunnel` untuk Expo Go. Wireless Debugging tersedia di Android 11 ke atas; pada versi lebih lama, sambungkan USB sekali lalu jalankan `adb tcpip 5555` dan `adb connect IP_PONSEL:5555`.

---

## 💾 Cara Menjalankan Migrasi Database

Tripory dilengkapi sistem migrasi **idempoten otomatis** yang dijalankan pada saat aplikasi pertama kali dibuka (`src/db/migrations/migrator.ts`). Anda tidak perlu menjalankan perintah CLI terpisah untuk menggunakan aplikasi.

Bila Anda menambahkan entitas baru di `src/db/schema/`:
1. Buat skema tabel baru di `src/db/schema/`.
2. Generate file migrasi SQL baru menggunakan Drizzle Kit:
   ```bash
   npm run db:generate
   ```
3. Daftarkan langkah migrasi baru ke dalam array `MIGRATIONS` di `src/db/migrations/migrator.ts`.

---

## 📦 Panduan Build Android & iOS (EAS Build)

Proyek ini telah dikonfigurasi melalui `eas.json` untuk menghasilkan build yang siap didistribusikan:

### 1. Build Android

- **Membuat APK (Internal Testing / Sideloading langsung ke perangkat):**
  ```bash
  eas build --platform android --profile preview
  ```
- **Membuat AAB (Distribusi resmi ke Google Play Store):**
  ```bash
  eas build --platform android --profile production
  ```

### 2. Build iOS

- **Membuat Simulator Build (Pengujian lokal di macOS):**
  ```bash
  eas build --platform ios --profile development
  ```
- **Membuat IPA (Distribusi resmi melalui TestFlight / App Store):**
  ```bash
  eas build --platform ios --profile production
  ```

---

## ⚠️ Catatan Kredensial & Signing untuk Build iOS

> [!WARNING]
> **Penting untuk Dipahami:**
> File instalasi iOS (`.ipa`) **TIDAK BISA** dibangun untuk perangkat fisik maupun dipasang tanpa proses penandatanganan kriptografis resmi dari Apple.

Untuk menghasilkan build iOS yang dapat dipasang di iPhone:
1. Anda wajib memiliki keanggotaan aktif di **Apple Developer Program ($99 USD/tahun)**.
2. Saat pertama kali menjalankan `eas build --platform ios`, EAS CLI akan meminta kredensial akun Apple Anda untuk membuatkan:
   - **Distribution Certificate (`.p12`)**
   - **Provisioning Profile** yang terdaftar dengan App ID (`com.tripory.app`).
3. Untuk pengujian internal perangkat fisik non-TestFlight (Ad-Hoc), nomor unik **UDID** setiap perangkat tester wajib didaftarkan di Apple Developer Portal sebelum paket `.ipa` dibuat.
4. Metode pengujian iOS yang paling direkomendasikan adalah menggunakan **TestFlight**, di mana EAS Build akan otomatis mengunggah file `.ipa` ke App Store Connect.

---

## 📂 Struktur Direktori Proyek

```text
Tripory/
├── app/                        # Rute dan layar Expo Router
│   ├── (tabs)/                 # Bottom Tab Navigation (Home, Trips, Items, More)
│   ├── trip/                   # Layar detail workspace trip & buat trip baru
│   └── _layout.tsx             # Root layout, stack, & inisialisasi SQLite
├── src/
│   ├── components/             # Komponen presentasi UI bersama
│   │   └── ui/                 # Button, Card, Badge, Input, Typography, EmptyState
│   ├── core/                   # Fondasi desain token, konstanta, & utilitas
│   │   ├── constants/          # Konfigurasi aplikasi & rute
│   │   ├── theme/              # Token semantik (warna, spacing, radius, typography)
│   │   └── utils/              # Id generator, kalkulasi durasi, bounded logger
│   ├── db/                     # Lapisan persistensi data lokal
│   │   ├── schema/             # Drizzle ORM schema (trips, items, destinations, dll)
│   │   ├── migrations/         # DDL migration scripts & migrator otomatis
│   │   ├── repositories/       # Abstraksi CRUD untuk entitas database
│   │   └── client.ts           # Koneksi SQLite & Drizzle client
│   ├── domains/                # Logika bisnis inti per domain produk
│   │   ├── trip/               # Manajemen siklus perjalanan
│   │   ├── itinerary/          # Manajemen destinasi & urutan kronologis
│   │   ├── item/               # Inventaris barang personal persisten
│   │   ├── packing/            # Checklist bawaan & readiness blocker
│   │   ├── actual-usage/       # Pelacakan pemakaian nyata di destinasi (Skenario Baju C)
│   │   ├── moment/             # Catatan kenangan & referensi foto lokal
│   │   ├── return-check/       # Verifikasi kepulangan barang bawaan
│   │   └── trip-closure/       # Penutupan & pengarsipan trip (toleran missing items)
│   ├── hooks/                  # Reusable React hooks (useDatabase, useTrips)
│   ├── services/               # Layanan perangkat & adapter eksternal
│   │   ├── media/              # Pengelola penyimpanan foto di filesystem lokal
│   │   └── adapters/           # Boundary untuk GPS, Maps, & Backup di masa depan
│   ├── stores/                 # Zustand store HANYA untuk state UI sementara
│   └── types/                  # Definisi TypeScript bersama
├── assets/                     # Ikon, logo Tripory, font, dan gambar statis
├── docs/                       # Keputusan teknis (ADR), database, & panduan build
├── app.json                    # Konfigurasi aplikasi Expo (Android & iOS packages)
├── eas.json                    # Profil build EAS (development, preview, production)
├── tsconfig.json               # Konfigurasi TypeScript strict & alias path
└── package.json
```

---

## 🎨 Ringkasan Design System

Tripory menerapkan semantic design tokens berdasarkan panduan resmi:
- **Brand Navy**: `#071B4D` (Heading utama, tombol primer, header)
- **Brand Coral**: `#F56B5F` (Aksen emosional, tombol aksi cepat)
- **Tripory Blue**: `#1769B0` (Fokus kontrol, tautan eksplorasi)
- **Deep Blue**: `#0A2B65` (Status pressed / kedalaman)
- **Page Background**: `#F8FAFC` (Kanvas utama)
- **Target Sentuh Interaktif**: Minimal 44 × 44 px untuk kenyamanan satu tangan di perangkat mobile.
