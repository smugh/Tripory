const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'node_modules', 'expo-sqlite', 'build', 'ExpoSQLite.js');

if (fs.existsSync(targetPath)) {
  const content = fs.readFileSync(targetPath, 'utf8');
  if (!content.includes('requireOptionalNativeModule')) {
    const patchedContent = `import { requireOptionalNativeModule } from 'expo';

let _cachedModule = null;
function getExpoSQLite() {
  if (!_cachedModule) {
    try {
      _cachedModule = requireOptionalNativeModule('ExpoSQLite') || (globalThis.expo?.modules?.ExpoSQLite) || null;
    } catch {
      _cachedModule = null;
    }
  }
  return _cachedModule;
}

const proxy = new Proxy({}, {
  get(target, prop) {
    const mod = getExpoSQLite();
    if (mod && prop in mod) {
      const val = mod[prop];
      if (typeof val === 'function') {
        return val.bind(mod);
      }
      return val;
    }
    if (mod) {
      return mod[prop];
    }
    return target[prop];
  },
  apply(target, thisArg, argArray) {
    const mod = getExpoSQLite();
    if (typeof mod === 'function') {
      return Reflect.apply(mod, thisArg, argArray);
    }
    return undefined;
  },
  has(target, prop) {
    const mod = getExpoSQLite();
    return mod ? prop in mod : prop in target;
  }
});

export default proxy;
`;
    fs.writeFileSync(targetPath, patchedContent, 'utf8');
    console.log('[patch-expo-sqlite] Successfully patched ExpoSQLite.js for resilient loading.');
  } else {
    console.log('[patch-expo-sqlite] ExpoSQLite.js is already patched.');
  }
} else {
  console.log('[patch-expo-sqlite] ExpoSQLite.js not found, skipping patch.');
}
