// Определяем дополнительные типы для Next.js
import 'next';

declare module 'next' {
  // Переопределяем PageProps чтобы оно принимало обычный объект для params
  export interface PageProps {
    params?: {
      [key: string]: string;
    };
    searchParams?: {
      [key: string]: string | string[];
    };
  }
} 