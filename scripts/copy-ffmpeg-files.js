const fs = require('fs');
const path = require('path');

// Source path for FFmpeg files
const sourcePath = path.resolve('./node_modules/@ffmpeg/core/dist/umd');

// Target paths - copy to both standalone and static locations for Netlify compatibility
const targetPaths = [
  path.resolve('./.next/standalone/chunks'),
  path.resolve('./.next/static/chunks'),
  path.resolve('./.next/standalone/.next/static/chunks')
];

// Files to copy
const filesToCopy = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

// Ensure all target directories exist and copy files
targetPaths.forEach(targetPath => {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetPath)) {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log(`Created directory: ${targetPath}`);
    } catch (err) {
      console.error(`Error creating directory ${targetPath}:`, err);
    }
  }

  // Copy each file
  filesToCopy.forEach(file => {
    const source = path.join(sourcePath, file);
    const target = path.join(targetPath, file);
    
    try {
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
        console.log(`Copied ${file} to ${target}`);
      } else {
        console.warn(`File not found: ${source}`);
      }
    } catch (err) {
      console.error(`Error copying ${file} to ${target}:`, err);
    }
  });
});

// Also copy public directory to standalone for Netlify
const publicSourcePath = path.resolve('./public');
const publicTargetPath = path.resolve('./.next/standalone/public');

if (fs.existsSync(publicSourcePath)) {
  try {
    if (!fs.existsSync(publicTargetPath)) {
      fs.mkdirSync(publicTargetPath, { recursive: true });
    }
    
    // Copy all files from public to standalone/public
    const copyPublicFiles = (srcDir, destDir) => {
      const entries = fs.readdirSync(srcDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        
        if (entry.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyPublicFiles(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
          console.log(`Copied public file: ${entry.name}`);
        }
      }
    };
    
    copyPublicFiles(publicSourcePath, publicTargetPath);
    console.log('Public directory copied to standalone');
  } catch (err) {
    console.error('Error copying public directory:', err);
  }
}

console.log('FFmpeg files copy completed'); 