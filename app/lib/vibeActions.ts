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
    const response = await fetch('/api/vibes/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { data: null, error: { message: errorData.error || 'Error adding comment' } };
    }

    const data = await response.json();
    return { data: data.comment, error: null };
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