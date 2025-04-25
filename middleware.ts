import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Получаем текущие заголовки ответа
  const response = NextResponse.next();
  
  // Проверяем, является ли текущий URL страницей загрузки
  const url = request.nextUrl.pathname;
  
  // Применяем строгие заголовки безопасности только для страницы загрузки и ее API
  if (url.startsWith('/upload') || url.startsWith('/api/audio/process')) {
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

// Применяем middleware ко всем маршрутам, кроме статических ресурсов и API
export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}; 