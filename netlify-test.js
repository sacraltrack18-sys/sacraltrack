// Этот файл используется для проверки интеграции Next.js с Netlify
// Если вы видите это сообщение в логах Netlify, значит файл был успешно загружен

console.log('Netlify test script loaded successfully');
console.log('Next.js version:', require('next/package.json').version);
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV);

// Проверим, загружаются ли основные файлы
try {
  const fs = require('fs');
  const path = require('path');
  console.log('Checking important files:');
  
  // Актуальные пути файлов для Next.js 15
  const files = [
    '.next/server/pages/index.html',
    '.next/server/app/page.js',
    '.next/server/pages-manifest.json',
    '.next/build-manifest.json',
    '.next/trace'
  ];
  
  // Проверим также содержимое важных директорий
  console.log('Checking key directories:');
  ['.next/server', '.next/static', '.next/standalone'].forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 ${dir} exists, contents:`);
      try {
        const items = fs.readdirSync(dir);
        items.forEach(item => console.log(`   - ${item}`));
      } catch (e) {
        console.log(`   Error reading directory: ${e.message}`);
      }
    } else {
      console.log(`❌ ${dir} does not exist`);
    }
  });
  
  // Проверим наличие указанных файлов
  files.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} does not exist`);
    }
  });
  
  // Добавим проверку важного файла manifest для Next.js на Netlify
  if (fs.existsSync('.next/required-server-files.json')) {
    console.log('✅ .next/required-server-files.json exists');
  } else {
    console.log('❌ .next/required-server-files.json does not exist - CRITICAL for Netlify deployment');
  }
  
} catch (error) {
  console.error('Error checking files:', error);
}

// Экспортируем функцию для использования в Netlify Functions
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Netlify test function is working!',
      nextVersion: require('next/package.json').version,
      nodeVersion: process.version
    })
  };
}; 