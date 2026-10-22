# Panduan Build EAS (Android APK/AAB & iOS IPA)

Dokumen ini menjelaskan alur pembuatan artefak instalasi untuk platform **Android** dan **iOS** menggunakan **Expo Application Services (EAS Build)**.

---

## Profil Build di `eas.json`

Tripory mengonfigurasi tiga profil utama:

1. **`development`**:
   - Membangun *Expo Development Client* yang memungkinkan pengujian kode native langsung di perangkat atau simulator tanpa memuat seluruh bundel produksi.
   - Android: menghasilkan APK debug.
   - iOS: menghasilkan simulator build (`"simulator": true`).

2. **`preview` (Internal Testing)**:
   - Digunakan untuk pengujian oleh tim internal sebelum rilis publik.
   - **Android**: Dikonfigurasi menghasilkan **APK** (`"buildType": "apk"`) agar penguji dapat mengunduh dan memasang langsung di perangkat Android tanpa melalui Google Play Console.
   - **iOS**: Menghasilkan paket instalasi **IPA** dengan penandatanganan Ad-Hoc / Internal distribution.

3. **`production` (Store Release)**:
   - Digunakan untuk distribusi publik ke toko aplikasi resmi.
   - **Android**: Menghasilkan **AAB (Android App Bundle)** (`"buildType": "app-bundle"`) sesuai standar Google Play Store.
   - **iOS**: Menghasilkan **IPA bertanda tangan App Store** (`"distribution": "store"`) untuk diunggah ke TestFlight dan App Store Connect.

---

## Prasyarat Wajib untuk Build iOS & Penandatanganan (Signing)

> [!IMPORTANT]
> **Catatan Penting Mengenai Build iOS:**
> Berbeda dengan Android di mana file APK dapat dipasang langsung pada sembarang perangkat dengan mengaktifkan opsi "Install Unknown Apps", **ekosistem iOS tidak mengizinkan pemasangan sembarang file IPA secara bebas**.
> 
> File `.ipa` **TIDAK BISA** dibangun maupun dipasang pada iPhone nyata tanpa akun Apple Developer berbayar dan sertifikat penandatanganan kriptografis yang valid dari Apple.

### Prasyarat Akun & Kredensial Apple:

1. **Apple Developer Program ($99 USD / tahun)**:
   - Wajib memiliki akun aktif di [developer.apple.com](https://developer.apple.com).
   - Akun gratis (Personal Team) hanya dapat menjalankan penandatanganan sementara melalui kabel USB di Xcode lokal pada satu mesin Mac, dan tidak didukung oleh remote EAS cloud builder untuk distribusi IPA.

2. **Sertifikat Distribusi (Distribution Certificate / `.p12`)**:
   - Sertifikat kriptografi yang memvalidasi identitas pengembang atau organisasi Anda.
   - EAS CLI dapat membuatkan dan mengelola sertifikat ini secara otomatis jika Anda login dengan kredensial Apple saat menjalankan `eas build`.

3. **Provisioning Profile**:
   - Menghubungkan App ID (`bundleIdentifier`: `com.tripory.app`), sertifikat distribusi, serta perangkat yang diizinkan:
     - **Ad-Hoc Provisioning Profile**: Memerlukan pendaftaran nomor UDID unik dari setiap perangkat tester iPhone (maksimum 100 perangkat per tahun).
     - **App Store / TestFlight Provisioning Profile**: Tidak memerlukan pendaftaran UDID perangkat tester individu; distribusi dilakukan terpusat melalui aplikasi Apple TestFlight.

4. **App Store Connect API Key / Kredensial**:
   - Digunakan oleh EAS untuk melakukan upload otomatis ke TestFlight atau memproses penandatanganan cloud.

---

## Perintah Eksekusi Build

### 1. Inisialisasi & Login EAS
Pastikan Anda sudah menginstal EAS CLI secara global:
```bash
npm install -g eas-cli
eas login
eas project:init
```

### 2. Build Android

- **Membuat APK untuk Pengujian Internal:**
  ```bash
  eas build --platform android --profile preview
  ```
  *Hasil: File `.apk` yang langsung dapat di-sideload ke ponsel Android tester.*

- **Membuat AAB untuk Google Play Store:**
  ```bash
  eas build --platform android --profile production
  ```
  *Hasil: File `.aab` yang siap diunggah ke Google Play Console Track Production/Internal.*

---

### 3. Build iOS

- **Membuat Simulator Build (Pengujian di Mac lokal tanpa akun berbayar):**
  ```bash
  eas build --platform ios --profile development
  ```
  *Hasil: File `.tar.gz` yang dapat diseret langsung ke iOS Simulator di macOS.*

- **Membuat IPA untuk TestFlight / App Store (Memerlukan Apple Developer Program):**
  ```bash
  eas build --platform ios --profile production
  ```
  *Hasil: File `.ipa` bertanda tangan resmi yang dikirim ke App Store Connect.*

- **Opsi Pengiriman Otomatis ke TestFlight:**
  ```bash
  eas build --platform ios --profile production --auto-submit
  ```

---

## Verifikasi Kredensial
Untuk memeriksa status sertifikat dan profil penandatanganan yang tersimpan di server EAS:
```bash
eas credentials
```
EAS akan menampilkan status Apple Distribution Certificate, Push Notification Keys, dan Provisioning Profiles yang terkait dengan `com.tripory.app`.
