import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Получаем текущие заголовки ответа
  const response = NextResponse.next();
  
  // Добавляем необходимые заголовки для SharedArrayBuffer
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  
  console.log('Applied COOP and COEP headers for:', request.nextUrl.pathname);
  
  return response;
}

// Применяем middleware ТОЛЬКО к страницам загрузки и API аудио
export const config = {
  matcher: [
    '/upload', 
    '/upload/:path*', 
    '/api/audio/process',
    '/api/audio/process/:path*'
  ],
}; 