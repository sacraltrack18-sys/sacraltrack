import createBucketUrl from "@/app/hooks/useCreateBucketUrl";

/**
 * Utility function to get the profile image URL
 * @param imageId Image ID or path
 * @returns URL to the profile image or default placeholder
 */
export function getProfileImageUrl(imageId: string): string {
  if (!imageId || imageId.trim() === '') {
    return '/images/placeholders/user-placeholder.svg';
  }
  
  try {
    // Always use 'user' type for profile images
    return createBucketUrl(imageId, 'user');
  } catch (error) {
    console.error('Error in getProfileImageUrl:', error);
    return '/images/placeholders/user-placeholder.svg';
  }
}

// Сделаем эту функцию доступной глобально для отладки
if (typeof window !== 'undefined') {
  (window as any).getProfileImageUrl = getProfileImageUrl;
} 