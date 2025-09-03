"use client";

import { lazy, Suspense } from 'react';

// Lazy loading для GlobalLoader
const GlobalLoader = lazy(() => import('@/app/components/GlobalLoader'));

// Минимальный loading fallback
function LoaderFallback() {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  );
}

export default function LazyGlobalLoader() {
  return (
    <Suspense fallback={<LoaderFallback />}>
      <GlobalLoader />
    </Suspense>
  );
}
