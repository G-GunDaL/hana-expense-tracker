const fs = require('fs');
const path = require('path');

console.log('=== SCANNING REPOSITORY FOR TEXT CORRUPTION & ENCODING DEFECTS ===');

function getAllFiles(dir, exts) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(getAllFiles(fullPath, exts));
      }
    } else {
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

let files = [];
files = files.concat(getAllFiles(path.join(__dirname, '..', 'src'), ['.ts', '.tsx', '.json', '.css']));
files.push(path.join(__dirname, '..', 'index.html'));
files.push(path.join(__dirname, '..', 'package.json'));
files.push(path.join(__dirname, '..', 'vite.config.ts'));

let defectCount = 0;

files.forEach(filePath => {
  const buf = fs.readFileSync(filePath);
  const content = buf.toString('utf-8');
  const relPath = path.relative(path.join(__dirname, '..'), filePath);
  
  // 1. Check Unicode replacement character \uFFFD
  if (content.includes('\uFFFD')) {
    console.error(`[DEFECT] Unicode replacement char (U+FFFD) in: ${relPath}`);
    defectCount++;
  }
  
  // 2. Check for null bytes in text files
  if (content.includes('\0')) {
    console.error(`[DEFECT] Null byte found in: ${relPath}`);
    defectCount++;
  }

  // 3. Check for double UTF-8 decoding sequences (e.g. \xC3\x80..\xC3\xBF followed by \xC2..\xDF)
  const mojibakeRegex = /(?:Ã[\x80-\xBF]|í•œ|ê¸°|ë‚´|ìš©|ì¶œ)/g;
  const moji = content.match(mojibakeRegex);
  if (moji && moji.length > 0) {
    console.error(`[DEFECT] Mojibake pattern found in ${relPath}: ${moji.slice(0, 3).join(' ')}`);
    defectCount++;
  }

  // 4. Check for consecutive question marks replacing Korean characters (e.g., "????")
  const qmarkRegex = /\b\?{3,}\b/g;
  const qmarks = content.match(qmarkRegex);
  if (qmarks && qmarks.length > 0) {
    console.warn(`[WARNING] Multiple question marks in ${relPath}: ${qmarks.slice(0, 2).join(' ')}`);
  }
});

console.log(`=== ENCODING SCAN RESULT: ${defectCount} DEFECTS FOUND ===`);
