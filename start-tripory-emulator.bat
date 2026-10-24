@echo off
title Tripory Mobile Runner
cd /d "%~dp0"
echo ========================================================
echo   Memulai Tripory Android Emulator ^& Membuka Aplikasi
echo ========================================================

set ANDROID_HOME=C:\Users\User\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\emulator;%ANDROID_HOME%\platform-tools;%PATH%

echo [1/4] Menjalankan AVD Tripory_Emulator di Layar Utama Desktop...
start "" "%ANDROID_HOME%\emulator\emulator.exe" -avd Tripory_Emulator

echo [2/4] Menunggu emulator online dan selesai booting...
adb wait-for-device
:waitboot
for /f "tokens=*" %%a in ('adb shell getprop sys.boot_completed 2^>nul') do set BOOT=%%a
if not "%BOOT%"=="1" (
    timeout /t 2 /nobreak >nul
    goto waitboot
)

echo [3/4] Mengonfigurasi port reverse 8081...
adb reverse tcp:8081 tcp:8081 2>nul

echo [4/4] Membuka aplikasi Tripory di Emulator...
adb shell monkey -p com.tripory.app -c android.intent.category.LAUNCHER 1

echo.
echo ========================================================
echo   Aplikasi Tripory sekarang aktif di Emulator!
echo ========================================================
