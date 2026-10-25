#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$PATH"

mkdir -p "$DIR/release"

echo "========================================================"
echo "           Building Tripory APK v1.0.3                 "
echo "========================================================"

cd "$DIR/android"
./gradlew assembleRelease

APK_SOURCE="$DIR/android/app/build/outputs/apk/release/app-release.apk"
APK_TARGET="$DIR/release/Tripory-v1.0.3.apk"

if [ -f "$APK_SOURCE" ]; then
  cp "$APK_SOURCE" "$APK_TARGET"
  echo "========================================================"
  echo "Build SUKSES!"
  echo "APK tersimpan di: $APK_TARGET"
  echo "========================================================"
else
  echo "Error: File APK tidak ditemukan di $APK_SOURCE"
  exit 1
fi
