/**
 * Набор функций для взаимодействия с API лайков и комментариев вайбов
 */

// Функция для постановки/снятия лайка вайбу
export async function toggleVibeVote(vibeId: string, userId: string) {
  try {
    const response = await fetch('/api/vibes/like', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        vibe_id: vibeId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error updating vibe like');
    }

    return await response.json();
  } catch (error) {
    console.error('Error toggling vibe vote:', error);
    throw error;
  }
}

// Функция для получения статуса лайка
export async function getVibeLikeStatus(vibeId: string, userId: string) {
  try {
    const response = await fetch(`/api/vibes/like?vibe_id=${vibeId}&user_id=${userId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error getting like status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting vibe like status:', error);
    throw error;
  }
}

// Функция для добавления комментария к вайбу
export async function addVibeComment(
  commentData: { vibe_id: string, user_id: string, text: string }
) {
  try {
    // Добавляем проверку и преобразование текста комментария
    const safeCommentData = {
      ...commentData,
      text: String(commentData.text || '').trim() // Конвертируем в строку и удаляем пробелы
    };
    
    // Проверяем, что текст не пустой после обработки
    if (!safeCommentData.text) {
      return { 
        data: null, 
        error: { message: 'Comment text cannot be empty' } 
      };
    }

    // Проверяем, что user_id и vibe_id - валидные строки
    if (!safeCommentData.user_id || typeof safeCommentData.user_id !== 'string') {
      return {
        data: null,
        error: { message: 'Invalid user ID' }
      };
    }

    if (!safeCommentData.vibe_id || typeof safeCommentData.vibe_id !== 'string') {
      return {
        data: null,
        error: { message: 'Invalid vibe ID' }
      };
    }

    const response = await fetch('/api/vibes/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(safeCommentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { data: null, error: { message: errorData.error || 'Error adding comment' } };
    }

    try {
      const responseData = await response.json();
      
      // Проверяем формат ответа
      if (!responseData || !responseData.comment) {
        console.error('Invalid server response format:', responseData);
        return { 
          data: { 
            id: `manual-${Date.now()}`,
            user_id: safeCommentData.user_id,
            vibe_id: safeCommentData.vibe_id, 
            text: safeCommentData.text,
            created_at: new Date().toISOString()
          }, 
          error: null 
        };
      }
      
      return { data: responseData.comment, error: null };
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      // Возвращаем созданный вручную объект комментария, чтобы UI мог продолжить работу
      return { 
        data: { 
          id: `manual-${Date.now()}`,
          user_id: safeCommentData.user_id,
          vibe_id: safeCommentData.vibe_id, 
          text: safeCommentData.text,
          created_at: new Date().toISOString()
        }, 
        error: null 
      };
    }
  } catch (error: any) {
    console.error('Error adding vibe comment:', error);
    return { data: null, error: { message: error.message || 'Error adding comment' } };
  }
}

// Функция для получения комментариев вайба
export async function getVibeComments(vibeId: string, limit = 20, offset = 0) {
  try {
    const response = await fetch(`/api/vibes/comment?vibe_id=${vibeId}&limit=${limit}&offset=${offset}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error getting comments');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting vibe comments:', error);
    throw error;
  }
}

// Функция для удаления комментария
export async function deleteVibeComment(commentId: string, userId: string, vibeId: string) {
  try {
    const response = await fetch(`/api/vibes/comment?comment_id=${commentId}&user_id=${userId}&vibe_id=${vibeId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error deleting comment');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting vibe comment:', error);
    throw error;
  }
} 