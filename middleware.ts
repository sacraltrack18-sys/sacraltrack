import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Получаем текущие заголовки ответа
  const response = NextResponse.next();
  
  // Логирование для отладки
  const url = request.nextUrl.pathname;
  console.log('Middleware triggered for URL:', url);
  
  // Добавляем необходимые заголовки для SharedArrayBuffer только для страниц загрузки и обработки аудио
  // Эти заголовки могут мешать загрузке изображений на других страницах
  if (url.startsWith('/upload') || url.startsWith('/api/audio')) {
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    
    console.log('Applied COOP and COEP headers for:', url);
    console.log('Headers set:', JSON.stringify({
      'Cross-Origin-Opener-Policy': response.headers.get('Cross-Origin-Opener-Policy'),
      'Cross-Origin-Embedder-Policy': response.headers.get('Cross-Origin-Embedder-Policy')
    }));
  } else {
    // Для остальных маршрутов добавляем только базовые CORS заголовки
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization');
    
    console.log('Applied standard CORS headers for:', url);
  }
  
  return response;
}

// Применяем middleware ко всем маршрутам
export const config = {
  matcher: [
    '/upload', 
    '/upload/:path*', 
    '/api/audio/:path*',
    // Добавляем основные страницы просмотра контента, но без строгих заголовков
    '/', 
    '/posts/:path*',
    '/profile/:path*',
    '/explore'
  ],
}; 