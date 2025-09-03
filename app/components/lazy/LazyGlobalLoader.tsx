"use client";

import { lazy, Suspense } from 'react';

// Lazy loading для GlobalLoader
const GlobalLoader = lazy(() => import('@/app/components/GlobalLoader'));

import UniversalLoader from '../ui/UniversalLoader';

// Минимальный loading fallback
function LoaderFallback() {
  return (
    <UniversalLoader 
      size="lg" 
      variant="spinner" 
      message="Loading..." 
      fullScreen 
    />
  );
}

export default function LazyGlobalLoader() {
  return (
    <Suspense fallback={<LoaderFallback />}>
      <GlobalLoader />
    </Suspense>
  );
}
