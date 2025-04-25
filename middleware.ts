import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Получаем текущие заголовки ответа
  const response = NextResponse.next();
  
  // Логирование для отладки
  const url = request.nextUrl.pathname;
  console.log('Middleware triggered for URL:', url);
  
  // Добавляем необходимые заголовки для SharedArrayBuffer
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  
  // Логирование для подтверждения установки заголовков
  console.log('Applied COOP and COEP headers for:', url);
  console.log('Headers set:', JSON.stringify({
    'Cross-Origin-Opener-Policy': response.headers.get('Cross-Origin-Opener-Policy'),
    'Cross-Origin-Embedder-Policy': response.headers.get('Cross-Origin-Embedder-Policy')
  }));
  
  return response;
}

// Применяем middleware ко всем возможным вариантам пути upload
export const config = {
  matcher: [
    '/upload', 
    '/upload/:path*', 
    '/api/audio/:path*'
  ],
}; 