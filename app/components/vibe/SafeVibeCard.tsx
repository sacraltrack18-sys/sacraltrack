"use client";

import React from 'react';
import VibeCard from './VibeCard';
import { VibePostWithProfile } from '@/app/stores/vibeStore';
import createBucketUrl from "@/app/hooks/useCreateBucketUrl";

// Определяем функцию getProfileImageUrl глобально для этого модуля
function getProfileImageUrl(imageId: string): string {
  if (!imageId || imageId.trim() === '') {
    return '/images/placeholders/user-placeholder.svg';
  }
  try {
    return createBucketUrl(imageId, 'user');
  } catch (error) {
    console.error('Error in getProfileImageUrl:', error);
    return '/images/placeholders/user-placeholder.svg';
  }
}

// Делаем функцию доступной глобально
if (typeof window !== 'undefined') {
  (window as any).getProfileImageUrl = getProfileImageUrl;
}

interface SafeVibeCardProps {
  vibe: VibePostWithProfile;
  onLike?: (vibeId: string) => void;
  onUnlike?: (vibeId: string) => void;
}

// Компонент-обертка для безопасного рендеринга VibeCard
const SafeVibeCard: React.FC<SafeVibeCardProps> = (props) => {
  return (
    <div className="safe-vibe-card-wrapper">
      <VibeCard {...props} />
    </div>
  );
};

export default SafeVibeCard; 