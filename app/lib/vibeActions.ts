/**
 * Набор функций для взаимодействия с API лайков и комментариев вайбов
 */

// Функция для постановки/снятия лайка вайбу
export async function toggleVibeVote(vibeId: string, userId: string) {
  // Максимальное количество повторных попыток при ошибке
  const maxRetries = 2;
  let currentRetry = 0;
  
  while (currentRetry <= maxRetries) {
    try {
      // Если это повторная попытка, добавляем задержку
      if (currentRetry > 0) {
        console.log(`Retry attempt ${currentRetry} for toggle vibe vote`);
        await new Promise(resolve => setTimeout(resolve, 500 * currentRetry));
      }
      
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

      // Проверяем HTTP-статус
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Error updating vibe like';
        
        // Если это ошибка авторизации, не повторяем попытку
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication error: ${errorMessage}`);
        }
        
        // Если это серверная ошибка, увеличиваем счетчик повторов
        if (response.status >= 500) {
          currentRetry++;
          // Если исчерпали все попытки, выбрасываем ошибку
          if (currentRetry > maxRetries) {
            throw new Error(`Server error after ${maxRetries} retries: ${errorMessage}`);
          }
          // Иначе продолжаем цикл и повторяем запрос
          continue;
        }
        
        // Для других ошибок сразу выбрасываем исключение
        throw new Error(errorMessage);
      }

      // Успешный ответ - возвращаем данные
      return await response.json();
    } catch (error) {
      // Для сетевых ошибок пробуем повторные запросы
      if (
        error instanceof Error && 
        (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('Failed to fetch'))
      ) {
        currentRetry++;
        if (currentRetry <= maxRetries) {
          console.warn(`Network error, retrying (${currentRetry}/${maxRetries}):`, error);
          continue;
        }
      }
      
      // Выбрасываем ошибку для обработки в компоненте
      console.error('Error toggling vibe vote:', error);
      throw error;
    }
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

    const data = await response.json();
    return data.hasLiked;
  } catch (error) {
    console.error('Error getting vibe like status:', error);
    return false; // По умолчанию считаем, что пользователь не лайкнул вайб
  }
}

// Функция для добавления комментария к вайбу
export async function addVibeComment(
  commentData: { vibe_id: string, user_id: string, text: string }
) {
  try {
    // Add validation for required fields
    const safeCommentData = {
      ...commentData,
      text: String(commentData.text || '').trim()
    };
    
    // Validate comment data
    if (!safeCommentData.text) {
      return { 
        data: null, 
        error: { message: 'Comment text cannot be empty' } 
      };
    }

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

    // Create a timeout promise to abort the request if it takes too long
    const timeout = new Promise<{ data: null, error: { message: string } }>((_, reject) => {
      setTimeout(() => {
        reject({ data: null, error: { message: 'Request timed out after 10 seconds' } });
      }, 10000); // 10 second timeout
    });

    // Create the actual fetch request
    const fetchPromise = (async () => {
      try {
        const controller = new AbortController();
        const signal = controller.signal;
        
        const response = await fetch('/api/vibes/comment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(safeCommentData),
          signal,
        });

        // Check for different HTTP status codes and provide more specific error messages
        if (!response.ok) {
          const statusCode = response.status;
          let errorMessage = 'Error adding comment';

          switch (statusCode) {
            case 400:
              errorMessage = 'Bad request - Invalid comment data';
              break;
            case 401:
              errorMessage = 'Unauthorized - Please log in again';
              break;
            case 403:
              errorMessage = 'Forbidden - You don\'t have permission to comment';
              break;
            case 404:
              errorMessage = 'Vibe not found';
              break;
            case 429:
              errorMessage = 'Too many requests - Please try again later';
              break;
            case 500:
              errorMessage = 'Server error - Please try again later';
              break;
            case 502:
              errorMessage = 'Bad gateway - Server is temporarily unavailable';
              break;
            case 503:
              errorMessage = 'Service unavailable - Please try again later';
              break;
            case 504:
              errorMessage = 'Gateway timeout - Please try again later';
              break;
            default:
              errorMessage = `Error adding comment (${statusCode})`;
          }

          // Try to get more detailed error information from response if possible
          try {
            const errorData = await response.json();
            return { 
              data: null, 
              error: { message: errorData.error || errorMessage } 
            };
          } catch (parseError) {
            // If parsing JSON fails, just return the generic error
            return { data: null, error: { message: errorMessage } };
          }
        }

        // Parse successful response
        try {
          const responseData = await response.json();
          
          // Validate response format
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
          // Returning created backup object to ensure UI can continue working
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
      } catch (fetchError: any) {
        // Handle fetch errors like network issues, CORS, etc.
        const errorMessage = fetchError.message || 'Network error while adding comment';
        return { data: null, error: { message: errorMessage } };
      }
    })();

    // Race between the fetch and the timeout
    return await Promise.race([fetchPromise, timeout]);
    
  } catch (error: any) {
    console.error('Error in addVibeComment:', error);
    
    // Provide a more descriptive error based on the type of error
    let errorMessage = 'Error adding comment';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request was aborted - please try again';
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Request timed out - please try again';
    } else if (error.message && error.message.includes('network')) {
      errorMessage = 'Network error - please check your connection';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { data: null, error: { message: errorMessage } };
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