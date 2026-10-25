#!/usr/bin/env bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "========================================================"
echo "  Memulai Tripory Android Emulator & Aplikasi (macOS)  "
echo "========================================================"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"

AVD_NAME="Pixel_4"

# 1. Cek apakah emulator sudah berjalan
if ! adb devices | grep -q "emulator"; then
  echo "[1/4] Menjalankan AVD $AVD_NAME di layar..."
  nohup "$ANDROID_HOME/emulator/emulator" -avd "$AVD_NAME" > /tmp/emulator.log 2>&1 &
  echo "Menunggu emulator terdeteksi..."
  adb wait-for-device
else
  echo "[1/4] Emulator sudah berjalan."
fi

# 2. Tunggu hingga boot selesai
echo "[2/4] Menunggu emulator selesai booting..."
while [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
  sleep 2
done

# 3. Reverse port Metro 8081
echo "[3/4] Mengonfigurasi port reverse 8081..."
adb reverse tcp:8081 tcp:8081 2>/dev/null || true

# 4. Buka aplikasi Tripory
echo "[4/4] Membuka aplikasi Tripory..."
adb shell monkey -p com.tripory.app -c android.intent.category.LAUNCHER 1

echo ""
echo "========================================================"
echo "  Tripory sekarang aktif di Emulator!                   "
echo "========================================================"
