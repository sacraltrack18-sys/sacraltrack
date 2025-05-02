import { useState, useCallback } from 'react';
import { database, Query, ID } from '@/libs/AppWriteClient';
import { useUser } from '@/app/context/user';

interface VibeComment {
  id: string;
  user_id: string;
  vibe_id: string;
  text: string;
  created_at: string;
  profile?: {
    user_id: string;
    name: string;
    image: string;
    username?: string;
  };
}

// Популярные эмодзи для музыкальных комментариев
export const MUSIC_EMOJIS = [
  '🎵', '🎶', '🎸', '🥁', '🎤', '🎧', '🎷', '🎹', '🎺', '🎻',
  '👏', '🔥', '❤️', '💯', '✨', '🙌', '👍', '💃', '🕺', '😍'
];

// Вспомогательная функция для нормализации статистики
const normalizeVibeStats = (stats: any): { total_likes: string; total_comments: string; total_views: string } => {
  // Если stats это массив
  if (Array.isArray(stats)) {
    const statsArray = [...stats];
    while (statsArray.length < 3) statsArray.push('0');
    return {
      total_likes: statsArray[0] || '0',
      total_comments: statsArray[1] || '0',
      total_views: statsArray[2] || '0'
    };
  }
  
  // Если stats это объект
  if (typeof stats === 'object' && stats !== null && !Array.isArray(stats)) {
    return {
      total_likes: typeof stats.total_likes === 'number' ? stats.total_likes.toString() : (stats.total_likes || '0'),
      total_comments: typeof stats.total_comments === 'number' ? stats.total_comments.toString() : (stats.total_comments || '0'),
      total_views: typeof stats.total_views === 'number' ? stats.total_views.toString() : (stats.total_views || '0')
    };
  }
  
  // По умолчанию возвращаем нули в строковом виде
  return {
    total_likes: '0',
    total_comments: '0',
    total_views: '0'
  };
};

// Функция для преобразования нормализованной статистики обратно в массив
const statsToArray = (stats: { total_likes: string; total_comments: string; total_views: string }): string[] => {
  // Make sure we're returning strings, not objects that might be converted to "[object Object]"
  const likes = stats.total_likes || '0';
  const comments = stats.total_comments || '0';
  const views = stats.total_views || '0';
  
  return [likes, comments, views];
};

export const useVibeComments = (vibeId?: string) => {
  const [comments, setComments] = useState<VibeComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userContext = useUser();
  const user = userContext?.user;

  const fetchComments = async () => {
    if (!vibeId) {
      setComments([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await database.listDocuments(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
        [
          Query.equal('vibe_id', vibeId),
          Query.orderDesc('created_at')
        ]
      );

      // Fetch profiles for each comment
      const commentsWithProfiles = await Promise.all(
        response.documents.map(async (doc) => {
          let profile;
          try {
            const profileResponse = await database.listDocuments(
              process.env.NEXT_PUBLIC_DATABASE_ID!,
              process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
              [Query.equal('user_id', doc.user_id)]
            );
            
            if (profileResponse.documents.length > 0) {
              const profileDoc = profileResponse.documents[0];
              profile = {
                user_id: profileDoc.user_id,
                name: profileDoc.name,
                image: profileDoc.image,
                username: profileDoc.username
              };
            }
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
          }

          return {
            id: doc.$id,
            user_id: doc.user_id,
            vibe_id: doc.vibe_id,
            text: doc.text,
            created_at: doc.created_at,
            profile
          };
        })
      );

      setComments(commentsWithProfiles);
    } catch (err) {
      console.error('Error fetching vibe comments:', err);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  // Добавление эмодзи в текст комментария
  const addEmojiToComment = useCallback((emoji: string, commentText: string) => {
    return commentText + emoji;
  }, []);

  const addComment = async (textOrComment: string | VibeComment, replaceId?: string) => {
    if (!vibeId || !user?.id) {
      setError('You must be logged in to comment');
      throw new Error('You must be logged in to comment');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Проверяем, получили ли мы готовый объект комментария или только текст
      if (typeof textOrComment === 'string') {
        // Если получена строка, создаем новый комментарий
        const text = textOrComment;
        const commentId = ID.unique();
        const currentTime = new Date().toISOString();

        // Оптимистичное обновление UI, добавляем комментарий сразу
        const optimisticComment: VibeComment = {
          id: commentId,
          user_id: user.id,
          vibe_id: vibeId,
          text,
          created_at: currentTime,
          profile: user ? {
            user_id: user.id,
            name: user.name || 'User',
            image: user.image || '/images/placeholders/user-placeholder.svg',
            username: undefined
          } : undefined
        };

        // Добавляем комментарий в начало списка (т.к. сортировка по убыванию даты)
        setComments(prevComments => [optimisticComment, ...prevComments]);

        // Create the comment
        const response = await database.createDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
          commentId,
          {
            user_id: user.id,
            vibe_id: vibeId,
            text,
            created_at: currentTime
          }
        );

        // Обновляем счетчик комментариев
        await updateCommentStats(1);

        return optimisticComment;
      } else {
        // Если получен готовый объект комментария
        const comment = textOrComment;
        
        if (replaceId) {
          // Если есть ID для замены, обновляем существующий комментарий
          setComments(prevComments => 
            prevComments.map(c => c.id === replaceId ? comment : c)
          );
        } else {
          // Иначе добавляем новый комментарий
          setComments(prevComments => [comment, ...prevComments]);
        }
        
        return comment;
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      
      // В случае ошибки удаляем оптимистично добавленный комментарий
      if (user?.id && typeof textOrComment === 'string') {
        setComments(prevComments => 
          prevComments.filter(comment => 
            !(comment.user_id === user.id && comment.text === textOrComment && 
              new Date(comment.created_at).getTime() > Date.now() - 10000)
          )
        );
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Вспомогательная функция для обновления счетчика комментариев
  const updateCommentStats = async (change: number) => {
    if (!vibeId) return;
    
    try {
      const vibeDoc = await database.getDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibeId
      );

      const currentStats = normalizeVibeStats(vibeDoc.stats);
      const updatedStats = {
        ...currentStats,
        total_comments: Math.max(0, parseInt(currentStats.total_comments, 10) + change).toString()
      };

      // Преобразуем объект статистики в массив для обновления документа
      const statsForUpdate = statsToArray(updatedStats);
      
      // Log for debugging
      console.log('Updating vibe comment stats:', {
        vibeId,
        currentStats,
        updatedStats,
        statsForUpdate,
        statsType: typeof statsForUpdate
      });

      await database.updateDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibeId,
        { stats: statsForUpdate }
      );
    } catch (statsError) {
      console.error('Error updating vibe stats:', statsError);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user?.id) {
      setError('You must be logged in to delete a comment');
      throw new Error('You must be logged in to delete a comment');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Find the comment to check user ownership
      const comment = comments.find(c => c.id === commentId);
      if (!comment) {
        const errorMsg = 'Comment not found';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Only allow the comment author to delete
      if (comment.user_id !== user.id) {
        const errorMsg = 'You can only delete your own comments';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      // Оптимистичное обновление UI, удаляем комментарий сразу
      setComments(prevComments => prevComments.filter(c => c.id !== commentId));

      // Delete the comment
      await database.deleteDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
        commentId
      );

      // Обновляем счетчик комментариев
      if (vibeId) {
        await updateCommentStats(-1);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete comment';
      setError(errorMessage);
      
      // В случае ошибки возвращаем комментарии к исходному состоянию
      fetchComments();
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    comments,
    isLoading,
    error,
    fetchComments,
    addComment,
    deleteComment,
    addEmojiToComment,
    musicEmojis: MUSIC_EMOJIS
  };
}; 