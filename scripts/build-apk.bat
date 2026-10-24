@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ANDROID_HOME=C:\Users\User\AppData\Local\Android\Sdk"
cd /d "D:\Elbas\Code Learn\Tripory\android"
call gradlew.bat assembleRelease
if %ERRORLEVEL% EQU 0 (
    copy /y "D:\Elbas\Code Learn\Tripory\android\app\build\outputs\apk\release\app-release.apk" "D:\Elbas\Code Learn\Tripory\release\Tripory-v1.0.2.apk"
)
