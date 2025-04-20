'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#1E1F2B] text-white px-4">
      <h1 className="text-5xl md:text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl md:text-3xl font-semibold mb-6">Страница не найдена</h2>
      <p className="text-base md:text-lg text-center max-w-md mb-8 text-gray-300">
        К сожалению, страница, которую вы ищете, не существует или была перемещена.
      </p>
      <Link 
        href="/" 
        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 transition-colors rounded-lg font-medium text-white"
      >
        Вернуться на главную
      </Link>
    </div>
  );
} 