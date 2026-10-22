const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function makeJunction(junctionPath, targetPath) {
  if (fs.existsSync(targetPath) && !fs.existsSync(junctionPath)) {
    try {
      execSync(`cmd.exe /c mklink /J "${junctionPath}" "${targetPath}"`, { stdio: 'ignore' });
      console.log(`[patch-cmake] Created junction ${junctionPath} -> ${targetPath}`);
    } catch (e) {
      console.error('[patch-cmake] Failed to create junction:', e);
    }
  }
}

// 1. react-native-reanimated
const reanimatedDir = path.join(__dirname, '..', 'node_modules', 'react-native-reanimated');
const reanimatedAndroidDir = path.join(reanimatedDir, 'android');
const reanimatedCmake = path.join(reanimatedAndroidDir, 'CMakeLists.txt');
makeJunction(path.join(reanimatedAndroidDir, 'Common'), path.join(reanimatedDir, 'Common'));

if (fs.existsSync(reanimatedCmake)) {
  let content = fs.readFileSync(reanimatedCmake, 'utf8');
  if (content.includes('set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")')) {
    content = content.replace(
      'set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")',
      'set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/Common/cpp")'
    );
    content = content.replace(
      'set(NATIVEVIEW_DIR "${CMAKE_SOURCE_DIR}/../Common/NativeView")',
      'set(NATIVEVIEW_DIR "${CMAKE_SOURCE_DIR}/Common/NativeView")'
    );
    fs.writeFileSync(reanimatedCmake, content, 'utf8');
    console.log('[patch-cmake] Patched reanimated CMakeLists.txt.');
  }
}

// 1b. react-native-reanimated NativeView
const reanimatedNativeViewDir = path.join(reanimatedDir, 'Common', 'NativeView');
const reanimatedNativeViewCmake = path.join(reanimatedNativeViewDir, 'CMakeLists.txt');
const reanimatedCodegen = path.join(reanimatedAndroidDir, 'build', 'generated', 'source', 'codegen', 'jni');
makeJunction(path.join(reanimatedNativeViewDir, 'codegen'), reanimatedCodegen);

if (fs.existsSync(reanimatedNativeViewCmake)) {
  let content = fs.readFileSync(reanimatedNativeViewCmake, 'utf8');
  if (content.includes('set(CODEGEN_JNI_DIR ${ANDROID_DIR}/build/generated/source/codegen/jni)')) {
    content = content.replace(
      'set(CODEGEN_JNI_DIR ${ANDROID_DIR}/build/generated/source/codegen/jni)',
      'set(CODEGEN_JNI_DIR ${CMAKE_CURRENT_SOURCE_DIR}/codegen)'
    );
    fs.writeFileSync(reanimatedNativeViewCmake, content, 'utf8');
    console.log('[patch-cmake] Patched reanimated NativeView CMakeLists.txt.');
  }
}

// 2. react-native-gesture-handler
const rnghDir = path.join(__dirname, '..', 'node_modules', 'react-native-gesture-handler');
const rnghAndroidDir = path.join(rnghDir, 'android');
const rnghCmake = path.join(rnghAndroidDir, 'CMakeLists.txt');
const rnghCodegen = path.join(rnghAndroidDir, 'build', 'generated', 'source', 'codegen', 'jni');

makeJunction(path.join(rnghAndroidDir, 'shared'), path.join(rnghDir, 'shared'));
makeJunction(path.join(rnghAndroidDir, 'codegen'), rnghCodegen);

if (fs.existsSync(rnghCmake)) {
  let content = fs.readFileSync(rnghCmake, 'utf8');
  content = content.replace(/\.\.\/shared\/shadowNodes/g, './shared/shadowNodes');
  content = content.replace(/\.\/build\/generated\/source\/codegen\/jni/g, './codegen');
  fs.writeFileSync(rnghCmake, content, 'utf8');
  console.log('[patch-cmake] Patched gesture-handler CMakeLists.txt.');
}

// 3. react-native-safe-area-context
const rnsacDir = path.join(__dirname, '..', 'node_modules', 'react-native-safe-area-context');
const rnsacJniDir = path.join(rnsacDir, 'android', 'src', 'main', 'jni');
const rnsacCmake = path.join(rnsacJniDir, 'CMakeLists.txt');
const rnsacCodegen = path.join(rnsacDir, 'android', 'build', 'generated', 'source', 'codegen', 'jni');
const rnsacCommon = path.join(rnsacDir, 'common', 'cpp');

makeJunction(path.join(rnsacJniDir, 'codegen'), rnsacCodegen);
makeJunction(path.join(rnsacJniDir, 'common'), rnsacCommon);

if (fs.existsSync(rnsacCmake)) {
  let content = fs.readFileSync(rnsacCmake, 'utf8');
  if (content.includes('set(LIB_COMMON_DIR ${LIB_ANDROID_DIR}/../common/cpp)')) {
    content = content.replace(
      'set(LIB_COMMON_DIR ${LIB_ANDROID_DIR}/../common/cpp)',
      'set(LIB_COMMON_DIR ${CMAKE_CURRENT_SOURCE_DIR}/common)'
    );
    content = content.replace(
      'set(LIB_ANDROID_GENERATED_JNI_DIR ${LIB_ANDROID_DIR}/build/generated/source/codegen/jni)',
      'set(LIB_ANDROID_GENERATED_JNI_DIR ${CMAKE_CURRENT_SOURCE_DIR}/codegen)'
    );
    fs.writeFileSync(rnsacCmake, content, 'utf8');
    console.log('[patch-cmake] Patched safe-area-context CMakeLists.txt.');
  }
}

// 4. react-native-screens
const rnscreensDir = path.join(__dirname, '..', 'node_modules', 'react-native-screens');
const rnscreensJniDir = path.join(rnscreensDir, 'android', 'src', 'main', 'jni');
const rnscreensCmake = path.join(rnscreensJniDir, 'CMakeLists.txt');
const rnscreensCodegen = path.join(rnscreensDir, 'android', 'build', 'generated', 'source', 'codegen', 'jni');
const rnscreensCommon = path.join(rnscreensDir, 'common', 'cpp');

makeJunction(path.join(rnscreensJniDir, 'codegen'), rnscreensCodegen);
makeJunction(path.join(rnscreensJniDir, 'common'), rnscreensCommon);

if (fs.existsSync(rnscreensCmake)) {
  let content = fs.readFileSync(rnscreensCmake, 'utf8');
  if (content.includes('set(LIB_COMMON_DIR ${LIB_ANDROID_DIR}/../common/cpp)')) {
    content = content.replace(
      'set(LIB_COMMON_DIR ${LIB_ANDROID_DIR}/../common/cpp)',
      'set(LIB_COMMON_DIR ${CMAKE_CURRENT_SOURCE_DIR}/common)'
    );
    content = content.replace(
      'set(LIB_ANDROID_GENERATED_JNI_DIR ${LIB_ANDROID_DIR}/build/generated/source/codegen/jni)',
      'set(LIB_ANDROID_GENERATED_JNI_DIR ${CMAKE_CURRENT_SOURCE_DIR}/codegen)'
    );
    fs.writeFileSync(rnscreensCmake, content, 'utf8');
    console.log('[patch-cmake] Patched screens CMakeLists.txt.');
  }
}
