import { database, ID, Query } from "@/libs/AppWriteClient"
import { SocialLinks } from "@/app/types"

interface UpdateProfileData {
  id: string;
  user_id?: string;
  name: string;
  bio?: string;
  genre?: string;
  location?: string;
  website?: string;
  role?: string;
  social_links?: SocialLinks | string;
  display_name?: string;
  banner_image?: string;
  is_public?: string;
  account_type?: string;
  featured_track_id?: string;
  preferred_languages?: string;
  settings?: string[];
}

const useUpdateProfile = async (data: UpdateProfileData) => {
  try {
    const { id, user_id, ...updateData } = data;
    
    // Обработка social_links для сохранения в БД
    if (updateData.social_links && typeof updateData.social_links !== 'string') {
      updateData.social_links = JSON.stringify(updateData.social_links);
      
      // Проверяем длину
      if (updateData.social_links.length > 300) {
        console.warn('Social links string is too long, truncating...');
        updateData.social_links = JSON.stringify({ note: "Too many social links to save" });
      }
    }
    
    // Проверяем, существует ли документ с таким ID
    try {
      // Сначала пробуем прямо обновить документ
      await database.updateDocument(
        String(process.env.NEXT_PUBLIC_DATABASE_ID), 
        String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE), 
        id, 
        updateData
      );
      console.log('Профиль успешно обновлен');
    } catch (error: any) {
      // Если документ не найден, создаем новый
      if (error.code === 404 && user_id) {
        console.log('Профиль не найден, создаем новый');
        
        // Создаем документ профиля без поля username
        const newProfileId = ID.unique();

        // Подготавливаем social_links для нового профиля
        let socialLinksForDB = '{}';
        if (updateData.social_links) {
          if (typeof updateData.social_links === 'string') {
            socialLinksForDB = updateData.social_links;
          } else {
            socialLinksForDB = JSON.stringify(updateData.social_links);
          }
          
          // Проверяем длину
          if (socialLinksForDB.length > 300) {
            console.warn('Social links string for new profile is too long, truncating...');
            socialLinksForDB = JSON.stringify({ note: "Too many social links to save" });
          }
        }

        await database.createDocument(
          String(process.env.NEXT_PUBLIC_DATABASE_ID),
          String(process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE),
          newProfileId,
          {
            user_id: user_id,
            name: updateData.name || 'Unknown User',
            image: '/images/placeholders/user-placeholder.svg',
            bio: updateData.bio || '',
            genre: updateData.genre || '',
            location: updateData.location || '',
            website: updateData.website || '',
            role: updateData.role || '',
            social_links: socialLinksForDB,
            display_name: updateData.display_name || '',
            banner_image: updateData.banner_image || '',
            is_public: updateData.is_public || 'true',
            account_type: updateData.account_type || 'user',
            featured_track_id: updateData.featured_track_id || '',
            preferred_languages: updateData.preferred_languages || '',
            settings: updateData.settings || [],
            total_likes: '0',
            total_followers: '0',
            average_rating: '0',
            total_ratings: '0',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        );
        console.log('Новый профиль создан:', newProfileId);
        return newProfileId;
      } else {
        // Если другая ошибка, пробрасываем её дальше
        throw error;
      }
    }
  } catch (error) {
    console.error('Ошибка при обновлении/создании профиля:', error);
    throw error;
  }
}

export default useUpdateProfile