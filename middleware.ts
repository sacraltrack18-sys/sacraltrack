import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Получаем текущие заголовки ответа
  const response = NextResponse.next();
  
  // Проверяем, является ли текущий URL страницей загрузки
  const url = request.nextUrl.pathname;
  
  // Применяем строгие заголовки безопасности для страницы загрузки и подпутей
  if (url === '/upload' || 
      url.startsWith('/upload/') || 
      url === '/api/audio/process' || 
      url.startsWith('/api/audio/process/')) {
    // Добавляем необходимые заголовки для SharedArrayBuffer
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    console.log('Applied COOP and COEP headers for:', url);
  } else {
    // Для всех остальных маршрутов используем более мягкие настройки
    response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none');
    response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
  
  return response;
}

// Применяем middleware, исключая статические ресурсы
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth routes
     * 2. /_next (Next.js internals)
     * 3. /fonts, /icons (inside public directory)
     * 4. /favicon.ico, /sitemap.xml (static files)
     * 5. all files in the public directory
     */
    '/((?!api/auth|_next/static|_next/image|fonts/|icons/|favicon.ico|sitemap.xml|robots.txt|.+\\.png|.+\\.jpg|.+\\.jpeg|.+\\.gif|.+\\.webp).*)',
  ],
}; 