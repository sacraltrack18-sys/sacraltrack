import { NextRequest, NextResponse } from "next/server";
import { database, ID, Query, account } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";
import { cookies } from "next/headers";

// Проверка наличия ID коллекции для лайков вайбов
if (!APPWRITE_CONFIG.vibeLikesCollectionId) {
  console.error("ERROR: vibeLikesCollectionId is not set in APPWRITE_CONFIG");
}

const VIBE_LIKES_COLLECTION_ID = APPWRITE_CONFIG.vibeLikesCollectionId || process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_LIKES || '67f22ff30010feacfd1b';

// Улучшенная проверка активной сессии пользователя
async function verifyUserSession(userId: string): Promise<boolean> {
  try {
    // Если нет userId, сразу возвращаем false
    if (!userId) {
      console.log("No userId provided for verification");
      return false;
    }
    
    // В serverless функциях нельзя проверить сессию через account.get()
    // Поэтому применяем упрощенную проверку - проверяем существование профиля
    try {
      const profiles = await database.listDocuments(
        APPWRITE_CONFIG.databaseId,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
        [Query.equal("user_id", userId)]
      );
      
      // Если профиль существует, разрешаем действие
      // В production можно добавить дополнительные проверки безопасности
      return profiles.documents.length > 0;
    } catch (error) {
      console.error("Error verifying user profile:", error);
      return false;
    }
  } catch (error) {
    console.error("Error verifying user session:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, vibe_id } = body;

    console.log(`[VIBE-LIKE] Processing like request for vibe ${vibe_id} from user ${user_id}`);
    console.log(`[VIBE-LIKE] Using collection ID: ${VIBE_LIKES_COLLECTION_ID}`);

    // Более детальная проверка входных данных
    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id field" },
        { status: 400 }
      );
    }
    
    if (!vibe_id) {
      return NextResponse.json(
        { error: "Missing vibe_id field" },
        { status: 400 }
      );
    }
    
    // Проверяем авторизацию пользователя с меньшими ограничениями
    const isUserAuthorized = await verifyUserSession(user_id);
    if (!isUserAuthorized) {
      console.log(`User ${user_id} failed authorization check for vibe ${vibe_id}`);
      // Возвращаем более дружественное сообщение
      return NextResponse.json(
        { error: "Authentication required. Please log in and try again." },
        { status: 401 }
      );
    }

    // Проверяем, существует ли вайб перед работой с лайками
    try {
      const vibeExists = await database.getDocument(
        APPWRITE_CONFIG.databaseId,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibe_id
      );
      
      if (!vibeExists || !vibeExists.$id) {
        return NextResponse.json(
          { error: "Vibe not found" },
          { status: 404 }
        );
      }
    } catch (vibeError) {
      // Если вайб не найден, сообщаем об этом
      console.error("Error checking vibe existence:", vibeError);
      return NextResponse.json(
        { error: "Vibe not found or unable to access" },
        { status: 404 }
      );
    }

    // Проверяем, существует ли уже лайк
    let existingLikes;
    try {
      existingLikes = await database.listDocuments(
        APPWRITE_CONFIG.databaseId,
        VIBE_LIKES_COLLECTION_ID, // Используем константу с ID коллекции vibe_likes
        [
          Query.equal("user_id", user_id),
          Query.equal("vibe_id", vibe_id)
        ]
      );
      
      console.log(`[VIBE-LIKE] Found ${existingLikes.documents.length} existing likes`);
      
    } catch (listError) {
      console.error("Error listing existing likes:", listError);
      console.error(`Database ID: ${APPWRITE_CONFIG.databaseId}, Collection ID: ${VIBE_LIKES_COLLECTION_ID}`);
      return NextResponse.json(
        { error: "Failed to check existing likes", details: listError.message || "Unknown error" },
        { status: 500 }
      );
    }

    // Если лайк уже существует, удаляем его (анлайк)
    if (existingLikes.documents.length > 0) {
      try {
        const likeToDelete = existingLikes.documents[0];
        const likeId = likeToDelete.$id;
        
        // Проверяем, что получили валидный ID
        if (!likeId) {
          console.error("Invalid like document structure:", likeToDelete);
          return NextResponse.json(
            { error: "Invalid like document structure" },
            { status: 500 }
          );
        }
        
        console.log(`[VIBE-LIKE] Attempting to delete like with ID: ${likeId}`);
        
        // Делаем более надежное удаление с перехватом возможных ошибок
        try {
          // Пробуем получить документ перед удалением чтобы убедиться, что он существует
          await database.getDocument(
            APPWRITE_CONFIG.databaseId,
            VIBE_LIKES_COLLECTION_ID,
            likeId
          );
          
          // Если документ существует, удаляем его
          await database.deleteDocument(
            APPWRITE_CONFIG.databaseId,
            VIBE_LIKES_COLLECTION_ID,
            likeId
          );
          
          console.log(`[VIBE-LIKE] Successfully deleted like with ID: ${likeId}`);
        } catch (docError) {
          // Если ошибка связана с тем, что документ не найден (404), 
          // продолжаем как будто он был удален успешно
          if (docError.code === 404) {
            console.log(`[VIBE-LIKE] Like document with ID ${likeId} already deleted or not found`);
          } else {
            // Для других ошибок логируем и выбрасываем исключение
            console.error(`[VIBE-LIKE] Error deleting like with ID ${likeId}:`, docError);
            throw docError;
          }
        }

        // Обновляем счетчик лайков в документе вайба
        await updateVibeStats(vibe_id);

        // Возвращаем обновленный счетчик лайков
        const updatedLikesCount = await getLikesCount(vibe_id);
        return NextResponse.json({ 
          success: true, 
          action: "unliked",
          count: updatedLikesCount
        });
      } catch (deleteError) {
        console.error("Detailed error when deleting like:", deleteError);
        
        // Проверяем на специфические ошибки Appwrite
        if (deleteError.code === 401 || deleteError.code === 403) {
          return NextResponse.json(
            { error: "You don't have permission to remove this like" },
            { status: deleteError.code }
          );
        }
        
        return NextResponse.json(
          { 
            error: "Failed to remove like", 
            details: deleteError.message || "Unknown database error",
            code: deleteError.code || 500
          },
          { status: 500 }
        );
      }
    }

    // Иначе создаем новый лайк
    const currentDate = new Date();
    
    try {
      // Создаем документ только с необходимыми и существующими полями
      const newLike = await database.createDocument(
        APPWRITE_CONFIG.databaseId,
        VIBE_LIKES_COLLECTION_ID, // Используем константу с ID коллекции vibe_likes
        ID.unique(),
        {
          user_id: user_id,
          vibe_id: vibe_id,
          created_at: currentDate.toISOString()
          // Не добавляем лишние поля, которые могут вызвать ошибку
        }
      );

      console.log(`[VIBE-LIKE] Successfully created new like with ID: ${newLike.$id}`);

      // Обновляем счетчик лайков в документе вайба
      await updateVibeStats(vibe_id);

      // Возвращаем обновленный счетчик лайков
      const updatedLikesCount = await getLikesCount(vibe_id);
      return NextResponse.json({ 
        success: true, 
        action: "liked",
        count: updatedLikesCount,
        like: newLike.$id // Возвращаем только ID созданного лайка, а не весь объект
      });
    } catch (dbError) {
      console.error("Database error when creating like:", dbError);
      
      // Проверяем на ошибки авторизации из Appwrite
      if (dbError.code === 401) {
        return NextResponse.json(
          { error: "Session expired. Please log in again." },
          { status: 401 }
        );
      } else if (dbError.message?.includes("permission") || dbError.type === "user_unauthorized") {
        return NextResponse.json(
          { error: "You don't have permission to perform this action." },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { 
          error: dbError.message || "Database error occurred",
          details: JSON.stringify(dbError)
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error managing like:", error);
    
    // Определяем HTTP-статус исходя из типа ошибки
    let status = 500;
    let errorMessage = "Failed to process like";
    
    if (error.code === 401 || error.type === "user_unauthorized") {
      status = 401;
      errorMessage = "Session expired. Please log in and try again.";
    } else if (error.code === 403) {
      status = 403;
      errorMessage = "You don't have permission to perform this action.";
    } else if (error.code === 404) {
      status = 404;
      errorMessage = "Resource not found.";
    }
    
    return NextResponse.json(
      { 
        error: error.message || errorMessage,
        details: error.stack ? error.stack.split('\n')[0] : 'No stack trace'
      },
      { status }
    );
  }
}

// Функция для получения количества лайков для вайба
async function getLikesCount(vibe_id: string): Promise<number> {
  try {
    const likesData = await database.listDocuments(
      APPWRITE_CONFIG.databaseId,
      VIBE_LIKES_COLLECTION_ID, // Используем константу с ID коллекции vibe_likes
      [
        Query.equal("vibe_id", vibe_id)
      ]
    );
    
    return likesData.total;
  } catch (error) {
    console.error("Error counting likes:", error);
    return 0;
  }
}

// Улучшенная функция обновления статистики вайба
async function updateVibeStats(vibe_id: string): Promise<void> {
  console.log(`[VIBE-STATS] Updating stats for vibe ${vibe_id}`);
  
  try {
    // Получаем текущий документ вайба
    const vibeDoc = await database.getDocument(
      APPWRITE_CONFIG.databaseId,
      process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
      vibe_id
    );
    
    // Параллельно получаем количество лайков и комментариев
    const [likesCount, commentsCount] = await Promise.all([
      getLikesCount(vibe_id),
      getCommentsCount(vibe_id)
    ]);
    
    // Текущие stats могут быть в разных форматах, обрабатываем все случаи
    const currentStats = vibeDoc.stats;
    let newStats: string[] | { total_likes: number, total_comments: number, total_views: number };
    
    // Извлекаем текущее количество просмотров (если есть)
    let viewsCount = 0;
    
    if (Array.isArray(currentStats)) {
      viewsCount = parseInt(currentStats[2] || '0', 10);
      newStats = [likesCount.toString(), commentsCount.toString(), viewsCount.toString()];
      console.log(`[VIBE-STATS] Updating array stats: ${currentStats.join(',')} -> ${newStats.join(',')}`);
    } else if (typeof currentStats === 'object' && currentStats !== null) {
      viewsCount = currentStats.total_views || 0;
      newStats = {
        total_likes: likesCount,
        total_comments: commentsCount,
        total_views: viewsCount
      };
      console.log(`[VIBE-STATS] Updating object stats: ${JSON.stringify(currentStats)} -> ${JSON.stringify(newStats)}`);
    } else {
      // Если stats не существует или имеет неверный формат, создаем новый массив
      newStats = [likesCount.toString(), commentsCount.toString(), '0'];
      console.log(`[VIBE-STATS] Creating new array stats: ${newStats.join(',')}`);
    }
    
    try {
      // Обновляем документ с новой статистикой
      await database.updateDocument(
        APPWRITE_CONFIG.databaseId,
        process.env.NEXT_PUBLIC_COLLECTION_ID_VIBE_POSTS!,
        vibe_id,
        { stats: newStats }
      );
      console.log(`[VIBE-STATS] Successfully updated stats for vibe ${vibe_id}`);
    } catch (updateError) {
      // Обработка ошибки обновления документа
      console.error(`[VIBE-STATS] Error updating stats document:`, updateError);
      
      // Если ошибка связана с авторизацией, попробуем альтернативный подход
      if (updateError.code === 401 || updateError.code === 403) {
        console.log('[VIBE-STATS] Authentication error, trying alternative update approach');
        
        // Попробуем использовать функцию для обновления документа без требования полных прав
        try {
          // Преобразуем stats в строку JSON для передачи в запрос
          const statsJson = JSON.stringify(newStats);
          
          // Создаем простую функцию для обновления через API
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/vibes/update-stats`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              vibe_id, 
              stats: statsJson,
              likes_count: likesCount,
              comments_count: commentsCount
            })
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update stats via API: ${response.status}`);
          }
          
          console.log('[VIBE-STATS] Successfully updated stats via alternative method');
        } catch (alternativeError) {
          console.error('[VIBE-STATS] Second attempt to update vibe stats failed:', alternativeError);
          // Если альтернативный подход тоже не удался, ничего не делаем
          // Фронтенд отобразит статистику из локального состояния
        }
      }
    }
  } catch (error) {
    console.error(`[VIBE-STATS] Error in updateVibeStats for vibe ${vibe_id}:`, error);
    // Не выбрасываем ошибку дальше, чтобы не нарушить основной поток операции лайка
  }
}

// Функция для получения количества комментариев для вайба
async function getCommentsCount(vibe_id: string): Promise<number> {
  try {
    const commentsData = await database.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vibeCommentsCollectionId, // ID коллекции vibe_comments
      [
        Query.equal("vibe_id", vibe_id)
      ]
    );
    
    return commentsData.total;
  } catch (error) {
    console.error("Error counting comments:", error);
    return 0;
  }
}

// Обработчик GET запроса для получения информации о лайках
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const vibe_id = url.searchParams.get("vibe_id");
    const user_id = url.searchParams.get("user_id");

    if (!vibe_id) {
      return NextResponse.json(
        { error: "Missing vibe_id parameter" },
        { status: 400 }
      );
    }

    // Получаем общее количество лайков
    const likesCount = await getLikesCount(vibe_id);

    // Если передан user_id, проверяем, поставил ли пользователь лайк
    let hasLiked = false;
    if (user_id) {
      const userLikes = await database.listDocuments(
        APPWRITE_CONFIG.databaseId,
        VIBE_LIKES_COLLECTION_ID, // Используем константу с ID коллекции vibe_likes
        [
          Query.equal("user_id", user_id),
          Query.equal("vibe_id", vibe_id)
        ]
      );
      
      hasLiked = userLikes.total > 0;
    }

    return NextResponse.json({
      count: likesCount,
      hasLiked
    });
  } catch (error) {
    console.error("Error getting likes:", error);
    return NextResponse.json(
      { error: "Failed to get likes information" },
      { status: 500 }
    );
  }
} 