const fs = require('fs');
const path = require('path');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Copy _redirects file
try {
  fs.copyFileSync('public/_redirects', 'dist/_redirects');
  console.log('Successfully copied _redirects to dist folder');
} catch (err) {
  console.error('Error copying _redirects file:', err);
}

// Copy the built Next.js files
try {
  const copyDir = (src, dest) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };
  
  copyDir('.next', 'dist');
  console.log('Successfully copied .next folder to dist');
} catch (err) {
  console.error('Error copying .next folder:', err);
}

console.log('Netlify deployment preparation complete!'); 