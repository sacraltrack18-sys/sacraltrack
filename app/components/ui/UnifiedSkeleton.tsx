"use client";

import React from 'react';

type SkeletonVariant = 'post' | 'vibe' | 'purchase' | 'like' | 'friend';

interface SimpleSkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

// Унифицированный минималистичный скелетон с размерами под разные карточки
const SimpleSkeleton: React.FC<SimpleSkeletonProps> = ({ variant = 'post', className = '' }) => {
  // Контейнерные размеры
  const containerClasses = (() => {
    if (variant === 'purchase') return 'max-w-[400px]';
    if (variant === 'like') return 'max-w-[650px]';
    // post, vibe, friend по ширине обычно до 450px
    return 'max-w-[450px]';
  })();

  // Контент для разных карточек
  if (variant === 'like') {
    // Горизонтальная карточка лайков ~120px высотой - точно как PostLikes
    return (
      <div className={`w-full ${containerClasses} mx-[10px] md:mx-auto mb-4 ${className}`}>
        <div className="w-full rounded-2xl bg-[#24183d]/70 backdrop-blur-xl border border-white/10 overflow-hidden transition-all duration-300 flex flex-row items-center gap-0 p-0" style={{ height: '120px', minHeight: '120px' }}>
          <div className="flex-shrink-0 h-[120px] w-[120px] bg-white/5" />
          <div className="flex-1 p-3">
            <div className="h-4 w-40 bg-white/5 rounded mb-2" />
            <div className="h-3 w-28 bg-white/5 rounded mb-3" />
            <div className="h-10 w-full bg-white/5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'purchase') {
    // Покупки: вертикальная карточка, изображение квадратное как у реальных карточек
    return (
      <div className={`w-full ${containerClasses} mx-[10px] md:mx-auto mb-4 ${className}`}>
        <div className="bg-[#1E2136] rounded-2xl overflow-hidden border border-white/10">
          <div className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-white/5 rounded" />
              <div className="h-3 w-24 bg-white/5 rounded" />
            </div>
          </div>
          <div className="w-full aspect-square bg-white/5" />
          <div className="px-3 py-2">
            <div className="h-10 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'friend') {
    // Друзья: изображение высотой 300px
    return (
      <div className={`w-full ${containerClasses} mx-[10px] md:mx-auto mb-4 ${className}`}>
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#24183d]/50">
          <div className="w-full h-[300px] bg-white/5" />
        </div>
      </div>
    );
  }

  // post / vibe: квадратная карточка (как PostUser/VibeCard)
  return (
    <div className={`w-full ${containerClasses} mx-[10px] sm:mx-auto mb-4 ${className}`}>
      <div className="bg-[#1A1E36]/50 rounded-xl overflow-hidden border border-white/5">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-white/5 rounded" />
              <div className="h-3 w-24 bg-white/5 rounded" />
            </div>
          </div>
        </div>
        <div className="w-full aspect-square bg-white/5" />
        <div className="p-4">
          <div className="h-10 bg-white/5 rounded-lg mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-8 w-16 bg-white/5 rounded" />
              <div className="h-8 w-16 bg-white/5 rounded" />
            </div>
            <div className="h-8 w-8 bg-white/5 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleSkeleton;
