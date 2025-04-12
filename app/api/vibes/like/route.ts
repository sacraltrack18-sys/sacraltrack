import { NextRequest, NextResponse } from "next/server";
import { database, ID, Query } from "@/libs/AppWriteClient";
import { APPWRITE_CONFIG } from "@/libs/AppWriteClient";

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

  } catch (error: any) {
    console.error("Error managing like:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process like" },
      { status: 500 }
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
    return NextResponse.json(
      { error: error.message || "Failed to get likes information" },
      { status: 500 }
    );
  }
} 