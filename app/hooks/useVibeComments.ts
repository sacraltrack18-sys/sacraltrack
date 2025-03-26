import { useState } from 'react';
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

  const addComment = async (text: string) => {
    if (!vibeId || !user?.id) {
      setError('You must be logged in to comment');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create the comment
      const response = await database.createDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
        ID.unique(),
        {
          user_id: user.id,
          vibe_id: vibeId,
          text,
          created_at: new Date().toISOString()
        }
      );

      // Update comment count in vibe stats
      try {
        const vibeDoc = await database.getDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
          vibeId
        );

        console.log('Current vibe stats for comments:', vibeDoc.stats, 'Type:', typeof vibeDoc.stats);
        
        // Проверяем структуру stats и преобразуем соответственно
        let updatedStats;
        
        if (Array.isArray(vibeDoc.stats)) {
          // Если stats это массив - работаем как с массивом
          const stats = [...vibeDoc.stats];
          
          // Убедимся, что у нас есть все три элемента
          while (stats.length < 3) {
            stats.push('0');
          }
          
          // Увеличиваем счетчик комментариев (второй элемент массива)
          const currentComments = parseInt(stats[1], 10) || 0;
          stats[1] = (currentComments + 1).toString();
          updatedStats = stats;
          
          console.log('Updating array stats for comments to:', stats);
        } else if (typeof vibeDoc.stats === 'object' && vibeDoc.stats !== null) {
          // Если stats это объект - преобразуем в массив
          const totalLikes = typeof vibeDoc.stats.total_likes === 'number' ? vibeDoc.stats.total_likes : 0;
          const totalComments = (typeof vibeDoc.stats.total_comments === 'number' ? vibeDoc.stats.total_comments : 0) + 1;
          const totalViews = typeof vibeDoc.stats.total_views === 'number' ? vibeDoc.stats.total_views : 0;
          
          updatedStats = [totalLikes.toString(), totalComments.toString(), totalViews.toString()];
          console.log('Converting object stats to array for comments:', updatedStats);
        } else {
          // Если stats отсутствует или имеет неизвестный формат - создаем новый массив
          updatedStats = ['0', '1', '0'];
          console.log('Creating new stats array for comments:', updatedStats);
        }

        // Обновляем документ с новыми stats
        await database.updateDocument(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
          vibeId,
          {
            stats: {
              total_likes: parseInt(updatedStats[0]) || 0,
              total_comments: parseInt(updatedStats[1]) || 0,
              total_views: parseInt(updatedStats[2]) || 0
            }
          }
        );
        
        console.log('Vibe stats updated successfully for comments');
      } catch (statsError) {
        console.error('Error updating vibe stats:', statsError);
      }

      // Fetch the user profile
      let profile;
      try {
        const profileResponse = await database.listDocuments(
          process.env.NEXT_PUBLIC_DATABASE_ID!,
          process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
          [Query.equal('user_id', user.id)]
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

      // Add the new comment to the state
      const newComment: VibeComment = {
        id: response.$id,
        user_id: user.id,
        vibe_id: vibeId,
        text,
        created_at: new Date().toISOString(),
        profile
      };

      setComments(prevComments => [newComment, ...prevComments]);
      
      return newComment;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user?.id) {
      setError('You must be logged in to delete a comment');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Find the comment to check user ownership
      const comment = comments.find(c => c.id === commentId);
      if (!comment) {
        setError('Comment not found');
        return;
      }

      // Only allow the comment author to delete
      if (comment.user_id !== user.id) {
        setError('You can only delete your own comments');
        return;
      }

      // Delete the comment
      await database.deleteDocument(
        process.env.NEXT_PUBLIC_DATABASE_ID!,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_COMMENTS!,
        commentId
      );

      // Update comment count in vibe stats
      if (vibeId) {
        try {
          const vibeDoc = await database.getDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
            vibeId
          );

          console.log('Current vibe stats for deleting comment:', vibeDoc.stats, 'Type:', typeof vibeDoc.stats);
          
          // Проверяем структуру stats и преобразуем соответственно
          let updatedStats;
          
          if (Array.isArray(vibeDoc.stats)) {
            // Если stats это массив - работаем как с массивом
            const stats = [...vibeDoc.stats];
            
            // Убедимся, что у нас есть все три элемента
            while (stats.length < 3) {
              stats.push('0');
            }
            
            // Уменьшаем счетчик комментариев (второй элемент массива)
            const currentComments = parseInt(stats[1], 10) || 0;
            stats[1] = Math.max(0, currentComments - 1).toString();
            updatedStats = stats;
            
            console.log('Updating array stats for deleting comment to:', stats);
          } else if (typeof vibeDoc.stats === 'object' && vibeDoc.stats !== null) {
            // Если stats это объект - преобразуем в массив
            const totalLikes = typeof vibeDoc.stats.total_likes === 'number' ? vibeDoc.stats.total_likes : 0;
            const totalComments = Math.max(0, (typeof vibeDoc.stats.total_comments === 'number' ? vibeDoc.stats.total_comments : 0) - 1);
            const totalViews = typeof vibeDoc.stats.total_views === 'number' ? vibeDoc.stats.total_views : 0;
            
            updatedStats = [totalLikes.toString(), totalComments.toString(), totalViews.toString()];
            console.log('Converting object stats to array for deleting comment:', updatedStats);
          } else {
            // Если stats отсутствует или имеет неизвестный формат - создаем новый массив
            updatedStats = ['0', '0', '0'];
            console.log('Creating new stats array for deleting comment:', updatedStats);
          }

          // Обновляем документ с новыми stats
          await database.updateDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
            vibeId,
            {
              stats: {
                total_likes: parseInt(updatedStats[0]) || 0,
                total_comments: parseInt(updatedStats[1]) || 0,
                total_views: parseInt(updatedStats[2]) || 0
              }
            }
          );
          
          console.log('Vibe stats updated successfully for deleting comment');
        } catch (statsError) {
          console.error('Error updating vibe stats:', statsError);
        }
      }

      // Remove the comment from the state
      setComments(prevComments => prevComments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
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
    deleteComment
  };
}; 