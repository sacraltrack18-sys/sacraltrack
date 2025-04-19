const fs = require('fs');
const path = require('path');

// Paths
const sourcePath = path.resolve('./node_modules/@ffmpeg/core/dist/umd');
const targetPath = path.resolve('./.next/standalone/chunks');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetPath)) {
  fs.mkdirSync(targetPath, { recursive: true });
  console.log(`Created directory: ${targetPath}`);
}

// Files to copy
const filesToCopy = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

// Copy each file
filesToCopy.forEach(file => {
  const source = path.join(sourcePath, file);
  const target = path.join(targetPath, file);
  
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    console.log(`Copied ${file} to ${target}`);
  } else {
    console.warn(`File not found: ${source}`);
  }
});

console.log('FFmpeg files copy completed'); 