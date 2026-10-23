@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ANDROID_HOME=C:\Users\User\AppData\Local\Android\Sdk"
cd /d "D:\Elbas\Code Learn\Tripory\android"
call gradlew.bat assembleRelease
