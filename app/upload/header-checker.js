'use client';

// Эта функция будет запускаться на клиенте для проверки заголовков
export function checkSecurityHeaders() {
  console.log('Checking security headers on client side...');
  
  // Проверка наличия SharedArrayBuffer
  if (typeof SharedArrayBuffer !== 'undefined') {
    console.log('✅ SharedArrayBuffer is available!');
    // Clear reload attempts counter if headers are good
    if (window.sessionStorage.getItem('headerReloadAttempts')) {
      window.sessionStorage.removeItem('headerReloadAttempts');
    }
    return true;
  } else {
    console.error('❌ SharedArrayBuffer is NOT available!');
    
    // Get current reload attempts
    let attempts = parseInt(window.sessionStorage.getItem('headerReloadAttempts') || '0');
    
    // Try reloading page a maximum of 2 times to get headers applied
    if (attempts < 2) {
      attempts++;
      window.sessionStorage.setItem('headerReloadAttempts', attempts.toString());
      console.log(`Reloading page to apply headers (attempt ${attempts}/2)...`);
      
      // Small delay before reload
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      return false;
    }
  }
  
  // Попробуем получить информацию о заголовках косвенным путем
  fetch(window.location.href)
    .then(response => {
      console.log('Response headers from self-request:');
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log(headers);
    })
    .catch(err => {
      console.error('Error fetching current page:', err);
    });
    
  // Создадим тестовый SharedArrayBuffer для проверки
  try {
    const testBuffer = new SharedArrayBuffer(1024);
    console.log('✅ Successfully created a SharedArrayBuffer');
    return true;
  } catch (e) {
    console.error('❌ Failed to create SharedArrayBuffer:', e);
    return false;
  }
} 