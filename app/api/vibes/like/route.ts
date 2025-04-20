import { NextRequest, NextResponse } from "next/server";
import { database, ID, Query } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";
import { cookies } from "next/headers";

// Проверка активной сессии пользователя
async function verifyUserSession(userId: string): Promise<boolean> {
  try {
    // Получить cookies сессии
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('appwrite-session');
    
    // Если нет cookie сессии, значит пользователь не авторизован
    if (!sessionCookie) {
      return false;
    }
    
    // Проверка существования пользователя с указанным ID
    // Это простая проверка для подтверждения валидности ID пользователя
    try {
      const profiles = await database.listDocuments(
        APPWRITE_CONFIG.databaseId,
        process.env.NEXT_PUBLIC_COLLECTION_ID_PROFILE!,
        [Query.equal("user_id", userId)]
      );
      
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

    if (!user_id || !vibe_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Проверяем авторизацию пользователя
    const isUserAuthorized = await verifyUserSession(user_id);
    if (!isUserAuthorized) {
      return NextResponse.json(
        { error: "User is not authorized to perform this action" },
        { status: 401 }
      );
    }

    // Проверяем, существует ли уже лайк
    const existingLikes = await database.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vibeLikesCollectionId, // ID коллекции vibe_likes
      [
        Query.equal("user_id", user_id),
        Query.equal("vibe_id", vibe_id)
      ]
    );

    // Если лайк уже существует, удаляем его (анлайк)
    if (existingLikes.documents.length > 0) {
      await database.deleteDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.vibeLikesCollectionId, // ID коллекции vibe_likes
        existingLikes.documents[0].$id
      );

      // Возвращаем обновленный счетчик лайков
      const updatedLikesCount = await getLikesCount(vibe_id);
      return NextResponse.json({ 
        success: true, 
        action: "unliked",
        count: updatedLikesCount
      });
    }

    // Иначе создаем новый лайк
    const currentDate = new Date();
    
    try {
      // Создаем документ только с необходимыми и существующими полями
      const newLike = await database.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.vibeLikesCollectionId, // ID коллекции vibe_likes
        ID.unique(),
        {
          user_id: user_id,
          vibe_id: vibe_id,
          created_at: currentDate.toISOString()
          // Не добавляем лишние поля, которые могут вызвать ошибку
        }
      );

      // Возвращаем обновленный счетчик лайков
      const updatedLikesCount = await getLikesCount(vibe_id);
      return NextResponse.json({ 
        success: true, 
        action: "liked",
        count: updatedLikesCount,
        like: newLike.$id // Возвращаем только ID созданного лайка, а не весь объект
      });
    } catch (dbError: any) {
      console.error("Database error when creating like:", dbError);
      
      // Проверяем на ошибки авторизации из Appwrite
      if (dbError.code === 401) {
        return NextResponse.json(
          { error: "Unauthorized. Please log in again." },
          { status: 401 }
        );
      } else if (dbError.message?.includes("permission") || dbError.type === "user_unauthorized") {
        return NextResponse.json(
          { error: "You don't have permission to perform this action." },
          { status: 403 }
        );
      }
      
      throw dbError; // Re-throw для обработки в блоке catch
    }

  } catch (error: any) {
    console.error("Error managing like:", error);
    
    // Определяем HTTP-статус исходя из типа ошибки
    let status = 500;
    let errorMessage = "Failed to process like";
    
    if (error.code === 401 || error.type === "user_unauthorized") {
      status = 401;
      errorMessage = "Unauthorized. Please log in again.";
    } else if (error.code === 403) {
      status = 403;
      errorMessage = "You don't have permission to perform this action.";
    } else if (error.code === 404) {
      status = 404;
      errorMessage = "Resource not found.";
    }
    
    return NextResponse.json(
      { error: error.message || errorMessage },
      { status }
    );
  }
}

// Функция для получения количества лайков для вайба
async function getLikesCount(vibe_id: string): Promise<number> {
  try {
    const likesData = await database.listDocuments(
      APPWRITE_CONFIG.databaseId,
      APPWRITE_CONFIG.vibeLikesCollectionId, // ID коллекции vibe_likes
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
        APPWRITE_CONFIG.vibeLikesCollectionId, // ID коллекции vibe_likes
        [
          Query.equal("user_id", user_id),
          Query.equal("vibe_id", vibe_id)
        ]
      );
      
      hasLiked = userLikes.documents.length > 0;
    }

    return NextResponse.json({
      count: likesCount,
      hasLiked
    });

  } catch (error: any) {
    console.error("Error getting likes info:", error);
    
    // Определяем HTTP-статус исходя из типа ошибки
    let status = 500;
    if (error.code === 401) {
      status = 401;
    } else if (error.code === 403) {
      status = 403;
    } else if (error.code === 404) {
      status = 404;
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to get likes information" },
      { status }
    );
  }
} 