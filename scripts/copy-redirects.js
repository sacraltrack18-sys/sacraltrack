const fs = require('fs');
const path = require('path');

// Исходный файл _redirects
const sourceFile = path.join(__dirname, '..', 'public', '_redirects');
// Целевой файл в директории .next
const targetFile = path.join(__dirname, '..', '.next', '_redirects');

// Копирование файла
try {
  fs.copyFileSync(sourceFile, targetFile);
  console.log('Successfully copied _redirects to .next folder');
} catch (err) {
  console.error('Error copying _redirects file:', err);
} 