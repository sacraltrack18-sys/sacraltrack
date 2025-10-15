import { useState, useEffect } from 'react';
import { Models } from 'appwrite';
import { database, ID, Query } from '@/libs/AppWriteClient';
import { useUser } from '@/app/context/user';
import { toast } from 'react-hot-toast';

interface UserRating {
  $id: string;
  userId: string;
  raterId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  raterProfile?: {
    name: string;
    image: string;
  };
}

interface UserStats {
  $id: string;
  userId: string;
  totalLikes: number;
  totalFollowers: number;
  totalFollowing: number;
  averageRating: number;
  totalRatings: number;
  lastUpdated: string;
}

interface UserProfile {
  $id: string;
  user_id: string;
  name: string;
  image: string;
  bio?: string;
  stats?: UserStats;
}

export const useUserRating = () => {
  const user = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Получение рейтинга пользователя
  const getUserRating = async (userId: string) => {
    try {
      const ratings = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
        [Query.equal('userId', userId)]
      );

      if (ratings.documents.length === 0) {
        return {
          averageRating: 0,
          totalRatings: 0,
          ratings: []
        };
      }

      const totalRating = ratings.documents.reduce((sum, rating) => sum + rating.rating, 0);
      const averageRating = totalRating / ratings.documents.length;

      return {
        averageRating,
        totalRatings: ratings.documents.length,
        ratings: ratings.documents
      };
    } catch (error) {
      console.error('Error getting user rating:', error);
      throw error;
    }
  };

  // Добавление рейтинга
  const addRating = async (userId: string, rating: number, comment?: string) => {
    if (!user?.id) {
      toast.error('You must be logged in to rate users');
      return;
    }

    try {
      // Проверяем, не оценивал ли уже пользователь
      const existingRating = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
        [
          Query.equal('userId', userId),
          Query.equal('raterId', user.id)
        ]
      );

      if (existingRating.documents.length > 0) {
        // Обновляем существующий рейтинг
        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
          existingRating.documents[0].$id,
          {
            rating,
            comment,
            updatedAt: new Date().toISOString()
          }
        );
      } else {
        // Создаем новый рейтинг
        await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
          ID.unique(),
          {
            userId,
            raterId: user.id,
            rating,
            comment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
      }

      // Обновляем статистику пользователя
      await updateUserStats(userId);

      toast.success('Rating added successfully');
    } catch (error) {
      console.error('Error adding rating:', error);
      toast.error('Failed to add rating');
    }
  };

  // Обновление статистики пользователя
  const updateUserStats = async (userId: string) => {
    try {
      // Получаем все рейтинги пользователя
      const ratings = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!,
        [Query.equal('userId', userId)]
      );

      // Получаем все лайки пользователя
      const likes = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_LIKES!,
        [Query.equal('userId', userId)]
      );

      // Получаем статистику пользователя
      const userStats = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
        [Query.equal('userId', userId)]
      );

      const totalLikes = likes.documents.length;
      const totalRatings = ratings.documents.length;
      const averageRating = totalRatings > 0
        ? ratings.documents.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings
        : 0;

      if (userStats.documents.length > 0) {
        // Обновляем существующую статистику
        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
          userStats.documents[0].$id,
          {
            totalLikes,
            totalRatings,
            averageRating,
            lastUpdated: new Date().toISOString()
          }
        );
        // Также обновляем профиль пользователя для отображения рейтинга на карточке
        const userProfiles = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
          [Query.equal('user_id', userId)]
        );
        if (userProfiles.documents.length > 0) {
          await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
            userProfiles.documents[0].$id,
            {
              average_rating: averageRating,
              total_ratings: totalRatings
            }
          );
        }
      } else {
        // Создаем новую статистику
        await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
          ID.unique(),
          {
            userId,
            totalLikes,
            totalRatings,
            averageRating,
            totalFollowers: 0,
            totalFollowing: 0,
            lastUpdated: new Date().toISOString()
          }
        );
        // Также обновляем профиль пользователя для отображения рейтинга на карточке
        const userProfiles = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
          [Query.equal('user_id', userId)]
        );
        if (userProfiles.documents.length > 0) {
          await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
            userProfiles.documents[0].$id,
            {
              average_rating: averageRating,
              total_ratings: totalRatings
            }
          );
        }
      }
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  // Получение всех пользователей с их рейтингами
  const getAllUsers = async (page: number = 1, limit: number = 10) => {
    try {
      console.log('🔄 Starting getAllUsers with page:', page, 'limit:', limit);
      setLoading(true);
      setError(null);

      // Получаем профили пользователей
      console.log('📊 Fetching profiles from Appwrite...');
      const profiles = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
        [
          Query.limit(limit),
          Query.offset((page - 1) * limit),
          Query.orderDesc('$createdAt')
        ]
      );

      console.log('✅ Found profiles:', profiles.documents.length);

      // Получаем статистику для каждого пользователя
      console.log('📈 Fetching stats for each user...');
      const usersWithStats = await Promise.all(
        profiles.documents.map(async (profile) => {
          console.log('👤 Processing profile:', profile.user_id);
          const stats = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
            [Query.equal('userId', profile.user_id)]
          );

          console.log('📊 Found stats for user:', profile.user_id, stats.documents.length > 0 ? 'yes' : 'no');

          // Убедимся, что у нас есть все необходимые поля
          return {
            $id: profile.$id || '',
            user_id: profile.user_id || '',
            name: profile.name || 'User',
            image: profile.image || '/images/placeholders/user-placeholder.png',
            bio: profile.bio || '',
            stats: stats.documents[0] || {
              totalLikes: 0,
              totalFollowers: 0,
              totalFollowing: 0,
              averageRating: 0,
              totalRatings: 0
            }
          };
        })
      );

      console.log('✅ Final users with stats:', usersWithStats.length);
      return usersWithStats;
    } catch (error) {
      console.error('❌ Error in getAllUsers:', error);
      setError('Failed to load users');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Поиск пользователей
  const searchUsers = async (query: string) => {
    try {
      setLoading(true);
      setError(null);

      const profiles = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
        [
          Query.search('name', query),
          Query.limit(10)
        ]
      );

      const usersWithStats = await Promise.all(
        profiles.documents.map(async (profile) => {
          const stats = await database.listDocuments(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!,
            [Query.equal('userId', profile.user_id)]
          );

          // Форматируем данные одинаково для всех функций
          return {
            $id: profile.$id || '',
            user_id: profile.user_id || '',
            name: profile.name || 'User',
            image: profile.image || '/images/placeholders/user-placeholder.png',
            bio: profile.bio || '',
            stats: stats.documents[0] || {
              totalLikes: 0,
              totalFollowers: 0,
              totalFollowing: 0,
              averageRating: 0,
              totalRatings: 0
            }
          };
        })
      );

      return usersWithStats;
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const checkCollections = async () => {
    try {
      console.log('🔍 Checking Appwrite collections...');
      
      // Проверяем коллекцию профилей
      const profiles = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!
      );
      console.log('✅ Profiles collection exists with', profiles.documents.length, 'documents');
      
      // Проверяем коллекцию статистики
      const stats = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_STATS!
      );
      console.log('✅ User stats collection exists with', stats.documents.length, 'documents');
      
      // Проверяем коллекцию рейтингов
      const ratings = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_USER_RATINGS!
      );
      console.log('✅ User ratings collection exists with', ratings.documents.length, 'documents');
      
      return true;
    } catch (error) {
      console.error('❌ Error checking collections:', error);
      return false;
    }
  };

  useEffect(() => {
    checkCollections();
  }, []);

  return {
    loading,
    error,
    getUserRating,
    addRating,
    getAllUsers,
    searchUsers,
    updateUserStats
  };
}; 