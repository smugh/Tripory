const fs = require('fs');
const path = require('path');

const target1 = path.join(__dirname, '..', 'node_modules', 'expo-modules-autolinking', 'build', 'commands', 'autolinkingOptions.js');
const target2 = path.join(__dirname, '..', 'node_modules', 'expo-modules-autolinking', 'build', 'exports.js');

function patchFile(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('_path().default.dirname(dir) !== dir;')) {
      content = content.replace(
        /for\s*\(\s*let\s+dir\s*=\s*([^;]+);\s*_path\(\)\.default\.dirname\(dir\)\s*!==\s*dir;\s*dir\s*=\s*_path\(\)\.default\.dirname\(dir\)\s*\)\s*\{([\s\S]*?)if\s*\(_fs\(\)\.default\.existsSync\(file\)\)\s*\{([\s\S]*?return file;[\s\S]*?)\}/g,
        'for(let dir = $1; ; dir = _path().default.dirname(dir)) {$2if (_fs().default.existsSync(file)) {$3}\n        if (_path().default.dirname(dir) === dir) break;'
      );
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-expo-autolinking] Patched ${path.basename(filePath)}`);
    }
  }
}

patchFile(target1);
patchFile(target2);
