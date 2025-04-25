import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Получаем текущие заголовки ответа
  const response = NextResponse.next();
  
  // Добавляем необходимые заголовки для SharedArrayBuffer
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  
  return response;
}

// Применяем middleware ко всем маршрутам
export const config = {
  matcher: '/((?!api|_next/static|favicon.ico).*)',
}; 